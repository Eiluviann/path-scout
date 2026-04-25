import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import type { PathScoutConfig, Trie } from '@path-scout/core';
import { interpolate, parseQuery } from '@path-scout/core';
import { Hono } from 'hono';
import type { StatsStore } from '../stats/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const noMatchHtml = readFileSync(join(__dirname, '../../static/no-match.html'), 'utf-8');

/**
 * Dependencies injected into the server at startup.
 */
export interface ServerDeps {
  trie: Trie;
  stats: StatsStore;
  config: PathScoutConfig;
}

/**
 * The Path Scout HTTP server.
 * Handles redirects, OpenSearch suggestions and the no-match page.
 */
export class Server {
  private trie: Trie;
  private readonly stats: StatsStore;
  private config: PathScoutConfig;
  private readonly app: Hono;

  constructor(deps: ServerDeps) {
    this.trie = deps.trie;
    this.stats = deps.stats;
    this.config = deps.config;
    this.app = new Hono();
    this.registerRoutes();
  }

  /**
   * Updates the trie reference atomically when config reloads.
   *
   * @param trie - The newly compiled trie
   */
  updateTrie(trie: Trie): void {
    this.trie = trie;
  }

  /**
   * Updates the config reference when config reloads.
   *
   * @param config - The newly loaded config
   */
  updateConfig(config: PathScoutConfig): void {
    this.config = config;
  }

  /**
   * Starts the HTTP server on the configured port.
   */
  start(): void {
    const port = this.config.port ?? 7000;

    serve({
      fetch: this.app.fetch,
      port,
    });
  }

  /**
   * Registers all HTTP routes on the Hono app.
   */
  private registerRoutes(): void {
    this.app.get('/go', async (c) => {
      const query = c.req.query('q') ?? '';
      const user = c.req.query('user');
      const port = this.config.port ?? 7000;

      if (!query) {
        return c.html(this.renderNoMatch('', port));
      }

      const segments = parseQuery(query);
      const match = this.trie.match(segments);

      if (!match) {
        this.stats.record({
          query,
          user,
          matched: false,
          timestamp: new Date().toISOString(),
        });
        return c.html(this.renderNoMatch(query, port));
      }

      const resolvedArgs = interpolate(match.args, match.getCapturedWildcards());
      const url = await match.action.resolve(resolvedArgs);

      this.stats.record({
        query,
        user,
        matched: true,
        route: segments.join('/'),
        timestamp: new Date().toISOString(),
      });

      return c.redirect(url, 302);
    });

    this.app.get('/suggest', (c) => {
      const partial = c.req.query('q') ?? '';
      const user = c.req.query('user');

      const suggestions = this.stats.suggest(partial, user);

      return c.json([partial, suggestions, []]);
    });

    this.app.get('/opensearch.xml', (c) => {
      const port = this.config.port ?? 7000;
      const xml = this.renderOpenSearchDescriptor(port);

      return c.body(xml, 200, {
        'Content-Type': 'application/opensearchdescription+xml',
      });
    });
  }

  /**
   * Renders the no-match HTML page with the query and port injected.
   *
   * @param query - The query that failed to match
   * @param port - The port the server is running on
   */
  private renderNoMatch(query: string, port: number): string {
    return noMatchHtml.replace('{{query}}', () => query).replace('{{port}}', () => String(port));
  }

  /**
   * Renders the OpenSearch descriptor XML.
   * Browsers use this to discover the suggestion endpoint.
   *
   * @param port - The port the server is running on
   */
  private renderOpenSearchDescriptor(port: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>path-scout</ShortName>
  <Description>Navigate your bookmarks with path-scout</Description>
  <Url type="text/html" template="http://localhost:${port}/go?q={searchTerms}"/>
  <Url type="application/x-suggestions+json" template="http://localhost:${port}/suggest?q={searchTerms}"/>
</OpenSearchDescription>`;
  }
}
