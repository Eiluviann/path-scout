import type { ActionDefinition } from './action.types.js';

/**
 * A single node in the route configuration.
 * May have _action and _args if a route resolves at this level.
 * Child segments are nested RouteNodes, allowing routes to continue deeper.
 */
export type RouteNode = {
  _action?: ActionDefinition;
  _args?: Record<string, string>;
  [segment: string]: RouteNode | ActionDefinition | Record<string, string> | undefined;
};

/**
 * The complete route configuration provided by the user.
 * Top level map of path segments to RouteNodes.
 */
export type RouteConfig = {
  [segment: string]: RouteNode;
};

/**
 * Type guard that narrows a RouteNode to one that has an action defined.
 * A resolvable node has _action defined — _args are optional as not all
 * actions require arguments.
 *
 * @param node - The route node to check
 * @returns True if the node has _action defined
 */
export function isResolvableRouteNode(node: RouteNode): node is RouteNode & {
  _action: ActionDefinition;
} {
  return '_action' in node && node._action !== undefined;
}
