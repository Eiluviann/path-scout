import { describe, it, expect, beforeEach} from 'vitest';
import { WildcardRegistry } from '../wildcard-registry.js';
import { parseSegmentKey, compileSegmentPattern } from '../utils/segment-parser.js';

describe('parseSegmentKey', () => {
  let registry: WildcardRegistry;

  beforeEach(() => {
    registry = new WildcardRegistry();
  });

  describe('pure literal segments', () => {
    it('returns a single literal token for a plain string', () => {
      const tokens = parseSegmentKey('dev', registry);
      expect(tokens).toEqual([{ type: 'literal', value: 'dev' }]);
    });

    it('handles segments with special characters', () => {
      const tokens = parseSegmentKey('sc_req_item', registry);
      expect(tokens).toEqual([{ type: 'literal', value: 'sc_req_item' }]);
    });
  });

  describe('pure wildcard segments', () => {
    it('returns a single wildcard token for a core wildcard', () => {
      const tokens = parseSegmentKey('{{*}}', registry);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('wildcard');
    });

    it('returns a single wildcard token for a named core wildcard', () => {
      const tokens = parseSegmentKey('{{word}}', registry);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('wildcard');
      if (tokens[0].type === 'wildcard') {
        expect(tokens[0].wildcard.name).toBe('word');
      }
    });

    it('returns a wildcard token for a plugin wildcard', () => {
      registry.registerPlugin({
        namespace: 'sn',
        wildcards: [{ name: 'env', description: 'Environment', pattern: /dev|test|prod/ }],
        actions: {},
      });
      const tokens = parseSegmentKey('{{sn:env}}', registry);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('wildcard');
      if (tokens[0].type === 'wildcard') {
        expect(tokens[0].wildcard.name).toBe('sn:env');
      }
    });

    it('throws UnknownWildcardError for unregistered wildcard', () => {
      expect(() => parseSegmentKey('{{unknown}}', registry)).toThrow();
    });
  });

  describe('mixed segments', () => {
    it('parses a prefix literal and wildcard', () => {
      const tokens = parseSegmentKey('v{{word}}', registry);
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toEqual({ type: 'literal', value: 'v' });
      expect(tokens[1].type).toBe('wildcard');
    });

    it('parses a wildcard with a separator and another wildcard', () => {
      const tokens = parseSegmentKey('{{word}}-{{word}}', registry);
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe('wildcard');
      expect(tokens[1]).toEqual({ type: 'literal', value: '-' });
      expect(tokens[2].type).toBe('wildcard');
    });

    it('parses literal prefix, wildcard, literal suffix', () => {
      const tokens = parseSegmentKey('v{{word}}v', registry);
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: 'literal', value: 'v' });
      expect(tokens[1].type).toBe('wildcard');
      expect(tokens[2]).toEqual({ type: 'literal', value: 'v' });
    });
  });
});

describe('compileSegmentPattern', () => {
  let registry: WildcardRegistry;

  beforeEach(() => {
    registry = new WildcardRegistry();
  });

  it('compiles a pure literal pattern', () => {
    const tokens = parseSegmentKey('dev', registry);
    const regex = compileSegmentPattern(tokens);
    expect(regex.test('dev')).toBe(true);
    expect(regex.test('prod')).toBe(false);
  });

  it('compiles a pure wildcard pattern', () => {
    const tokens = parseSegmentKey('{{word}}', registry);
    const regex = compileSegmentPattern(tokens);
    expect(regex.test('hello')).toBe(true);
    expect(regex.test('hello world')).toBe(false);
  });

  it('compiles a mixed segment pattern', () => {
    const tokens = parseSegmentKey('v{{word}}', registry);
    const regex = compileSegmentPattern(tokens);
    expect(regex.test('v1')).toBe(true);
    expect(regex.test('1')).toBe(false);
  });

  it('correctly captures wildcard groups', () => {
    const tokens = parseSegmentKey('{{word}}-{{word}}', registry);
    const regex = compileSegmentPattern(tokens);
    const match = regex.exec('hello-world');
    expect(match).not.toBeNull();
    expect(match![1]).toBe('hello');
    expect(match![2]).toBe('world');
  });
});
