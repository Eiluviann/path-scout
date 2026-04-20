/**
 * A single recorded usage event.
 */
export interface UsageStat {
  /** The raw query string typed by the user */
  query: string;
  /** The user who made the request, if provided */
  user?: string;
  /** Whether the query matched a route */
  matched: boolean;
  /** The matched route path if the query was successful */
  route?: string;
  /** ISO timestamp of the request */
  timestamp: string;
}

/**
 * A query suggestion returned by the stats store.
 * Ordered by frequency — most used routes first.
 */
export interface Suggestion {
  /** The full query string that was previously matched */
  query: string;
  /** Number of times this query was successfully matched */
  frequency: number;
}
