import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { UsageStat } from '../types/stats.types.js';

const DB_DIR = join(homedir(), '.config', 'path-scout');
const DB_PATH = join(DB_DIR, 'stats.db');

/**
 * Manages persistent usage statistics using SQLite.
 * Stats are stored at ~/.config/path-scout/stats.db.
 * Used to power OpenSearch suggestions tailored to each user.
 */
export class StatsStore {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    if (!existsSync(DB_DIR)) {
      mkdirSync(DB_DIR, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.migrate();
  }

  /**
   * Creates the stats table if it does not already exist.
   */
  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stats (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        query     TEXT    NOT NULL,
        user      TEXT,
        matched   INTEGER NOT NULL,
        route     TEXT,
        timestamp TEXT    NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_stats_user_query
        ON stats (user, query);

      CREATE INDEX IF NOT EXISTS idx_stats_timestamp
        ON stats (timestamp);
    `);
  }

  /**
   * Records a usage event.
   *
   * @param stat - The usage stat to record
   */
  record(stat: UsageStat): void {
    this.db.prepare(`
      INSERT INTO stats (query, user, matched, route, timestamp)
      VALUES (@query, @user, @matched, @route, @timestamp)
    `).run({
      query: stat.query,
      user: stat.user ?? null,
      matched: stat.matched ? 1 : 0,
      route: stat.route ?? null,
      timestamp: stat.timestamp,
    });
  }

  /**
   * Returns query suggestions for a given partial query and optional user.
   * Suggestions are ordered by frequency — most used routes first.
   * Only matched queries are included.
   *
   * @param partial - The partial query string to match against
   * @param user - Optional user to filter suggestions by
   * @param limit - Maximum number of suggestions to return
   */
  suggest(partial: string, user?: string, limit = 10): string[] {
    const rows = this.db.prepare(`
      SELECT query, COUNT(*) as frequency
      FROM stats
      WHERE matched = 1
        AND query LIKE @partial
        AND (@user IS NULL OR user = @user)
      GROUP BY query
      ORDER BY frequency DESC
      LIMIT @limit
    `).all({
      partial: `${partial}%`,
      user: user ?? null,
      limit,
    }) as { query: string; frequency: number }[];

    return rows.map(r => r.query);
  }

  /**
   * Closes the database connection.
   */
  close(): void {
    this.db.close();
  }
}
