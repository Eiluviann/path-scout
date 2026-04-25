import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineCommand } from 'citty';
import { consola } from 'consola';
import { runPnpm } from '../utils/pnpm.js';

const PLUGIN_DIR = join(homedir(), '.config', 'path-scout', '.npm');

export const remove = defineCommand({
  meta: {
    name: 'remove',
    description: 'Uninstall a Path Scout plugin',
  },
  args: {
    plugin: {
      type: 'positional',
      description: 'Plugin package name to uninstall',
      required: true,
    },
  },
  async run({ args }) {
    if (!existsSync(PLUGIN_DIR)) {
      consola.error('No plugins installed yet');
      process.exit(1);
    }

    consola.start(`Removing ${args.plugin}…`);

    try {
      runPnpm(`remove ${args.plugin} --prefix ${PLUGIN_DIR}`);
      consola.success(`${args.plugin} removed successfully`);
      consola.info(`Remember to remove it from your config at ~/.config/path-scout/path-scout.config.ts`);
    } catch (_error) {
      consola.error(`Failed to remove ${args.plugin}`);
      process.exit(1);
    }
  },
});
