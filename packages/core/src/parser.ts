import { ParsedQuery } from './types.js';

/**
 * Parses a raw query string into an array of decoded path segments.
 * The last segment may include modifiers such as inline params (?key=value)
 * or free text (space followed by text) — these are passed through as-is
 * and are the responsibility of the trie to match against route definitions.
 *
 * @param raw - The raw query string from the browser search bar
 * @returns An array of decoded path segments
 *
 * @example
 * parseQuery("dev/sc_req_item?active=true")
 * // → ["dev", "sc_req_item?active=true"]
 *
 * @example
 * parseQuery("dev/sc_cat_item some text here")
 * // → ["dev", "sc_cat_item some text here"]
 */
export function parseQuery(raw: string): ParsedQuery {
  return raw
    .trim()
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .filter((segment) => segment.length > 0);
}
