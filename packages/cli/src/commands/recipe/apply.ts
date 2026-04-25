import { defineCommand } from 'citty';
import { consola } from 'consola';
import * as p from '@clack/prompts';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { runPnpm } from '../../utils/pnpm.js';
import { servicenowRecipe } from './recipes/servicenow.js';

const recipes = [servicenowRecipe];
const CONFIG_DIR = join(homedir(), '.config', 'path-scout');
const CONFIG_PATH = join(CONFIG_DIR, 'path-scout.config.ts');
const PLUGIN_DIR = join(CONFIG_DIR, '.npm');

export const apply = defineCommand({
  meta: {
    name: 'apply',
    description: 'Apply a Path Scout recipe',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Recipe name to apply',
      required: false,
    },
  },
  async run({ args }) {
    p.intro('path-scout recipe');

    // If no name provided, show selection
    let recipeName = args.name;

    if (!recipeName) {
      const selected = await p.select({
        message: 'Which recipe would you like to apply?',
        options: recipes.map(r => ({
          value: r.name,
          label: r.name,
          hint: r.description,
        })),
      });

      if (p.isCancel(selected)) {
        p.cancel('Cancelled');
        process.exit(0);
      }

      recipeName = selected as string;
    }

    const recipe = recipes.find(
      r => r.name.toLowerCase() === recipeName!.toLowerCase()
    );

    if (!recipe) {
      consola.error(`Recipe "${recipeName}" not found. Run path-scout recipe list to see available recipes.`);
      process.exit(1);
    }

    if (existsSync(CONFIG_PATH)) {
      const overwrite = await p.confirm({
        message: `Config already exists at ${CONFIG_PATH}. Overwrite?`,
        initialValue: false,
      });

      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel('Cancelled');
        process.exit(0);
      }
    }

    // Install plugins
    if (recipe.plugins.length > 0) {
      p.log.step('Installing plugins…');

      if (!existsSync(PLUGIN_DIR)) {
        mkdirSync(PLUGIN_DIR, { recursive: true });
      }

      for (const plugin of recipe.plugins) {
        try {
          const localPlugin = join(process.cwd(), 'plugins', plugin.replace('@path-scout/plugin-', ''));
          if (existsSync(localPlugin)) {
            p.log.info(`Using local plugin: ${plugin}`);
            continue;
          }
          runPnpm(`add ${plugin} --dir ${PLUGIN_DIR}`);
        } catch {
          consola.error(`Failed to install ${plugin}`);
          process.exit(1);
        }
      }
    }

    // Run wizard
    p.log.step('Configure your setup');
    const values = await recipe.prompt();

    // Generate and write config
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const config = recipe.generateConfig(values);
    writeFileSync(CONFIG_PATH, config, 'utf-8');

    p.outro(`Config written to ${CONFIG_PATH}`);
    consola.info('Run path-scout start to start the server');
  },
});
