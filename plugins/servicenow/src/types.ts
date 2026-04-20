/**
 * A single ServiceNow environment configuration.
 * Maps a short alias to the environment URL subdomain.
 */
export interface SnEnv {
  /** The environment URL subdomain e.g. 'myinstance-dev' → myinstance-dev.service-now.com */
  url: string;
  /**
   * The Service Portal URL suffix for this environment.
   * Defaults to 'sp' if not configured.
   * @default 'sp'
   * @example 'sp', 'esc', 'hrportal'
   */
  portal?: string;
}

/**
 * Configuration for the ServiceNow plugin.
 * Provided by the user when instantiating the plugin.
 */
export interface ServiceNowPluginConfig {
  /**
   * Map of environment aliases to environment configuration.
   * Keys are the aliases users type in routes e.g. 'dev', 'prod'.
   * @example { dev: { url: 'myinstance-dev' }, prod: { url: 'myinstance' } }
   */
  envs: Record<string, SnEnv>;
  /**
   * Map of table aliases to real ServiceNow table names.
   * Keys are short aliases users type, values are full table names.
   * @example { ritm: 'sc_req_item', catit: 'sc_cat_item' }
   */
  aliases?: Record<string, string>;
  /**
   * Map of filter aliases to ServiceNow query strings.
   * Keys are short aliases, values are full sysparm_query strings.
   * @example { active: 'active=true', mine: 'assigned_to=javascript:getMyAssignmentsFilter()' }
   */
  filters?: Record<string, string>;
}
