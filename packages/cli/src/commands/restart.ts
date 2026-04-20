import { defineCommand } from 'citty';

export const restart = defineCommand({
  meta: {
    name: 'restart',
    description: 'Restart the Path Scout service',
  },
  async run() {},
});
