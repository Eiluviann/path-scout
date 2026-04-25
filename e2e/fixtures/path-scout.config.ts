// Sample config representing what a user would have after running:
//   path-scout recipe apply
// or writing their own config manually.
//
// The routes below are used by the e2e test suite to verify that the server
// resolves and redirects correctly.
import { defineConfig } from 'path-scout';

export default defineConfig({
  port: 7801,
  routes: {
    gh: {
      _action: {
        name: 'github',
        description: 'Open GitHub',
        resolve: () => 'https://github.com',
      },
      _args: {},
    },
    docs: {
      _action: {
        name: 'open-docs',
        description: 'Open documentation',
        resolve: () => 'https://example.com/docs',
      },
      _args: {},
      api: {
        _action: {
          name: 'open-api-docs',
          description: 'Open API documentation',
          resolve: () => 'https://example.com/docs/api',
        },
        _args: {},
      },
    },
  },
});
