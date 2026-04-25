import { describe, expect, it } from 'vitest';
import { buildActions } from '../actions.js';

const config = {
  envs: {
    dev: { url: 'myinstance-dev', portal: 'esc' },
    prod: { url: 'myinstance' },
  },
  aliases: {
    ritm: 'sc_req_item',
  },
  filters: {
    active: 'active=true',
  },
};

const actions = buildActions(config);

describe('buildActions', () => {
  describe('openInstance', () => {
    it('returns the base URL for the env', () => {
      expect(actions.openInstance.resolve({ env: 'dev' })).toBe('https://myinstance-dev.service-now.com');
    });
  });

  describe('instanceLogin', () => {
    it('returns the login page URL', () => {
      expect(actions.instanceLogin.resolve({ env: 'prod' })).toBe('https://myinstance.service-now.com/login.do');
    });
  });

  describe('openPortal', () => {
    it('uses the configured portal suffix', () => {
      expect(actions.openPortal.resolve({ env: 'dev' })).toBe('https://myinstance-dev.service-now.com/esc');
    });

    it('defaults to sp when portal is not configured', () => {
      expect(actions.openPortal.resolve({ env: 'prod' })).toBe('https://myinstance.service-now.com/sp');
    });
  });

  describe('openTableList', () => {
    it('resolves a table alias before building the URL', () => {
      expect(actions.openTableList.resolve({ env: 'dev', table: 'ritm' })).toBe(
        'https://myinstance-dev.service-now.com/sc_req_item_list.do'
      );
    });

    it('passes through unaliased table names unchanged', () => {
      expect(actions.openTableList.resolve({ env: 'dev', table: 'incident' })).toBe(
        'https://myinstance-dev.service-now.com/incident_list.do'
      );
    });
  });

  describe('searchInstance', () => {
    it('URL-encodes the search text', () => {
      expect(actions.searchInstance.resolve({ env: 'dev', text: 'hello world' })).toBe(
        'https://myinstance-dev.service-now.com/textsearch_search.do?sysparm_search=hello%20world'
      );
    });
  });

  describe('openRecordById', () => {
    it('builds the record URL with sys_id', () => {
      expect(
        actions.openRecordById.resolve({
          env: 'dev',
          table: 'incident',
          sys_id: 'abc1234567890abc1234567890abc123',
        })
      ).toBe('https://myinstance-dev.service-now.com/incident.do?sys_id=abc1234567890abc1234567890abc123');
    });
  });

  describe('searchTableByFilter', () => {
    it('resolves a filter alias and URL-encodes the query', () => {
      expect(actions.searchTableByFilter.resolve({ env: 'dev', table: 'incident', filter: 'active' })).toBe(
        'https://myinstance-dev.service-now.com/incident_list.do?sysparm_query=active%3Dtrue'
      );
    });

    it('passes through unaliased filter values unchanged', () => {
      expect(actions.searchTableByFilter.resolve({ env: 'dev', table: 'incident', filter: 'state=1' })).toBe(
        'https://myinstance-dev.service-now.com/incident_list.do?sysparm_query=state%3D1'
      );
    });
  });

  describe('openRecordForm', () => {
    it('returns base URL when query is empty', () => {
      expect(actions.openRecordForm.resolve({ env: 'dev', table: 'incident', query: '' })).toBe(
        'https://myinstance-dev.service-now.com/incident.do'
      );
    });

    it('appends sysparm_query when query is provided', () => {
      expect(actions.openRecordForm.resolve({ env: 'dev', table: 'incident', query: 'active=true' })).toBe(
        'https://myinstance-dev.service-now.com/incident.do?sysparm_query=active%3Dtrue'
      );
    });
  });
});
