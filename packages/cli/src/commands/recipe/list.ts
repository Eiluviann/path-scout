import { defineCommand } from 'citty';
import { consola } from 'consola';
import { servicenowRecipe } from './recipes/servicenow.js';

const recipes = [servicenowRecipe];

export const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List available Path Scout recipes',
  },
  async run() {
    consola.log('');
    consola.log('Available recipes:\n');
    for (const recipe of recipes) {
      consola.log(`  ${recipe.name}`);
      consola.log(`  ${recipe.description}\n`);
    }
  },
});
