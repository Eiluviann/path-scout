/**
 * Builds the action definitions for the ServiceNow plugin.
 * All actions receive resolved args and return a ServiceNow URL.
 *
 * @param config - The ServiceNow plugin configuration
 * @returns A record of action names to action definitions
 */
export function buildActions(config) {
    /**
     * Resolves an env alias to its full ServiceNow base URL.
     */
    function baseUrl(env) {
        const snEnv = config.envs[env];
        return `https://${snEnv.url}.service-now.com`;
    }
    /**
     * Resolves the configured portal suffix for an env.
     * Defaults to 'sp' if not configured.
     */
    function portal(env) {
        return config.envs[env].portal ?? 'sp';
    }
    /**
     * Resolves a table alias to its real ServiceNow table name.
     * Falls through to the original value if no alias is configured.
     */
    function resolveTable(table) {
        return config.aliases?.[table] ?? table;
    }
    /**
     * Resolves a filter alias to its full sysparm_query string.
     * Falls through to the original value if no alias is configured.
     */
    function resolveFilter(filter) {
        return config.filters?.[filter] ?? filter;
    }
    return {
        openInstance: {
            name: 'Open Instance',
            description: 'Opens the ServiceNow env homepage',
            resolve: ({ env }) => baseUrl(env),
        },
        searchInstance: {
            name: 'Search Instance',
            description: 'Performs a global search on the ServiceNow env',
            resolve: ({ env, text }) => `${baseUrl(env)}/textsearch_search.do?sysparm_search=${encodeURIComponent(text)}`,
        },
        instanceLogin: {
            name: 'Instance Login',
            description: 'Opens the ServiceNow env login page',
            resolve: ({ env }) => `${baseUrl(env)}/login.do`,
        },
        openRemoteInstance: {
            name: 'Open Remote Instance',
            description: 'Opens the remote update sets page filtered to active instances of the target environment',
            resolve: ({ env, targetEnv }) => `${baseUrl(env)}/sys_remote_update_set.do?sysparm_query=type=${targetEnv}^active=true`,
        },
        openBackgroundScript: {
            name: 'Open Background Script',
            description: 'Opens the background script page on the ServiceNow env',
            resolve: ({ env }) => `${baseUrl(env)}/sys.scripts.modern.do`,
        },
        openCurrentUpdateSet: {
            name: 'Open Current Update Set',
            description: 'Opens the currently selected update set on the ServiceNow env',
            resolve: ({ env }) => `${baseUrl(env)}/sys_update_set.do?sysparm_query=sys_id=javascript:gs.getPreference('sys_update_set')`,
        },
        openPortal: {
            name: 'Open Portal',
            description: 'Opens the Service Portal homepage on the ServiceNow env',
            resolve: ({ env }) => `${baseUrl(env)}/${portal(env)}`,
        },
        openPortalRecord: {
            name: 'Open Portal Record',
            description: 'Opens the Service Portal configuration record for the configured portal',
            resolve: ({ env }) => `${baseUrl(env)}/sp_portal.do?sysparm_query=url_suffix=${portal(env)}`,
        },
        openPortalPage: {
            name: 'Open Portal Page',
            description: 'Opens a specific Service Portal page by ID using the configured portal',
            resolve: ({ env, word: page }) => `${baseUrl(env)}/${portal(env)}?id=${page}`,
        },
        openCatalogItemOnPortal: {
            name: 'Open Catalog Item on Portal',
            description: 'Opens a catalog item on the Service Portal by sys_id',
            resolve: ({ env, sys_id }) => `${baseUrl(env)}/${portal(env)}?id=sc_cat_item&sys_id=${sys_id}`,
        },
        openOrderGuideOnPortal: {
            name: 'Open Order Guide on Portal',
            description: 'Opens an order guide on the Service Portal by sys_id',
            resolve: ({ env, sys_id }) => `${baseUrl(env)}/${portal(env)}?id=sc_cat_item_guide&sys_id=${sys_id}`,
        },
        openNewRecordForm: {
            name: 'Open New Record Form',
            description: 'Opens a blank form to create a new record in a table',
            resolve: ({ env, table }) => `${baseUrl(env)}/${resolveTable(table)}.do?sys_id=-1`,
        },
        openRecordForm: {
            name: 'Open Record Form',
            description: 'Opens the default form view for a table with an optional query',
            resolve: ({ env, table, query }) => {
                const base = `${baseUrl(env)}/${resolveTable(table)}.do`;
                return query ? `${base}?sysparm_query=${encodeURIComponent(query)}` : base;
            },
        },
        openTableConfig: {
            name: 'Open Table Config',
            description: 'Opens the configuration record for a table',
            resolve: ({ env, table }) => `${baseUrl(env)}/sys_db_object.do?sysparm_query=name=${resolveTable(table)}`,
        },
        openTableList: {
            name: 'Open Table List',
            description: 'Opens the list view for a ServiceNow table',
            resolve: ({ env, table }) => `${baseUrl(env)}/${resolveTable(table)}_list.do`,
        },
        searchTable: {
            name: 'Search Table',
            description: 'Performs a keyword search on a ServiceNow table',
            resolve: ({ env, table, text }) => `${baseUrl(env)}/${resolveTable(table)}_list.do?sysparm_search=${encodeURIComponent(text)}`,
        },
        searchTableByQuery: {
            name: 'Search Table by Query',
            description: 'Filters a ServiceNow table by an encoded query string',
            resolve: ({ env, table, query }) => `${baseUrl(env)}/${resolveTable(table)}_list.do?sysparm_query=${encodeURIComponent(query)}`,
        },
        openRecordById: {
            name: 'Open Record by ID',
            description: 'Opens a specific record by its sys_id',
            resolve: ({ env, table, sys_id }) => `${baseUrl(env)}/${resolveTable(table)}.do?sys_id=${sys_id}`,
        },
        searchTableByFilter: {
            name: 'Search Table by Filter',
            description: 'Filters a ServiceNow table using a configured filter alias',
            resolve: ({ env, table, filter }) => `${baseUrl(env)}/${resolveTable(table)}_list.do?sysparm_query=${encodeURIComponent(resolveFilter(filter))}`,
        },
    };
}
