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

async function withTempCacheHome(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-vc-'));
  const hadOrig = Object.hasOwn(process.env, 'XDG_CACHE_HOME');
  const orig = process.env.XDG_CACHE_HOME;
  process.env.XDG_CACHE_HOME = dir;
  try {
    // Must be `await` (not `return`) — otherwise the finally below restores
    // env before fn's promise resolves, and writeCache inside fn lands in the
    // real ~/.cache/wize-dev-kit instead of the temp dir.
    return await fn(dir);
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
    // The cache hit must short-circuit the fetch — if fetch is even called,
    // it throws (and the function silently returns null, which we'd catch).
    const orig = global.fetch;
    global.fetch = async () => { throw new Error('should not be called'); };
    try {
      const v = await m.getLatestVersion();
      assert.strictEqual(v, '9.9.9', 'cached value should win when fresh');
    } finally {
      global.fetch = orig;
    }
    // Don't assert existsSync — some CI filesystems return stale negative
    // results just after a write; readCache() is the semantically-meaningful
    // confirmation that the value is persisted and re-readable.
    const persisted = m.readCache();
    assert.ok(persisted, 'cache should be readable after the write');
    assert.strictEqual(persisted.version, '9.9.9');
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

// ── getVersionCheckResult ──
//
// Unlike printUpdateHintIfAny (opportunistic, TTY-gated hint for other
// commands), this is the explicit, always-answers data function behind the
// `version-check` CLI command — the thing an AI agent shells out to from a
// skill instruction, where stdout is never a TTY. It must never gate on
// isTTY and must always resolve to a plain object, never throw.

test('getVersionCheckResult reports updateAvailable when the registry is ahead', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    m.writeCache({ version: '0.9.0', fetched_at: Date.now() });
    const r = await m.getVersionCheckResult('0.5.0');
    assert.deepStrictEqual(r, { installed: '0.5.0', latest: '0.9.0', updateAvailable: true });
  });
});

test('getVersionCheckResult reports no update when versions match', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    m.writeCache({ version: '0.5.0', fetched_at: Date.now() });
    const r = await m.getVersionCheckResult('0.5.0');
    assert.deepStrictEqual(r, { installed: '0.5.0', latest: '0.5.0', updateAvailable: false });
  });
});

test('getVersionCheckResult degrades to latest:null when offline, never throws', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    const orig = global.fetch;
    global.fetch = async () => { throw new Error('offline'); };
    try {
      const r = await m.getVersionCheckResult('0.5.0');
      assert.deepStrictEqual(r, { installed: '0.5.0', latest: null, updateAvailable: false });
    } finally {
      global.fetch = orig;
    }
  });
});

test('getVersionCheckResult respects WIZE_DISABLE_UPDATE_CHECK=1 and never touches the network', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    const origEnv = process.env.WIZE_DISABLE_UPDATE_CHECK;
    const origFetch = global.fetch;
    process.env.WIZE_DISABLE_UPDATE_CHECK = '1';
    global.fetch = async () => { throw new Error('should not be called'); };
    try {
      const r = await m.getVersionCheckResult('0.5.0');
      assert.deepStrictEqual(r, { installed: '0.5.0', latest: null, updateAvailable: false, disabled: true });
    } finally {
      process.env.WIZE_DISABLE_UPDATE_CHECK = origEnv;
      global.fetch = origFetch;
    }
  });
});

test('getVersionCheckResult uses the cache and never calls fetch when the cache is fresh', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    m.writeCache({ version: '1.2.3', fetched_at: Date.now() });
    const orig = global.fetch;
    global.fetch = async () => { throw new Error('should not be called'); };
    try {
      const r = await m.getVersionCheckResult('1.0.0');
      assert.strictEqual(r.latest, '1.2.3');
      assert.strictEqual(r.updateAvailable, true);
    } finally {
      global.fetch = orig;
    }
  });
});
