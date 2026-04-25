import { isStaticWildcard } from '@path-scout/core';
import { assert, describe, expect, it } from 'vitest';
import { buildWildcards } from '../wildcards.js';

const baseConfig = {
  envs: {
    dev: { url: 'myinstance-dev', portal: 'sp' },
    prod: { url: 'myinstance' },
  },
};

describe('buildWildcards', () => {
  describe('validation', () => {
    it('throws when envs is empty', () => {
      expect(() => buildWildcards({ envs: {} })).toThrow(
        'ServiceNowPlugin: envs must contain at least one environment.'
      );
    });
  });

  describe('env wildcard', () => {
    it('is always included', () => {
      const wildcards = buildWildcards(baseConfig);
      expect(wildcards.find((w) => w.name === 'env')).toBeDefined();
    });

    it('pattern matches configured env keys', () => {
      const wildcards = buildWildcards(baseConfig);
      const env = wildcards.find((w) => w.name === 'env');
      assert(env !== undefined);
      assert(isStaticWildcard(env));
      const full = new RegExp(`^(?:${env.pattern.source})$`);
      expect(full.test('dev')).toBe(true);
      expect(full.test('prod')).toBe(true);
    });

    it('pattern rejects unknown env keys', () => {
      const wildcards = buildWildcards(baseConfig);
      const env = wildcards.find((w) => w.name === 'env');
      assert(env !== undefined);
      assert(isStaticWildcard(env));
      const full = new RegExp(`^(?:${env.pattern.source})$`);
      expect(full.test('staging')).toBe(false);
      expect(full.test('')).toBe(false);
    });

    it('escapes regex special characters in env keys', () => {
      const wildcards = buildWildcards({
        envs: { 'dev.test': { url: 'myinstance-dev' } },
      });
      const env = wildcards.find((w) => w.name === 'env');
      assert(env !== undefined);
      assert(isStaticWildcard(env));
      const full = new RegExp(`^(?:${env.pattern.source})$`);
      expect(full.test('dev.test')).toBe(true);
      expect(full.test('devXtest')).toBe(false);
    });
  });

  describe('table wildcard', () => {
    it('is always included', () => {
      const wildcards = buildWildcards(baseConfig);
      expect(wildcards.find((w) => w.name === 'table')).toBeDefined();
    });

    it('pattern matches valid table names', () => {
      const wildcards = buildWildcards(baseConfig);
      const table = wildcards.find((w) => w.name === 'table');
      assert(table !== undefined);
      assert(isStaticWildcard(table));
      const full = new RegExp(`^(?:${table.pattern.source})$`);
      expect(full.test('incident')).toBe(true);
      expect(full.test('sc_req_item')).toBe(true);
      expect(full.test('sys_user')).toBe(true);
    });

    it('pattern rejects table names starting with a number', () => {
      const wildcards = buildWildcards(baseConfig);
      const table = wildcards.find((w) => w.name === 'table');
      assert(table !== undefined);
      assert(isStaticWildcard(table));
      const full = new RegExp(`^(?:${table.pattern.source})$`);
      expect(full.test('1incident')).toBe(false);
    });
  });

  describe('sys_id wildcard', () => {
    it('is always included', () => {
      const wildcards = buildWildcards(baseConfig);
      expect(wildcards.find((w) => w.name === 'sys_id')).toBeDefined();
    });

    it('pattern matches a 32-char hex string', () => {
      const wildcards = buildWildcards(baseConfig);
      const sysId = wildcards.find((w) => w.name === 'sys_id');
      assert(sysId !== undefined);
      assert(isStaticWildcard(sysId));
      const full = new RegExp(`^(?:${sysId.pattern.source})$`);
      expect(full.test('abc1234567890abc1234567890abc123')).toBe(true);
    });

    it('pattern rejects strings that are not 32 hex chars', () => {
      const wildcards = buildWildcards(baseConfig);
      const sysId = wildcards.find((w) => w.name === 'sys_id');
      assert(sysId !== undefined);
      assert(isStaticWildcard(sysId));
      const full = new RegExp(`^(?:${sysId.pattern.source})$`);
      expect(full.test('tooshort')).toBe(false);
      expect(full.test('abc1234567890abc1234567890abc123Z')).toBe(false);
    });
  });

  describe('filter wildcard', () => {
    it('is not included when filters is undefined', () => {
      const wildcards = buildWildcards(baseConfig);
      expect(wildcards.find((w) => w.name === 'filter')).toBeUndefined();
    });

    it('is not included when filters is empty', () => {
      const wildcards = buildWildcards({ ...baseConfig, filters: {} });
      expect(wildcards.find((w) => w.name === 'filter')).toBeUndefined();
    });

    it('is included when filters are configured', () => {
      const wildcards = buildWildcards({
        ...baseConfig,
        filters: { active: 'active=true', mine: 'assigned_to=me' },
      });
      expect(wildcards.find((w) => w.name === 'filter')).toBeDefined();
    });

    it('pattern matches configured filter keys', () => {
      const wildcards = buildWildcards({
        ...baseConfig,
        filters: { active: 'active=true', mine: 'assigned_to=me' },
      });
      const filter = wildcards.find((w) => w.name === 'filter');
      assert(filter !== undefined);
      assert(isStaticWildcard(filter));
      const full = new RegExp(`^(?:${filter.pattern.source})$`);
      expect(full.test('active')).toBe(true);
      expect(full.test('mine')).toBe(true);
      expect(full.test('unknown')).toBe(false);
    });
  });
});
