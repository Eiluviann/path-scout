/**
 * Builds the wildcard definitions for the ServiceNow plugin.
 *
 * @param config - The ServiceNow plugin configuration
 * @returns An array of wildcard definitions to register with the registry
 */
export function buildWildcards(config) {
    const wildcards = [
        {
            name: 'env',
            description: 'A configured ServiceNow environment alias e.g. dev, prod',
            examples: Object.keys(config.envs),
            patternFn: () => new RegExp(Object.keys(config.envs)
                .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('|')),
        },
        {
            name: 'table',
            description: 'A ServiceNow table name — lowercase letters, numbers and underscores, starting with a letter',
            examples: ['incident', 'sc_req_item', 'sys_user'],
            pattern: /[a-z][a-z0-9_]*/,
        },
        {
            name: 'sys_id',
            description: 'A ServiceNow sys_id — 32 character hexadecimal string',
            examples: ['abc1234567890abc1234567890abc123'],
            pattern: /[0-9a-f]{32}/,
        },
    ];
    const filterKeys = Object.keys(config.filters ?? {});
    if (filterKeys.length > 0) {
        wildcards.push({
            name: 'filter',
            description: 'A configured ServiceNow filter alias e.g. active, mine',
            examples: filterKeys,
            patternFn: () => new RegExp(filterKeys
                .map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('|')),
        });
    }
    return wildcards;
}
