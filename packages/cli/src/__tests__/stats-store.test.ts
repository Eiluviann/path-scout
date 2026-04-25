import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StatsStore } from '../stats/index.js';

describe('StatsStore', () => {
  let store: StatsStore;

  beforeEach(() => {
    store = new StatsStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  describe('record', () => {
    it('records a matched stat', () => {
      store.record({
        query: 'dev/incident',
        matched: true,
        route: 'dev/incident',
        timestamp: new Date().toISOString(),
      });

      const suggestions = store.suggest('dev');
      expect(suggestions).toContain('dev/incident');
    });

    it('records an unmatched stat', () => {
      store.record({
        query: 'unknown/path',
        matched: false,
        timestamp: new Date().toISOString(),
      });

      const suggestions = store.suggest('unknown');
      expect(suggestions).not.toContain('unknown/path');
    });

    it('records a stat with a user', () => {
      store.record({
        query: 'dev/incident',
        user: 'aurelio',
        matched: true,
        route: 'dev/incident',
        timestamp: new Date().toISOString(),
      });

      const suggestions = store.suggest('dev', 'aurelio');
      expect(suggestions).toContain('dev/incident');
    });
  });

  describe('suggest', () => {
    beforeEach(() => {
      const timestamp = new Date().toISOString();
      store.record({ query: 'dev/incident', matched: true, route: 'dev/incident', timestamp });
      store.record({ query: 'dev/incident', matched: true, route: 'dev/incident', timestamp });
      store.record({ query: 'dev/problem', matched: true, route: 'dev/problem', timestamp });
      store.record({ query: 'prod/incident', matched: true, route: 'prod/incident', timestamp });
    });

    it('returns suggestions matching partial query', () => {
      const suggestions = store.suggest('dev');
      expect(suggestions).toContain('dev/incident');
      expect(suggestions).toContain('dev/problem');
      expect(suggestions).not.toContain('prod/incident');
    });

    it('orders suggestions by frequency', () => {
      const suggestions = store.suggest('dev');
      expect(suggestions[0]).toBe('dev/incident');
      expect(suggestions[1]).toBe('dev/problem');
    });

    it('filters suggestions by user', () => {
      const timestamp = new Date().toISOString();
      store.record({ query: 'dev/change', user: 'aurelio', matched: true, route: 'dev/change', timestamp });

      const userSuggestions = store.suggest('dev', 'aurelio');
      expect(userSuggestions).toContain('dev/change');

      const globalSuggestions = store.suggest('dev');
      expect(globalSuggestions).toContain('dev/change');
    });

    it('respects the limit parameter', () => {
      const timestamp = new Date().toISOString();
      for (let i = 0; i < 20; i++) {
        store.record({ query: `dev/table${i}`, matched: true, route: `dev/table${i}`, timestamp });
      }

      const suggestions = store.suggest('dev', undefined, 5);
      expect(suggestions).toHaveLength(5);
    });

    it('returns empty array when no matches found', () => {
      const suggestions = store.suggest('nonexistent');
      expect(suggestions).toEqual([]);
    });

    it('does not include unmatched queries in suggestions', () => {
      store.record({
        query: 'dev/unknown',
        matched: false,
        timestamp: new Date().toISOString(),
      });

      const suggestions = store.suggest('dev/unknown');
      expect(suggestions).not.toContain('dev/unknown');
    });
  });

  describe('close', () => {
    it('closes the database without error', () => {
      expect(() => store.close()).not.toThrow();
    });
  });
});
