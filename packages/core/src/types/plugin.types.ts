import type { Wildcard } from './wildcard.types.js';
import type { ActionDefinition } from './action.types.js';

/**
 * Contract for a Path Scout plugin.
 * Plugins are implemented as classes and instantiated with their configuration.
 * Each plugin contributes wildcards and actions under a unique namespace.
 *
 * @example
 * class ServiceNowPlugin implements Plugin {
 *   readonly namespace = 'sn';
 *   readonly wildcards: Wildcard[];
 *   readonly actions: Record<string, ActionDefinition>;
 *
 *   constructor(config: ServiceNowConfig) {
 *     this.wildcards = [...];
 *     this.actions = {...};
 *   }
 * }
 */
export interface Plugin {
  /**
   * Unique namespace for this plugin.
   * All wildcards contributed by this plugin are automatically prefixed with it.
   * @example 'sn'
   */
  readonly namespace: string;
  /**
   * Wildcards contributed by this plugin.
   * Available in route definitions as {{namespace:name}}.
   */
  readonly wildcards?: Wildcard[];
  /**
   * Actions contributed by this plugin.
   * Accessible as instance.actionName in the user's route config.
   */
  readonly actions: Record<string, ActionDefinition>;
}
