import { createJiti } from 'jiti';
import { watch, FSWatcher } from 'chokidar';
import { existsSync } from 'node:fs';
import type { PathScoutConfig } from './types/config.types.js';
import { CONFIG_LOCATIONS } from './types/config.types.js';
import { WildcardRegistry } from './wildcard-registry.js';
import { Trie } from './trie.js';

/**
 * Orchestrates config loading, registry building, trie compilation and file watching.
 * Notifies registered callbacks when the trie or config are updated.
 * On reload failure, keeps the previous trie active and logs the error.
 */
export class ConfigLoader {
  /** The current active trie — swapped atomically on successful reload */
  private trie: Trie = new Trie();
  /** The current active config */
  private config: PathScoutConfig | null = null;
  /** Resolved path to the config file */
  private configPath: string | null = null;
  /** File watcher instance */
  private watcher: FSWatcher | null = null;
  /** Callbacks notified when the trie is successfully updated */
  private trieUpdateCallbacks: Array<(trie: Trie) => void> = [];
  /** Callbacks notified when the config is successfully updated */
  private configUpdateCallbacks: Array<(config: PathScoutConfig) => void> = [];

  /**
   * Registers a callback to be called whenever the trie is successfully updated.
   *
   * @param callback - Function to call with the updated trie
   */
  onTrieUpdate(callback: (trie: Trie) => void): void {
    this.trieUpdateCallbacks.push(callback);
  }

  /**
   * Registers a callback to be called whenever the config is successfully updated.
   *
   * @param callback - Function to call with the updated config
   */
  onConfigUpdate(callback: (config: PathScoutConfig) => void): void {
    this.configUpdateCallbacks.push(callback);
  }

  /**
   * Resolves the config file location, performs initial load and starts the file watcher.
   * Throws if no config file is found in any of the expected locations.
   */
  async start(): Promise<void> {
    this.configPath = this.resolveConfigPath();
    await this.load();
    this.startWatcher();
  }

  /**
   * Stops the file watcher and cleans up resources.
   */
  async stop(): Promise<void> {
    await this.watcher?.close();
    this.watcher = null;
  }

  /**
   * Resolves the config file path by checking CONFIG_LOCATIONS in order.
   * Returns the first location where a config file exists.
   * Throws if no config file is found.
   */
  private resolveConfigPath(): string {
    for (const location of CONFIG_LOCATIONS) {
      if (existsSync(location)) return location;
    }

    throw new Error(
      `No config file found. Looked in:\n` +
      CONFIG_LOCATIONS.map(l => `  - ${l}`).join('\n') +
      `\nCreate a path-scout.config.ts in one of these locations.`
    );
  }

  /**
   * Loads and executes the config file, builds the registry and compiles the trie.
   * On success, notifies all registered callbacks.
   * On failure, throws — callers handle the error differently on initial load vs reload.
   */
  private async load(): Promise<void> {
    const jiti = createJiti(import.meta.url);
    const config = await jiti.import(this.configPath!) as PathScoutConfig;

    const registry = new WildcardRegistry();

    for (const plugin of config.plugins ?? []) {
      registry.registerPlugin(plugin);
    }

    registry.validate();

    const trie = new Trie();
    trie.build(config.routes, registry);

    this.trie = trie;
    this.config = config;

    this.trieUpdateCallbacks.forEach(cb => cb(this.trie));
    this.configUpdateCallbacks.forEach(cb => cb(this.config!));
  }

  /**
   * Starts watching the config file for changes.
   * On change, attempts a reload — keeps previous trie on failure.
   */
  private startWatcher(): void {
    this.watcher = watch(this.configPath!, {
      ignoreInitial: true,
    });

    this.watcher.on('change', async () => {
      try {
        await this.load();
      } catch (error) {
        console.error(
          `[path-scout] Config reload failed — keeping previous config active.\n`,
          error
        );
      }
    });
  }
}
