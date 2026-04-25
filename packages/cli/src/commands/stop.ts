import { defineCommand } from 'citty';
import { consola } from 'consola';
import { launchdIsInstalled, launchdStop } from '../service/launchd.js';
import { isMac, isWindows } from '../service/platform.js';
import { systemdIsInstalled, systemdStop } from '../service/systemd.js';

export const stop = defineCommand({
  meta: {
    name: 'stop',
    description: 'Stop the Path Scout service',
  },
  async run() {
    if (isWindows()) {
      consola.warn('Service management is not yet supported on Windows.');
      consola.info('If path-scout is running in a terminal, press Ctrl+C to stop it.');
      process.exit(0);
    }

    const installed = isMac() ? launchdIsInstalled() : systemdIsInstalled();
    if (!installed) {
      consola.warn('path-scout service is not installed.');
      process.exit(0);
    }

    consola.start('Stopping path-scout…');

    try {
      if (isMac()) {
        launchdStop();
      } else {
        systemdStop();
      }
      consola.success('path-scout stopped');
    } catch (error) {
      consola.error('Failed to stop path-scout:', error);
      process.exit(1);
    }
  },
});
