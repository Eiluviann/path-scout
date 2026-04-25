import type { PathScoutConfig, Trie } from '@path-scout/core';
import { ConfigLoader } from '@path-scout/core';
import { defineCommand } from 'citty';
import { consola } from 'consola';
import { Server } from '../server/index.js';
import { launchdInstall } from '../service/launchd.js';
import { isMac, isWindows } from '../service/platform.js';
import { systemdInstall } from '../service/systemd.js';
import { StatsStore } from '../stats/index.js';

export const start = defineCommand({
  meta: {
    name: 'start',
    description: 'Start the Path Scout server',
  },
  args: {
    daemon: {
      type: 'boolean',
      description: 'Install and start as a background service (launchd on macOS, systemd on Linux)',
      default: false,
    },
  },
  async run({ args }) {
    if (args.daemon) {
      if (isWindows()) {
        consola.warn('Daemon mode is not yet supported on Windows.');
        process.exit(1);
      }

      const execPath = process.argv[1];

      try {
        if (isMac()) {
          launchdInstall(execPath);
        } else {
          systemdInstall(execPath);
        }
        consola.success('path-scout installed as a service and started');
      } catch (error) {
        consola.error('Failed to install service:', error);
        process.exit(1);
      }

      return;
    }

    const stats = new StatsStore();
    const loader = new ConfigLoader();

    let server: Server | null = null;
    let latestConfig: PathScoutConfig | null = null;
    let latestTrie: Trie | null = null;

    /**
     * Starts the server once both config and trie are available.
     * On subsequent calls updates the existing server instead.
     */
    function tryStart(): void {
      if (!latestConfig || !latestTrie) return;

      if (!server) {
        server = new Server({
          trie: latestTrie,
          stats,
          config: latestConfig,
        });
        server.start();
        consola.success(`path-scout running on port ${latestConfig.port ?? 7000}`);
        return;
      }

      server.updateTrie(latestTrie);
      server.updateConfig(latestConfig);
      consola.info('Config reloaded successfully');
    }

    loader.onConfigUpdate((config) => {
      latestConfig = config;
      tryStart();
    });

    loader.onTrieUpdate((trie) => {
      latestTrie = trie;
      tryStart();
    });

    try {
      await loader.start();
    } catch (error) {
      consola.error('Failed to start path-scout:', error);
      stats.close();
      process.exit(1);
    }

    process.on('SIGINT', async () => {
      consola.info('Shutting down…');
      await loader.stop();
      stats.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await loader.stop();
      stats.close();
      process.exit(0);
    });
  },
});
