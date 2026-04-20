import { defineCommand } from 'citty';

export const status = defineCommand({
  meta: {
    name: 'status',
    description: 'Show Path Scout service status',
  },
  async run() {},
});
