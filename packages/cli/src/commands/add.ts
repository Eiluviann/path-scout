import { defineCommand } from 'citty';
import { consola } from 'consola';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runPnpm } from '../utils/pnpm.js';

const PLUGIN_DIR = join(process.env.HOME!, '.config', 'path-scout', '.npm');

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
      runPnpm(`install ${args.plugin} --prefix ${PLUGIN_DIR}`);
      consola.success(`${args.plugin} installed successfully`);
      consola.info(`Add it to your config at ~/.config/path-scout/path-scout.config.ts`);
    } catch (error) {
      consola.error(`Failed to install ${args.plugin}`);
      process.exit(1);
    }
  },
});
