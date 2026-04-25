import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineCommand } from 'citty';
import { consola } from 'consola';
import { runPnpm } from '../utils/pnpm.js';

const PLUGIN_DIR = join(homedir(), '.config', 'path-scout', '.npm');

export const add = defineCommand({
  meta: {
    name: 'add',
    description: 'Install a Path Scout plugin',
  },
  args: {
    plugin: {
      type: 'positional',
      description: 'Plugin package name to install',
      required: true,
    },
  },
  async run({ args }) {
    if (!existsSync(PLUGIN_DIR)) {
      mkdirSync(PLUGIN_DIR, { recursive: true });
    }

    consola.start(`Installing ${args.plugin}…`);

    try {
      runPnpm(`add ${args.plugin} --prefix ${PLUGIN_DIR}`);
      consola.success(`${args.plugin} installed successfully`);
      consola.info(`Add it to your config at ~/.config/path-scout/path-scout.config.ts`);
    } catch (_error) {
      consola.error(`Failed to install ${args.plugin}`);
      process.exit(1);
    }
  },
});
