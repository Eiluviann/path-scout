import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Trie, WildcardRegistry } from '@path-scout/core';
import type { ActionDefinition, PathScoutConfig, RouteConfig } from '@path-scout/core';
import { Server } from '../server/index.js';
import { StatsStore } from '../stats/index.js';

const PORT = 7799;
const BASE = `http://localhost:${PORT}`;

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const redirectTo = (url: string): ActionDefinition => ({
  name: 'redirect',
  description: 'Redirect to a fixed URL',
  resolve: () => url,
});

const routes: RouteConfig = {
  example: {
    _action: redirectTo('https://example.com'),
    _args: {},
  },
  docs: {
    _action: redirectTo('https://docs.example.com'),
    _args: {},
    api: {
      _action: redirectTo('https://docs.example.com/api'),
      _args: {},
    },
  },
};

const config: PathScoutConfig = { port: PORT, routes };

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

let server: Server;
let stats: StatsStore;

beforeAll(() => {
  const registry = new WildcardRegistry();
  const trie = new Trie();
  trie.build(routes, registry);

  stats = new StatsStore(':memory:');
  server = new Server({ trie, stats, config });
  server.start();
});

afterAll(async () => {
  await server.stop();
  stats.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function get(path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, { redirect: 'manual' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /go', () => {
  it('redirects a known top-level route', async () => {
    const res = await get('/go?q=example');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://example.com');
  });

  it('redirects a known nested route', async () => {
    const res = await get('/go?q=docs/api');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://docs.example.com/api');
  });

  it('redirects a parent of a nested route', async () => {
    const res = await get('/go?q=docs');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://docs.example.com');
  });

  it('returns an HTML no-match page for an unknown route', async () => {
    const res = await get('/go?q=unknown');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('returns an HTML no-match page when q is empty', async () => {
    const res = await get('/go');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });
});

describe('GET /suggest', () => {
  it('returns JSON suggestions array', async () => {
    const res = await get('/suggest?q=ex');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('GET /opensearch.xml', () => {
  it('returns valid OpenSearch descriptor', async () => {
    const res = await get('/opensearch.xml');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('opensearchdescription+xml');
    const body = await res.text();
    expect(body).toContain(`localhost:${PORT}/go`);
    expect(body).toContain('path-scout');
  });
});
