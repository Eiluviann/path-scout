import { Wildcard } from './wildcard.types.js';
import { ActionDefinition } from './action.types.js';

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
