import { describe, it, expect } from 'vitest';
import { interpolate } from '../interpolation.js';
import { PathScoutError } from '../errors.js';

describe('interpolate', () => {
  describe('static values', () => {
    it('passes through static values as-is', () => {
      const result = interpolate(
        { filter: 'active=true' },
        {}
      );
      expect(result).toEqual({ filter: 'active=true' });
    });

    it('handles multiple static values', () => {
      const result = interpolate(
        { filter: 'active=true', category: 'software' },
        {}
      );
      expect(result).toEqual({ filter: 'active=true', category: 'software' });
    });
  });

  describe('wildcard references', () => {
    it('resolves a single wildcard reference', () => {
      const result = interpolate(
        { env: '{{env}}' },
        { env: 'dev' }
      );
      expect(result).toEqual({ env: 'dev' });
    });

    it('resolves multiple wildcard references', () => {
      const result = interpolate(
        { env: '{{env}}', table: '{{sn:table}}' },
        { env: 'dev', 'sn:table': 'sc_req_item' }
      );
      expect(result).toEqual({ env: 'dev', table: 'sc_req_item' });
    });

    it('resolves embedded wildcard references', () => {
      const result = interpolate(
        { url: 'https://{{env}}.service-now.com' },
        { env: 'dev' }
      );
      expect(result).toEqual({ url: 'https://dev.service-now.com' });
    });

    it('resolves indexed wildcard references', () => {
      const result = interpolate(
        { org: '{{word[0]}}', repo: '{{word[1]}}' },
        { 'word[0]': 'my-org', 'word[1]': 'my-repo' }
      );
      expect(result).toEqual({ org: 'my-org', repo: 'my-repo' });
    });
  });

  describe('mixed args', () => {
    it('resolves a mix of static and wildcard values', () => {
      const result = interpolate(
        { env: '{{env}}', table: '{{sn:table}}', filter: 'active=true' },
        { env: 'dev', 'sn:table': 'sc_req_item' }
      );
      expect(result).toEqual({
        env: 'dev',
        table: 'sc_req_item',
        filter: 'active=true',
      });
    });
  });

  describe('error handling', () => {
    it('throws PathScoutError for unresolved wildcard reference', () => {
      expect(() => interpolate(
        { env: '{{env}}' },
        {}
      )).toThrow(PathScoutError);
    });

    it('throws with a descriptive message', () => {
      expect(() => interpolate(
        { env: '{{env}}' },
        {}
      )).toThrow('env');
    });
  });

  describe('empty args', () => {
    it('returns empty object for empty args', () => {
      const result = interpolate({}, {});
      expect(result).toEqual({});
    });
  });
});
