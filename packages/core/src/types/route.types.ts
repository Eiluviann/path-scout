import { ActionDefinition } from './action.types.js';

/**
 * The nested route definition structure provided in the user's config file.
 * Each key is either a literal path segment or a wildcard pattern.
 * Nesting mirrors the path structure — each level represents one segment.
 * Terminal entries must have action and args defined.
 * @example
 * {
 *   '{{env}}': {
 *     '{{sn:table}}': {
 *       action: ServiceNow.openTable,
 *       args: { env: '{{env}}', table: '{{sn:table}}' }
 *     }
 *   }
 * }
 */
export type RouteConfig = {
  [segment: string]: RouteConfig | { action: ActionDefinition; args: Record<string, string> };
};
