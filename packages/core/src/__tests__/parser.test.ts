import { describe, expect, it } from 'vitest';
import { parseQuery } from '../parser.js';

describe('parseQuery', () => {
  it('splits a simple path into segments', () => {
    expect(parseQuery('dev/incidents')).toEqual(['dev', 'incidents']);
  });

  it('handles a single segment', () => {
    expect(parseQuery('dev')).toEqual(['dev']);
  });

  it('returns empty array for empty string', () => {
    expect(parseQuery('')).toEqual([]);
  });

  it('trims leading and trailing whitespace', () => {
    expect(parseQuery('  dev/incidents  ')).toEqual(['dev', 'incidents']);
  });

  it('filters out empty segments from double slashes', () => {
    expect(parseQuery('dev//incidents')).toEqual(['dev', 'incidents']);
  });

  it('passes through last segment modifiers as-is', () => {
    expect(parseQuery('dev/sc_req_item?active=true')).toEqual(['dev', 'sc_req_item?active=true']);
  });

  it('passes through free text in last segment as-is', () => {
    expect(parseQuery('dev/sc_cat_item some text here')).toEqual(['dev', 'sc_cat_item some text here']);
  });
});
