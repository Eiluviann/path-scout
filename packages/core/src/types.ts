/**
 * A raw query string split into path segments.
 * The last segment may include modifiers such as inline params or free text.
 * @example ["dev", "sc_req_item?active=true"]
 */
export type ParsedQuery = string[];

/**
 * The result of a successful trie match.
 * Contains all named values captured from the path segments during matching.
 * @example { env: "dev", "sn:table": "sc_req_item" }
 */
export interface RouteMatch {
  captures: Record<string, string>;
}

/**
 * Base fields shared by all wildcard types.
 */
interface WildcardBase {
  /** Identifier within the wildcard's namespace */
  name: string;
  /** Shown in help output and validation error messages */
  description: string;
  /** A valid value used to smoke-test the pattern at config load */
  example: string;
}

/**
 * A wildcard with a static regex pattern.
 * Pattern is compiled once at config load.
 */
interface StaticWildcard extends WildcardBase {
  pattern: RegExp;
  patternFn?: never;
  recompileOnMatch?: never;
}

/**
 * A wildcard with a dynamically generated regex pattern.
 * patternFn is called at config load by default.
 * Set recompileOnMatch to true to call patternFn on every match instead.
 */
interface DynamicWildcard extends WildcardBase {
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
 * Core wildcards are provided by @path-scout/core.
 * Plugins contribute additional wildcards prefixed with their namespace.
 */
export type Wildcard = StaticWildcard | DynamicWildcard;

/**
 * Defines a navigable action contributed by a plugin.
 * The resolve function receives interpolated args and must return a valid URL.
 */
export interface ActionDefinition {
  /** Human readable name shown in help output */
  name: string;
  /** Description of what this action does, shown in help output and error messages */
  description: string;
  /**
   * Receives the resolved args from the route config and returns a URL to redirect to.
   * @param args - Named arguments resolved from path captures and static values
   * @returns A valid URL string
   */
  resolve: (args: Record<string, string>) => string;
}

/**
 * The raw plugin definition provided by the plugin author.
 * Pass this to definePlugin to produce a typed Plugin with actions at the top level.
 */
export interface PluginDefinition {
  /** Unique namespace for this plugin. All wildcards are prefixed with it automatically. */
  namespace: string;
  /** Wildcards contributed by this plugin, available as {{namespace:name}} in route paths */
  wildcards?: Wildcard[];
  /** Optional one-time setup, run at config load before the trie is compiled */
  setup?: () => void | Promise<void>;
  /** Actions contributed by this plugin, accessible as PluginName.actionName in route config */
  actions: Record<string, ActionDefinition>;
}

/**
 * A fully typed plugin with actions promoted to the top level.
 * Produced by definePlugin — do not construct this manually.
 * @example ServiceNow.openTable
 */
export type Plugin<T extends Record<string, ActionDefinition>> =
  Omit<PluginDefinition, 'actions'> & T;

/**
 * A leaf node in the route config tree.
 * Defines which action to call and how to map path captures to its arguments.
 */
export interface RouteLeaf {
  /** The action to invoke when this route is matched */
  action: ActionDefinition;
  /**
   * Maps action argument names to path captures or static values.
   * Captures are referenced as {{captureName}}, static values are plain strings.
   * @example { env: "{{env}}", table: "{{sn:table}}", filter: "active=true" }
   */
  args: Record<string, string>;
}

/**
 * The nested route definition structure provided in the user's config file.
 * Each key is either a literal path segment or a wildcard pattern.
 * Nesting mirrors the path structure — each level represents one segment.
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
  [segment: string]: RouteConfig | RouteLeaf;
};
