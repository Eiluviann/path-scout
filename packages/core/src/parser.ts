import type { Query, ParsedQuery } from './types/index.js';

/**
 * Parses a raw query string into an array of decoded path segments.
 * The last segment is passed through as-is — any additional structure
 * such as query strings or free text is the responsibility of the
 * route definition to handle via mixed segments and wildcards.
 *
 * @param query - The raw URL decoded string from the browser search bar
 * @returns An array of path segments
 *
 * @example
 * parseQuery("dev/sc_req_item?active=true")
 * // → ["dev", "sc_req_item?active=true"]
 *
 * @example
 * parseQuery("dev/sc_cat_item some text here")
 * // → ["dev", "sc_cat_item some text here"]
 */
export function parseQuery(query: Query): ParsedQuery {
  return query
    .trim()
    .split('/')
    .filter((segment) => segment.length > 0);
}
