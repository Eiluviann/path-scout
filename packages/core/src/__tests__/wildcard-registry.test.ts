import { describe, it, expect } from 'vitest';
import { WildcardRegistry, RegisteredWildcard } from '../wildcard-registry.js';
import { CollisionError, NamespaceCollisionError, ValidationError, UnknownWildcardError } from '../errors.js';

describe('WildcardRegistry', () => {
  describe('constructor', () => {
    it('pre-loads core wildcards', () => {
      const registry = new WildcardRegistry();
      expect(registry.resolve('*')).toBeInstanceOf(RegisteredWildcard);
      expect(registry.resolve('word')).toBeInstanceOf(RegisteredWildcard);
    });
  });

  describe('register', () => {
    it('registers a new core wildcard', () => {
      const registry = new WildcardRegistry();
      registry.register({
        name: 'number',
        description: 'Numeric segments only',
        examples: ['42', '100'],
        pattern: /\d+/,
      });
      expect(registry.resolve('number')).toBeInstanceOf(RegisteredWildcard);
    });

    it('throws CollisionError when registering a duplicate core wildcard', () => {
      const registry = new WildcardRegistry();
      expect(() => registry.register({
        name: '*',
        description: 'Duplicate wildcard',
        pattern: /.+/,
      })).toThrow(CollisionError);
    });
  });

  describe('registerPlugin', () => {
    it('registers plugin wildcards with namespace prefix', () => {
      const registry = new WildcardRegistry();
      registry.registerPlugin({
        namespace: 'sn',
        wildcards: [
          {
            name: 'env',
            description: 'ServiceNow environment',
            examples: ['dev', 'test', 'prod'],
            pattern: /dev|test|prod/,
          }
        ],
        actions: {},
      });
      expect(registry.resolve('sn:env')).toBeInstanceOf(RegisteredWildcard);
    });

    it('throws NamespaceCollisionError when registering duplicate namespace', () => {
      const registry = new WildcardRegistry();
      const plugin = { namespace: 'sn', wildcards: [], actions: {} };
      registry.registerPlugin(plugin);
      expect(() => registry.registerPlugin(plugin)).toThrow(NamespaceCollisionError);
    });

    it('registers plugin with no wildcards', () => {
      const registry = new WildcardRegistry();
      expect(() => registry.registerPlugin({
        namespace: 'gh',
        actions: {},
      })).not.toThrow();
    });
  });

  describe('validate', () => {
    it('passes when all examples match their patterns', () => {
      const registry = new WildcardRegistry();
      expect(() => registry.validate()).not.toThrow();
    });

    it('throws ValidationError when a pattern rejects its own example', () => {
      const registry = new WildcardRegistry();
      registry.register({
        name: 'broken',
        description: 'Broken wildcard',
        examples: ['not-a-number'],
        pattern: /^\d+$/,
      });
      expect(() => registry.validate()).toThrow(ValidationError);
    });

    it('collects all failures and throws once', () => {
      const registry = new WildcardRegistry();
      registry.register({
        name: 'broken1',
        description: 'First broken wildcard',
        examples: ['not-a-number'],
        pattern: /^\d+$/,
      });
      registry.register({
        name: 'broken2',
        description: 'Second broken wildcard',
        examples: ['not-a-uuid'],
        pattern: /^[0-9a-f]{8}-/,
      });
      try {
        registry.validate();
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).message).toContain('broken1');
        expect((e as ValidationError).message).toContain('broken2');
      }
    });
  });

  describe('resolve', () => {
    it('returns the registered wildcard by name', () => {
      const registry = new WildcardRegistry();
      const wildcard = registry.resolve('*');
      expect(wildcard.name).toBe('*');
    });

    it('throws UnknownWildcardError for unregistered wildcard', () => {
      const registry = new WildcardRegistry();
      expect(() => registry.resolve('unknown')).toThrow(UnknownWildcardError);
    });
  });
});

describe('RegisteredWildcard', () => {
  describe('getPattern', () => {
    it('returns compiled pattern for static wildcard', () => {
      const registry = new WildcardRegistry();
      const wildcard = registry.resolve('word');
      expect(wildcard.getPattern()).toBeInstanceOf(RegExp);
    });

    it('returns fresh pattern for recompileOnMatch wildcard', () => {
      const registry = new WildcardRegistry();
      let counter = 0;
      registry.register({
        name: 'dynamic',
        description: 'Dynamic wildcard',
        patternFn: () => {
          counter++;
          return /dynamic/;
        },
        recompileOnMatch: true,
      });
      const wildcard = registry.resolve('dynamic');
      wildcard.getPattern();
      wildcard.getPattern();
      expect(counter).toBe(2);
    });

    it('caches pattern for non-recompileOnMatch dynamic wildcard', () => {
      const registry = new WildcardRegistry();
      let counter = 0;
      registry.register({
        name: 'cached',
        description: 'Cached dynamic wildcard',
        patternFn: () => {
          counter++;
          return /cached/;
        },
      });
      const wildcard = registry.resolve('cached');
      wildcard.getPattern();
      wildcard.getPattern();
      expect(counter).toBe(1);
    });
  });
});
