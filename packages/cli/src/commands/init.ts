import { defineCommand } from 'citty';
import { consola } from 'consola';
import * as p from '@clack/prompts';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.config', 'path-scout');
const CONFIG_PATH = join(CONFIG_DIR, 'path-scout.config.ts');

export const init = defineCommand({
  meta: {
    name: 'init',
    description: 'Scaffold a new Path Scout config',
  },
  async run() {
    p.intro('path-scout setup');

    if (existsSync(CONFIG_PATH)) {
      const overwrite = await p.confirm({
        message: `Config already exists at ${CONFIG_PATH}. Overwrite?`,
        initialValue: false,
      });

      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel('Setup cancelled');
        process.exit(0);
      }
    }

    const port = await p.text({
      message: 'Which port should path-scout run on?',
      placeholder: '7000',
      defaultValue: '7000',
      validate: (value) => {
        const n = Number(value);
        if (isNaN(n) || n < 1 || n > 65535) return 'Please enter a valid port number';
      },
    });

    if (p.isCancel(port)) {
      p.cancel('Setup cancelled');
      process.exit(0);
    }

    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const config = generateConfig(Number(port));
    writeFileSync(CONFIG_PATH, config, 'utf-8');

    p.outro(`Config created at ${CONFIG_PATH}`);
    consola.info('Edit your config to add plugins and routes, then run path-scout start');
  },
});

/**
 * Generates a starter config file with the given port.
 *
 * @param port - The port the server will listen on
 */
function generateConfig(port: number): string {
  return `import { defineConfig } from 'path-scout';

export default defineConfig({
  port: ${port},
  plugins: [],
  routes: {
    // Add your routes here
    // Example:
    // '{{word}}': {
    //   _action: MyPlugin.openPage,
    //   _args: { env: '{{word}}' },
    // },
  },
});
`;
}
