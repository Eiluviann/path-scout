interface WildcardBase {
  /**
   * The wildcard's name, must be unique within its namespace.
   */
  name: string;
  /** Shown in help output and validation error messages */
  description: string;
  /**
   * One or more valid values used to smoke-test the pattern at config load.
   * Optional for dynamic wildcards whose valid values depend on plugin config
   * and cannot be known ahead of time.
   * @example ["dev", "test", "prod"]
   */
  examples?: string[];
}

interface StaticWildcard extends WildcardBase {
  /** A static regex pattern compiled once at config load */
  pattern: RegExp;
  patternFn?: never;
  recompileOnMatch?: never;
}

interface DynamicWildcard extends WildcardBase {
  /** A function that returns a regex pattern */
  patternFn: () => RegExp;
  pattern?: never;
  /**
   * When true, patternFn is called on every match instead of once at config load.
   * Use sparingly — prefer static patterns or load-time compilation where possible.
   */
  recompileOnMatch?: boolean;
}

/**
 * A typed placeholder used in route path segments.
 * Core wildcards are provided by @path-scout/core with no namespace.
 * Plugin wildcards are automatically prefixed with the plugin namespace.
 * Either pattern or patternFn must be present — not both, not neither.
 * @example
 * // Static wildcard
 * { name: 'number', description: 'Numeric segments only', pattern: /\d+/, examples: ['42', '100'] }
 *
 * // Dynamic wildcard
 * { name: 'env', description: 'Known environments', patternFn: () => new RegExp(envs.join('|')) }
 */
export type Wildcard = StaticWildcard | DynamicWildcard;

/**
 * Interface for a registered wildcard.
 * Implemented by the RegisteredWildcard class in wildcard-registry.ts.
 * Using an interface here avoids a circular dependency between types and implementation.
 */
export interface IRegisteredWildcard {
  readonly name: string;
  readonly description: string;
  readonly examples?: string[];
  /**
   * Returns the regex pattern for this wildcard.
   * For recompileOnMatch wildcards, calls patternFn fresh each time.
   * For all others, returns the pre-compiled pattern.
   */
  getPattern(): RegExp;
}
