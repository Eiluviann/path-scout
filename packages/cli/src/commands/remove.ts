import { defineCommand } from 'citty';
import { consola } from 'consola';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PLUGIN_DIR = join(process.env.HOME!, '.config', 'path-scout', '.npm');

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
      execSync(`npm uninstall ${args.plugin} --prefix ${PLUGIN_DIR}`, {
        stdio: 'inherit',
      });
      consola.success(`${args.plugin} removed successfully`);
      consola.info(`Remember to remove it from your config at ~/.config/path-scout/path-scout.config.ts`);
    } catch (error) {
      consola.error(`Failed to remove ${args.plugin}`);
      process.exit(1);
    }
  },
});
