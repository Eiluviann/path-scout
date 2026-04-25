import { defineCommand } from 'citty';
import { apply } from './apply.js';
import { list } from './list.js';

export const recipe = defineCommand({
  meta: {
    name: 'recipe',
    description: 'Manage Path Scout recipes',
  },
  subCommands: {
    list,
    apply,
  },
});
