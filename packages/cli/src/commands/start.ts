import { defineCommand } from 'citty';

export const start = defineCommand({
  meta: {
    name: 'start',
    description: 'Start the Path Scout server',
  },
  async run() {},
});
