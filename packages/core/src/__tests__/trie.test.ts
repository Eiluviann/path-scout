import { describe, it, expect, beforeEach } from 'vitest';
import { Trie } from '../trie.js';
import { WildcardRegistry } from '../wildcard-registry.js';
import type { RouteConfig } from '../types/route.types.js';
import type { ActionDefinition } from '../types/action.types.js';

const mockAction: ActionDefinition = {
  name: 'Mock Action',
  description: 'A mock action for testing',
  resolve: (args) => `https://example.com/${args.env ?? ''}`,
};

describe('Trie', () => {
  let trie: Trie;
  let registry: WildcardRegistry;

  beforeEach(() => {
    trie = new Trie();
    registry = new WildcardRegistry();
  });

  describe('build and match — literals', () => {
    it('matches a single literal segment', () => {
      const config: RouteConfig = {
        dev: {
          _action: mockAction,
          _args: { env: 'dev' },
        },
      };
      trie.build(config, registry);
      const result = trie.match(['dev']);
      expect(result).not.toBeNull();
      expect(result!.action).toBe(mockAction);
    });

    it('matches nested literal segments', () => {
      const config: RouteConfig = {
        dev: {
          incidents: {
            _action: mockAction,
            _args: { env: 'dev' },
          },
        },
      };
      trie.build(config, registry);
      expect(trie.match(['dev', 'incidents'])).not.toBeNull();
      expect(trie.match(['dev'])).toBeNull();
      expect(trie.match(['prod', 'incidents'])).toBeNull();
    });

    it('returns null for unmatched path', () => {
      const config: RouteConfig = {
        dev: {
          _action: mockAction,
          _args: {},
        },
      };
      trie.build(config, registry);
      expect(trie.match(['prod'])).toBeNull();
    });
  });

  describe('build and match — wildcards', () => {
    it('matches a single wildcard segment and captures value', () => {
      const config: RouteConfig = {
        '{{word}}': {
          _action: mockAction,
          _args: { env: '{{word}}' },
        },
      };
      trie.build(config, registry);
      const result = trie.match(['dev']);
      expect(result).not.toBeNull();
      expect(result!.getCapturedWildcards()).toEqual({ word: 'dev' });
    });

    it('matches nested wildcard segments and captures all values', () => {
      const config: RouteConfig = {
        '{{word}}': {
          '{{word}}': {
            _action: mockAction,
            _args: { env: '{{word[0]}}', table: '{{word[1]}}' },
          },
        },
      };
      trie.build(config, registry);
      const result = trie.match(['dev', 'incidents']);
      expect(result).not.toBeNull();
      expect(result!.getCapturedWildcards()).toEqual({
        'word[0]': 'dev',
        'word[1]': 'incidents',
      });
    });

    it('matches plugin wildcards', () => {
      registry.registerPlugin({
        namespace: 'sn',
        wildcards: [{
          name: 'env',
          description: 'ServiceNow environment',
          examples: ['dev', 'test', 'prod'],
          pattern: /dev|test|prod/,
        }],
        actions: {},
      });

      const config: RouteConfig = {
        '{{sn:env}}': {
          _action: mockAction,
          _args: { env: '{{sn:env}}' },
        },
      };
      trie.build(config, registry);
      const result = trie.match(['dev']);
      expect(result).not.toBeNull();
      expect(result!.getCapturedWildcards()).toEqual({ 'sn:env': 'dev' });
    });

    it('does not match when wildcard pattern rejects segment', () => {
      registry.registerPlugin({
        namespace: 'sn',
        wildcards: [{
          name: 'env',
          description: 'ServiceNow environment',
          pattern: /dev|test|prod/,
        }],
        actions: {},
      });

      const config: RouteConfig = {
        '{{sn:env}}': {
          _action: mockAction,
          _args: {},
        },
      };
      trie.build(config, registry);
      expect(trie.match(['staging'])).toBeNull();
    });
  });

  describe('build and match — mixed segments', () => {
    it('matches a mixed segment with literal prefix', () => {
      const config: RouteConfig = {
        'v{{word}}': {
          _action: mockAction,
          _args: { version: '{{word}}' },
        },
      };
      trie.build(config, registry);
      const result = trie.match(['v1']);
      expect(result).not.toBeNull();
      expect(result!.getCapturedWildcards()).toEqual({ word: 'v1'.match(/^v(\S+)$/)?.[1] });
    });
  });

  describe('declaration order — first match wins', () => {
    it('matches the first route when multiple routes could match', () => {
      const firstAction: ActionDefinition = { ...mockAction, name: 'First Action' };
      const secondAction: ActionDefinition = { ...mockAction, name: 'Second Action' };

      const config: RouteConfig = {
        '{{word}}': {
          _action: firstAction,
          _args: {},
        },
        '{{*}}': {
          _action: secondAction,
          _args: {},
        },
      };
      trie.build(config, registry);
      const result = trie.match(['anything']);
      expect(result!.action.name).toBe('First Action');
    });
  });

  describe('intermediate nodes', () => {
    it('matches an intermediate node when query terminates early', () => {
      const config: RouteConfig = {
        '{{word}}': {
          _action: mockAction,
          _args: { env: '{{word}}' },
          incidents: {
            _action: mockAction,
            _args: { env: '{{word}}' },
          },
        },
      };
      trie.build(config, registry);
      expect(trie.match(['dev'])).not.toBeNull();
      expect(trie.match(['dev', 'incidents'])).not.toBeNull();
    });
  });

  describe('getCapturedWildcards normalization', () => {
    it('strips index from single occurrence wildcards', () => {
      const config: RouteConfig = {
        '{{word}}': {
          _action: mockAction,
          _args: {},
        },
      };
      trie.build(config, registry);
      const result = trie.match(['dev']);
      expect(result!.getCapturedWildcards()).toEqual({ word: 'dev' });
    });

    it('keeps indexes for multiple occurrences of the same wildcard', () => {
      const config: RouteConfig = {
        '{{word}}': {
          '{{word}}': {
            _action: mockAction,
            _args: {},
          },
        },
      };
      trie.build(config, registry);
      const result = trie.match(['dev', 'incidents']);
      expect(result!.getCapturedWildcards()).toEqual({
        'word[0]': 'dev',
        'word[1]': 'incidents',
      });
    });
  });
});
