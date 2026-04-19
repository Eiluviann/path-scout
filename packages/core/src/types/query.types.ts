/**
 * The raw URL decoded string provided by the user, trimmed.
 * This is exactly what the user types into the browser search bar.
 */
export type Query = string;

/**
 * The parsed query — an array of path segments produced by splitting
 * the query on '/'. The last segment may contain additional structure
 * such as query strings or free text, expressed through mixed segments
 * and wildcards in the route definition.
 * @example ["dev", "sc_req_item?active=true"]
 */
export type ParsedQuery = string[];
