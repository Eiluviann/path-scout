import { defineCommand } from 'citty';
import { list } from './list.js';
import { apply } from './apply.js';

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
