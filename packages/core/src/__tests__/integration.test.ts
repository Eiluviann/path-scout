import { describe, it, expect, beforeEach } from 'vitest';
import { parseQuery } from '../parser.js';
import { Trie } from '../trie.js';
import { WildcardRegistry } from '../wildcard-registry.js';
import { interpolate } from '../interpolation.js';
import type { RouteConfig } from '../types/route.types.js';
import type { ActionDefinition } from '../types/action.types.js';

const openTable: ActionDefinition = {
  name: 'Open Table',
  description: 'Opens a ServiceNow table',
  resolve: ({ env, table, filter }) => {
    const base = `https://${env}.service-now.com/${table}_list.do`;
    return filter ? `${base}?sysparm_query=${filter}` : base;
  },
};

const openInstance: ActionDefinition = {
  name: 'Open Instance',
  description: 'Opens a ServiceNow instance',
  resolve: ({ env }) => `https://${env}.service-now.com`,
};

describe('Full pipeline integration', () => {
  let trie: Trie;
  let registry: WildcardRegistry;

  beforeEach(() => {
    registry = new WildcardRegistry();
    registry.registerPlugin({
      namespace: 'sn',
      wildcards: [
        {
          name: 'env',
          description: 'ServiceNow environment',
          examples: ['dev', 'test', 'prod'],
          pattern: /dev|test|prod/,
        },
        {
          name: 'table',
          description: 'ServiceNow table name',
          examples: ['incident', 'sc_req_item'],
          pattern: /[a-z][a-z0-9_]*/,
        },
      ],
      actions: {},
    });

    const config: RouteConfig = {
      '{{sn:env}}': {
        _action: openInstance,
        _args: { env: '{{sn:env}}' },
        '{{sn:table}}': {
          _action: openTable,
          _args: {
            env: '{{sn:env}}',
            table: '{{sn:table}}',
          },
        },
      },
    };

    trie = new Trie();
    trie.build(config, registry);
  });

  it('resolves a simple instance path', () => {
    const segments = parseQuery('dev');
    const match = trie.match(segments);
    expect(match).not.toBeNull();

    const args = interpolate(match!.args, match!.getCapturedWildcards());
    const url = openInstance.resolve(args);
    expect(url).toBe('https://dev.service-now.com');
  });

  it('resolves a table path', () => {
    const segments = parseQuery('dev/incident');
    const match = trie.match(segments);
    expect(match).not.toBeNull();

    const args = interpolate(match!.args, match!.getCapturedWildcards());
    const url = openTable.resolve(args);
    expect(url).toBe('https://dev.service-now.com/incident_list.do');
  });

  it('resolves a table path with inline params passed as static arg', () => {
    const segments = parseQuery('prod/sc_req_item');
    const match = trie.match(segments);
    expect(match).not.toBeNull();

    const args = interpolate(
      { ...match!.args, filter: 'active=true' },
      match!.getCapturedWildcards()
    );
    const url = openTable.resolve(args);
    expect(url).toBe('https://prod.service-now.com/sc_req_item_list.do?sysparm_query=active=true');
  });

  it('returns null for an unrecognised environment', () => {
    const segments = parseQuery('staging/incident');
    const match = trie.match(segments);
    expect(match).toBeNull();
  });

  it('returns null for an empty query', () => {
    const segments = parseQuery('');
    const match = trie.match(segments);
    expect(match).toBeNull();
  });
});
