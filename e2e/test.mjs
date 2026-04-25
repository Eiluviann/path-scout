/**
 * E2E HTTP assertions for path-scout.
 *
 * Expects the server to already be running (started by run.sh).
 * Uses fetch with redirect:'manual' so 302 responses are inspected
 * directly without following the Location header.
 */

const PORT = Number(process.env.PATH_SCOUT_PORT ?? 7801);
const BASE = `http://localhost:${PORT}`;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function get(path) {
  return fetch(`${BASE}${path}`, { redirect: 'manual' });
}

async function waitForServer(maxAttempts = 40, intervalMs = 250) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await fetch(`${BASE}/opensearch.xml`);
      return;
    } catch {
      if (attempt === maxAttempts - 1) {
        throw new Error(
          `Server at ${BASE} did not become ready after ${(maxAttempts * intervalMs) / 1000}s`,
        );
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

async function testRedirects() {
  console.log('\nRedirects');

  await test('top-level route → correct location', async () => {
    const res = await get('/go?q=gh');
    assert(res.status === 302, `Expected 302, got ${res.status}`);
    assert(
      res.headers.get('location') === 'https://github.com',
      `Expected https://github.com, got ${res.headers.get('location')}`,
    );
  });

  await test('nested route → correct location', async () => {
    const res = await get('/go?q=docs/api');
    assert(res.status === 302, `Expected 302, got ${res.status}`);
    assert(
      res.headers.get('location') === 'https://example.com/docs/api',
      `Expected https://example.com/docs/api, got ${res.headers.get('location')}`,
    );
  });

  await test('parent of nested route → correct location', async () => {
    const res = await get('/go?q=docs');
    assert(res.status === 302, `Expected 302, got ${res.status}`);
    assert(
      res.headers.get('location') === 'https://example.com/docs',
      `Expected https://example.com/docs, got ${res.headers.get('location')}`,
    );
  });

  await test('unknown route → no-match HTML page', async () => {
    const res = await get('/go?q=nonexistent');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const ct = res.headers.get('content-type') ?? '';
    assert(ct.includes('text/html'), `Expected text/html content type, got ${ct}`);
  });

  await test('empty query → no-match HTML page', async () => {
    const res = await get('/go');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const ct = res.headers.get('content-type') ?? '';
    assert(ct.includes('text/html'), `Expected text/html content type, got ${ct}`);
  });
}

async function testSuggest() {
  console.log('\nSuggest endpoint');

  await test('returns JSON array', async () => {
    const res = await get('/suggest?q=g');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const ct = res.headers.get('content-type') ?? '';
    assert(ct.includes('application/json'), `Expected JSON, got ${ct}`);
    const body = await res.json();
    assert(Array.isArray(body), `Expected array, got ${typeof body}`);
  });
}

async function testOpenSearch() {
  console.log('\nOpenSearch descriptor');

  await test('returns valid XML descriptor', async () => {
    const res = await get('/opensearch.xml');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const ct = res.headers.get('content-type') ?? '';
    assert(
      ct.includes('opensearchdescription+xml'),
      `Expected opensearchdescription+xml, got ${ct}`,
    );
    const body = await res.text();
    assert(body.includes('path-scout'), 'XML missing "path-scout"');
    assert(
      body.includes(`localhost:${PORT}/go`),
      `XML missing localhost:${PORT}/go`,
    );
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Waiting for server at ${BASE}…`);
  await waitForServer();
  console.log('Server ready.');

  await testRedirects();
  await testSuggest();
  await testOpenSearch();

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
