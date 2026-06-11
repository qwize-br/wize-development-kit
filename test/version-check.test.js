// Tests for tools/installer/version-check.js — cache reads, semver comparison,
// fetch-timeout safety, hint printing. We stub global.fetch to keep tests
// hermetic (no network).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const modulePath = path.join(KIT, 'tools/installer/version-check.js');

function freshModule() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function withTempCacheHome(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-vc-'));
  const hadOrig = Object.hasOwn(process.env, 'XDG_CACHE_HOME');
  const orig = process.env.XDG_CACHE_HOME;
  process.env.XDG_CACHE_HOME = dir;
  try {
    return fn(dir);
  } finally {
    if (hadOrig) process.env.XDG_CACHE_HOME = orig;
    else delete process.env.XDG_CACHE_HOME;     // never restore literal "undefined"
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('semverGreater handles basic cases', () => {
  const m = freshModule();
  assert.strictEqual(m.semverGreater('0.2.1', '0.2.0'), true);
  assert.strictEqual(m.semverGreater('0.2.0', '0.2.0'), false);
  assert.strictEqual(m.semverGreater('0.1.9', '0.2.0'), false);
  assert.strictEqual(m.semverGreater('1.0.0', '0.99.99'), true);
});

test('getLatestVersion returns the cached value when fresh', async () => {
  await withTempCacheHome(async (dir) => {
    const m = freshModule();
    m.writeCache({ version: '9.9.9', fetched_at: Date.now() });
    // Even if fetch would normally fire, the cache hit should short-circuit it.
    const orig = global.fetch;
    global.fetch = async () => { throw new Error('should not be called'); };
    try {
      const v = await m.getLatestVersion();
      assert.strictEqual(v, '9.9.9');
    } finally {
      global.fetch = orig;
    }
    assert.ok(fs.existsSync(m.cacheFile()));
  });
});

test('getLatestVersion ignores cache when skipCache=true and writes a fresh one', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    m.writeCache({ version: '0.1.0', fetched_at: Date.now() });
    const orig = global.fetch;
    global.fetch = async () => ({
      ok: true,
      async json() { return { 'dist-tags': { latest: '7.7.7' } }; }
    });
    try {
      const v = await m.getLatestVersion({ skipCache: true });
      assert.strictEqual(v, '7.7.7');
    } finally {
      global.fetch = orig;
    }
    // Cache must now hold the fresh value.
    const cached = m.readCache();
    assert.strictEqual(cached.version, '7.7.7');
  });
});

test('fetchLatestFromRegistry returns null on network failure', async () => {
  const m = freshModule();
  const orig = global.fetch;
  global.fetch = async () => { throw new Error('ECONNRESET'); };
  try {
    const v = await m.fetchLatestFromRegistry();
    assert.strictEqual(v, null);
  } finally {
    global.fetch = orig;
  }
});

test('fetchLatestFromRegistry returns null on a non-2xx response', async () => {
  const m = freshModule();
  const orig = global.fetch;
  global.fetch = async () => ({ ok: false, status: 503 });
  try {
    const v = await m.fetchLatestFromRegistry();
    assert.strictEqual(v, null);
  } finally {
    global.fetch = orig;
  }
});

test('printUpdateHintIfAny stays silent when versions match', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    m.writeCache({ version: '0.2.2', fetched_at: Date.now() });
    let said = '';
    await m.printUpdateHintIfAny('0.2.2', { log: (s) => { said += s + '\n'; }, isTTY: true });
    assert.strictEqual(said, '');
  });
});

test('printUpdateHintIfAny prints when registry is ahead', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    m.writeCache({ version: '0.3.0', fetched_at: Date.now() });
    let said = '';
    await m.printUpdateHintIfAny('0.2.2', { log: (s) => { said += s + '\n'; }, isTTY: true });
    assert.match(said, /Update available: wize-dev-kit 0\.2\.2 → 0\.3\.0/);
    assert.match(said, /npx wize-dev-kit@latest update/);
  });
});

test('printUpdateHintIfAny is silent when stdout is not a TTY', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    m.writeCache({ version: '9.9.9', fetched_at: Date.now() });
    let said = '';
    await m.printUpdateHintIfAny('0.2.2', { log: (s) => { said += s + '\n'; }, isTTY: false });
    assert.strictEqual(said, '');
  });
});

test('printUpdateHintIfAny respects WIZE_DISABLE_UPDATE_CHECK=1', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    m.writeCache({ version: '9.9.9', fetched_at: Date.now() });
    const orig = process.env.WIZE_DISABLE_UPDATE_CHECK;
    process.env.WIZE_DISABLE_UPDATE_CHECK = '1';
    try {
      let said = '';
      await m.printUpdateHintIfAny('0.2.2', { log: (s) => { said += s + '\n'; }, isTTY: true });
      assert.strictEqual(said, '');
    } finally {
      process.env.WIZE_DISABLE_UPDATE_CHECK = orig;
    }
  });
});
