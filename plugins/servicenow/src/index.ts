import type { Plugin } from '@path-scout/core';
import type { ActionDefinition } from '@path-scout/core';
import type { ServiceNowPluginConfig } from './types.js';
import { buildWildcards } from './wildcards.js';
import { buildActions } from './actions.js';

/**
 * The ServiceNow plugin for Path Scout.
 * Contributes wildcards and actions for navigating ServiceNow instances.
 *
 * @example
 * const sn = new ServiceNowPlugin({
 *   envs: {
 *     dev: { url: 'myinstance-dev', portal: 'sp' },
 *     prod: { url: 'myinstance' },
 *   },
 *   aliases: {
 *     ritm: 'sc_req_item',
 *     catit: 'sc_cat_item',
 *   },
 *   filters: {
 *     active: 'active=true',
 *     mine: 'assigned_to=javascript:getMyAssignmentsFilter()',
 *   },
 * });
 */
export class ServiceNowPlugin implements Plugin {
  readonly namespace = 'sn';
  readonly wildcards;
  readonly actions: Record<string, ActionDefinition>;

  constructor(config: ServiceNowPluginConfig) {
    this.wildcards = buildWildcards(config);
    this.actions = buildActions(config);
  }
}

export type { ServiceNowPluginConfig } from './types.js';
export type { SnEnv } from './types.js';
