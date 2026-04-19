// #region --- Query Types

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

// #endregion

// #region --- Action Types

/**
 * Defines a navigable action contributed by a plugin.
 * The resolve function receives fully interpolated args and must return a URL.
 * Async resolve is supported for cases where URL construction requires
 * asynchronous operations.
 */
export interface ActionDefinition {
  /** Human readable name shown in help output */
  name: string;
  /** Description of what this action does, shown in help output and error messages */
  description: string;
  /**
   * Receives the resolved args from the route config and returns a URL to redirect to.
   * @param args - Named arguments resolved from path captures and static values
   * @returns A valid URL string or a Promise resolving to one
   */
  resolve: (args: Record<string, string>) => string | Promise<string>;
}

// #endregion

// #region --- Wildcard Types

/**
 * Base fields shared by all wildcard types.
 */
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

/**
 * A wildcard with a static regex pattern.
 * Pattern is compiled once at config load and reused for every match.
 */
interface StaticWildcard extends WildcardBase {
  /** A static regex pattern compiled once at config load */
  pattern: RegExp;
  patternFn?: never;
  recompileOnMatch?: never;
}

/**
 * A wildcard with a dynamically generated regex pattern.
 * By default patternFn is called once at config load.
 * Set recompileOnMatch to true to call patternFn on every match instead.
 */
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
 * Internal representation of a registered wildcard.
 * Extends Wildcard with a compiled regex pattern for efficient matching.
 * compiledPattern is null when recompileOnMatch is true —
 * patternFn is called on every match instead.
 */
export type RegisteredWildcard = Wildcard & {
  compiledPattern: RegExp | null;
};

// #endregion

// #region --- Plugin Types

/**
 * The raw plugin definition provided by the plugin author.
 * Pass this to definePlugin to produce a typed Plugin with actions at the top level.
 */
export interface PluginDefinition {
  /**
   * Unique namespace for this plugin.
   * All wildcards contributed by this plugin are automatically prefixed with it.
   * @example 'servicenow'
   */
  namespace: string;
  /**
   * Wildcards contributed by this plugin.
   * Available in route definitions as {{namespace:name}}.
   */
  wildcards?: Wildcard[];
  /**
   * Optional setup function run once at config load before the trie is compiled.
   * Use this to provide plugin configuration and initialise any required state.
   */
  setup?: () => void | Promise<void>;
  /**
   * Actions contributed by this plugin.
   * Accessible as PluginName.actionName in the user's route config.
   */
  actions: Record<string, ActionDefinition>;
}

/**
 * A fully typed plugin with actions promoted to the top level.
 * Produced by definePlugin — do not construct this manually.
 * @example
 * const ServiceNow = definePlugin({ ... });
 * ServiceNow.openTable  // action directly on the plugin object
 */
export type Plugin<T extends Record<string, ActionDefinition>> =
  Omit<PluginDefinition, 'actions'> & T;

// #endregion

// #region --- Route Types

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

// #endregion

// #region --- Pattern Token Types

/**
 * A literal string token within a segment pattern.
 * When a pattern consists of a single LiteralPatternToken,
 * matching uses strict equality instead of regex.
 */
export interface LiteralPatternToken {
  type: 'literal';
  /** The exact string value to match against */
  value: string;
}

/**
 * A wildcard token within a segment pattern.
 * The wildcard object contains the name, description, and pattern
 * used to validate the segment at match time.
 */
export interface WildcardPatternToken {
  type: 'wildcard';
  /** The registered wildcard used to match and capture this token */
  wildcard: RegisteredWildcard;
}

/**
 * A single unit within a compiled segment pattern.
 * Mixed segments compile into an ordered list of tokens.
 */
export type PatternToken = LiteralPatternToken | WildcardPatternToken;

// #endregion

// #region --- Trie Types

/**
 * A single node in the trie representing one level of a path.
 * Each node matches one segment via its pattern and points to child nodes.
 * Action and args may be present on both intermediate and terminal nodes —
 * an intermediate node with action and args will execute when the query
 * terminates at that level, even if longer routes continue from it.
 * Terminal nodes (no children) must have action and args.
 */
export interface TrieNode {
  /**
   * Ordered list of tokens defining what this node matches against.
   * A single LiteralPatternToken uses strict equality.
   * Any other combination compiles to a regex.
   */
  pattern: PatternToken[];
  /** Child nodes evaluated in declaration order — first match wins */
  children: TrieNode[];
  /** Present when a route terminates or passes through this node */
  action?: ActionDefinition;
  /**
   * Maps action parameter names to captured wildcard names or static values.
   * Required when action is present.
   * @example { env: '{{env}}', table: '{{sn:table}}', filter: 'active=true' }
   */
  args?: Record<string, string>;
}

/**
 * The root node of the trie. Identical to TrieNode but without a pattern —
 * the root has no segment to match against, it is purely an entry point
 * into the trie whose children are evaluated against the first path segment.
 */
export interface TrieRootNode extends Omit<TrieNode, 'pattern'> {}

/**
 * The result of a successful trie match.
 * Contains everything needed to interpolate args and invoke the action.
 */
export interface TrieMatch {
  /** The action to invoke */
  action: ActionDefinition;
  /**
   * The raw args from the matched node, before interpolation.
   * References like {{env}} are not yet resolved.
   * @example { instance: '{{env}}', table: '{{sn:table}}', filter: 'active=true' }
   */
  args: Record<string, string>;
  /**
   * Wildcard values collected during trie traversal.
   * Keys are wildcard names, values are the matched segments.
   * @example { env: 'dev', 'sn:table': 'sc_req_item' }
   */
  capturedWildcards: Record<string, string>;
}

// #endregion
