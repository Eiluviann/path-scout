import { defineCommand } from 'citty';
import { consola } from 'consola';

const DEFAULT_PORT = 7000;

export const status = defineCommand({
  meta: {
    name: 'status',
    description: 'Show Path Scout service status',
  },
  args: {
    port: {
      type: 'string',
      description: 'Port to check',
      default: String(DEFAULT_PORT),
    },
  },
  async run({ args }) {
    const port = Number(args.port);

    consola.start(`Checking status on port ${port}…`);

    try {
      const response = await fetch(`http://localhost:${port}/opensearch.xml`);

      if (response.ok) {
        consola.success(`path-scout is running on port ${port}`);
      } else {
        consola.warn(`path-scout responded with status ${response.status}`);
      }
    } catch {
      consola.error(`path-scout is not running on port ${port}`);
      process.exit(1);
    }
  },
});
