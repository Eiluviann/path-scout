import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Plugin } from './plugin.types.js';
import type { RouteConfig } from './route.types.js';

/**
 * The complete Path Scout configuration exported from path-scout.config.ts.
 * Defines the route structure and plugins to load.
 */
export interface PathScoutConfig {
  /**
   * The port the HTTP server listens on.
   * Defaults to 7000 if not specified.
   * @default 7000
   */
  port?: number;
  /**
   * Plugins to load. Each plugin is an instantiated class that contributes
   * wildcards and actions available for use in the route configuration.
   * @example
   * plugins: [new ServiceNowPlugin({ environments: ['dev', 'test', 'prod'] })]
   */
  plugins?: Plugin[];
  /**
   * The route configuration defining all navigable paths.
   */
  routes: RouteConfig;
}

/**
 * Helper function that provides type inference for the config file.
 * Use this to wrap your config object for full TypeScript support.
 *
 * @example
 * export default defineConfig({
 *   plugins: [new ServiceNowPlugin({ environments: ['dev', 'test', 'prod'] })],
 *   routes: {
 *     '{{sn:env}}': {
 *       '{{sn:table}}': {
 *         _action: serviceNow.openTable,
 *         _args: { env: '{{sn:env}}', table: '{{sn:table}}' }
 *       }
 *     }
 *   }
 * });
 */
export function defineConfig(config: PathScoutConfig): PathScoutConfig {
  return config;
}

/**
 * Possible locations for the Path Scout config file.
 * Resolved in order — first match wins.
 *
 * Production: ~/.config/path-scout/path-scout.config.ts
 * Development: ./config/path-scout.config.ts (monorepo root)
 */
export const CONFIG_LOCATIONS = [
  join(homedir(), '.config', 'path-scout', 'path-scout.config.ts'),
  './config/path-scout.config.ts',
];
