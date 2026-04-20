import { defineCommand } from 'citty';

export const stop = defineCommand({
  meta: {
    name: 'stop',
    description: 'Stop the Path Scout service',
  },
  async run() {},
});
