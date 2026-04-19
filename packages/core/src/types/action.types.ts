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
