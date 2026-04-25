import { defineCommand } from 'citty';
import { consola } from 'consola';
import { isMac, isWindows } from '../service/platform.js';
import { launchdRestart, launchdIsInstalled } from '../service/launchd.js';
import { systemdRestart, systemdIsInstalled } from '../service/systemd.js';

export const restart = defineCommand({
  meta: {
    name: 'restart',
    description: 'Restart the Path Scout service',
  },
  async run() {
    if (isWindows()) {
      consola.warn('Service management is not yet supported on Windows.');
      consola.info('Stop path-scout manually and run path-scout start again.');
      process.exit(0);
    }

    const installed = isMac() ? launchdIsInstalled() : systemdIsInstalled();
    if (!installed) {
      consola.warn('path-scout service is not installed.');
      process.exit(0);
    }

    consola.start('Restarting path-scout…');

    try {
      if (isMac()) {
        launchdRestart();
      } else {
        systemdRestart();
      }
      consola.success('path-scout restarted');
    } catch (error) {
      consola.error('Failed to restart path-scout:', error);
      process.exit(1);
    }
  },
});
