import { defineCommand } from 'citty';

export const init = defineCommand({
  meta: {
    name: 'init',
    description: 'Scaffold a new Path Scout config',
  },
  async run() {},
});
