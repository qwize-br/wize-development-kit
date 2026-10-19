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
    await m.printUpdateHintIfAny('0.2.2', { log: (s) => { said += s + '\n'; }, isTTY: true, env: {} });
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

// ── stale-while-revalidate cache ──

const HOUR = 60 * 60 * 1000;

function rawCachePath(m) {
  return m.cacheFile();
}

function writeRaw(m, payload) {
  fs.mkdirSync(path.dirname(rawCachePath(m)), { recursive: true });
  fs.writeFileSync(rawCachePath(m), JSON.stringify(payload));
}

const readRaw = (m) => JSON.parse(fs.readFileSync(rawCachePath(m), 'utf-8'));

function spawnRecorder() {
  const calls = [];
  const spawn = (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    return { unref() { calls[calls.length - 1].unref = true; }, on() {} };
  };
  return { spawn, calls };
}

test('fetched_at drives the TTL: an old fetched_at with a fresh mtime is expired', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    writeRaw(m, { version: '1.0.0', fetched_at: Date.now() - 2 * HOUR });
    assert.ok(fs.statSync(rawCachePath(m)).mtimeMs > Date.now() - 5000, 'mtime is fresh');
    assert.strictEqual(m.readCache(), null);
    const orig = global.fetch;
    global.fetch = async () => ({ ok: true, async json() { return { 'dist-tags': { latest: '1.1.0' } }; } });
    try {
      assert.strictEqual(await m.getLatestVersion(), '1.1.0');
    } finally {
      global.fetch = orig;
    }
    const written = readRaw(m);
    assert.strictEqual(written.version, '1.1.0');
    assert.ok(Date.now() - written.fetched_at < 5000);
    assert.ok(written.attempted_at);
  });
});

test('a legacy payload without fetched_at falls back to the file mtime', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    writeRaw(m, { version: '2.0.0' });
    assert.strictEqual(m.readCache().version, '2.0.0');
    const old = new Date(Date.now() - 2 * HOUR);
    fs.utimesSync(rawCachePath(m), old, old);
    assert.strictEqual(m.readCache(), null);
    assert.strictEqual(m.getLatestNoWait({ spawn: spawnRecorder().spawn, env: { WIZE_NO_BG_REFRESH: '1' } }), '2.0.0');
  });
});

test('getLatestNoWait returns a stale value without fetching and spawns the refresher once', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    writeRaw(m, { version: '1.0.0', fetched_at: Date.now() - 3 * HOUR });
    const orig = global.fetch;
    global.fetch = async () => { throw new Error('should not be called'); };
    const rec = spawnRecorder();
    try {
      assert.strictEqual(m.getLatestNoWait({ spawn: rec.spawn, env: {} }), '1.0.0');
      assert.strictEqual(rec.calls.length, 1);
      assert.strictEqual(rec.calls[0].cmd, process.execPath);
      assert.deepStrictEqual(rec.calls[0].args.slice(1), ['version-check', '--refresh', '--quiet']);
      assert.ok(rec.calls[0].args[0].endsWith(path.join('tools', 'installer', 'wize-cli.js')));
      assert.strictEqual(rec.calls[0].opts.detached, true);
      assert.strictEqual(rec.calls[0].opts.stdio, 'ignore');
      assert.strictEqual(rec.calls[0].unref, true);

      // attempted_at was stamped first and the cached answer and its age survive.
      const stamped = readRaw(m);
      assert.strictEqual(stamped.version, '1.0.0');
      assert.ok(Date.now() - stamped.attempted_at < 5000);
      assert.ok(Date.now() - stamped.fetched_at > 2 * HOUR);

      // Throttled: a second call inside 10 minutes does not spawn again.
      assert.strictEqual(m.getLatestNoWait({ spawn: rec.spawn, env: {} }), '1.0.0');
      assert.strictEqual(rec.calls.length, 1);

      // Past the throttle window it tries again.
      writeRaw(m, { ...stamped, attempted_at: Date.now() - 11 * 60 * 1000 });
      m.getLatestNoWait({ spawn: rec.spawn, env: {} });
      assert.strictEqual(rec.calls.length, 2);
    } finally {
      global.fetch = orig;
    }
  });
});

test('getLatestNoWait does not spawn while the cache is fresh', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    m.writeCache({ version: '1.0.0', fetched_at: Date.now() });
    const rec = spawnRecorder();
    assert.strictEqual(m.getLatestNoWait({ spawn: rec.spawn, env: {} }), '1.0.0');
    assert.strictEqual(rec.calls.length, 0);
  });
});

test('getLatestNoWait with no cache returns null and starts one refresher', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    const rec = spawnRecorder();
    assert.strictEqual(m.getLatestNoWait({ spawn: rec.spawn, env: {} }), null);
    assert.strictEqual(rec.calls.length, 1);
    assert.strictEqual(m.getLatestNoWait({ spawn: rec.spawn, env: {} }), null);
    assert.strictEqual(rec.calls.length, 1, 'the stamped attempt throttles the next call');
  });
});

test('getLatestNoWait never spawns with WIZE_DISABLE_UPDATE_CHECK, CI or WIZE_NO_BG_REFRESH', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    writeRaw(m, { version: '1.0.0', fetched_at: Date.now() - 3 * HOUR });
    for (const env of [{ WIZE_DISABLE_UPDATE_CHECK: '1' }, { CI: 'true' }, { CI: '1' }, { WIZE_NO_BG_REFRESH: '1' }]) {
      const rec = spawnRecorder();
      assert.strictEqual(m.getLatestNoWait({ spawn: rec.spawn, env }), '1.0.0');
      assert.strictEqual(rec.calls.length, 0, JSON.stringify(env));
    }
    const rec = spawnRecorder();
    m.getLatestNoWait({ spawn: rec.spawn, env: { CI: 'false' } });
    assert.strictEqual(rec.calls.length, 1, 'CI=false is not CI');
  });
});

test('a spawn that throws never disturbs getLatestNoWait', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    writeRaw(m, { version: '1.0.0', fetched_at: Date.now() - 3 * HOUR });
    const spawn = () => { throw new Error('EAGAIN'); };
    assert.strictEqual(m.getLatestNoWait({ spawn, env: {} }), '1.0.0');
  });
});

test('a failed fetch writes attempted_at and keeps the previous version and its age', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    const fetchedAt = Date.now() - 2 * HOUR;
    writeRaw(m, { version: '1.0.0', fetched_at: fetchedAt });
    const orig = global.fetch;
    global.fetch = async () => { throw new Error('offline'); };
    try {
      assert.strictEqual(await m.getLatestVersion(), null, 'getLatestVersion keeps its null-on-failure contract');
      const r = await m.resolveLatest();
      assert.deepStrictEqual(r, { latest: '1.0.0', source: 'cache', stale: true });
    } finally {
      global.fetch = orig;
    }
    const after = readRaw(m);
    assert.strictEqual(after.version, '1.0.0');
    assert.strictEqual(after.fetched_at, fetchedAt);
    assert.ok(Date.now() - after.attempted_at < 5000);
  });
});

test('printUpdateHintIfAny never waits on a hanging registry', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    writeRaw(m, { version: '0.9.0', fetched_at: Date.now() - 3 * HOUR });
    const orig = global.fetch;
    global.fetch = () => new Promise(() => {});
    const rec = spawnRecorder();
    let said = '';
    const t0 = Date.now();
    try {
      await m.printUpdateHintIfAny('0.5.0', { log: (x) => { said += x + '\n'; }, isTTY: true, env: {}, argv: [], spawn: rec.spawn });
    } finally {
      global.fetch = orig;
    }
    assert.ok(Date.now() - t0 < 500, 'returned without waiting');
    assert.match(said, /Update available: wize-dev-kit 0\.5\.0 → 0\.9\.0/);
    assert.strictEqual(rec.calls.length, 1);
  });
});

test('printUpdateHintIfAny is silent with --json in argv and in CI', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    m.writeCache({ version: '9.9.9', fetched_at: Date.now() });
    let said = '';
    const log = (x) => { said += x; };
    await m.printUpdateHintIfAny('0.2.2', { log, isTTY: true, env: {}, argv: ['list', '--json'] });
    await m.printUpdateHintIfAny('0.2.2', { log, isTTY: true, env: { CI: 'true' }, argv: [] });
    assert.strictEqual(said, '');
  });
});

test('printUpdateHintIfAny puts the project-pin line before the registry line', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    m.writeCache({ version: '0.9.0', fetched_at: Date.now() });
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-vc-proj-'));
    fs.mkdirSync(path.join(root, '.wize/config'), { recursive: true });
    fs.writeFileSync(path.join(root, '.wize/config/project.toml'), '[project]\nkit_version = "0.3.0"\n');
    const lines = [];
    await m.printUpdateHintIfAny('0.5.0', { log: (x) => lines.push(x), isTTY: true, env: {}, argv: [], projectRoot: root });
    const text = lines.join('\n');
    const pinAt = text.indexOf('project pinned 0.3.0, kit 0.5.0 -> run npx wize-dev-kit@latest update (or /wize-update)');
    const regAt = text.indexOf('Update available');
    assert.ok(pinAt >= 0, text);
    assert.ok(regAt > pinAt, 'registry line comes second');

    // A project on the running kit prints no project line.
    fs.writeFileSync(path.join(root, '.wize/config/project.toml'), '[project]\nkit_version = "0.5.0"\n');
    const same = [];
    await m.printUpdateHintIfAny('0.5.0', { log: (x) => same.push(x), isTTY: true, env: {}, argv: [], projectRoot: root });
    assert.ok(!same.join('\n').includes('project pinned'));
  });
});

test('getVersionCheckDetailed reports where the answer came from', async () => {
  await withTempCacheHome(async () => {
    const m = freshModule();
    const orig = global.fetch;
    try {
      global.fetch = async () => { throw new Error('offline'); };
      assert.deepStrictEqual(await m.getVersionCheckDetailed('1.0.0'), { installed: '1.0.0', latest: null, updateAvailable: false, latest_source: 'none' });
      m.writeCache({ version: '2.0.0', fetched_at: Date.now() });
      assert.strictEqual((await m.getVersionCheckDetailed('1.0.0')).latest_source, 'cache');
      global.fetch = async () => ({ ok: true, async json() { return { 'dist-tags': { latest: '3.0.0' } }; } });
      const forced = await m.getVersionCheckDetailed('1.0.0', { skipCache: true });
      assert.strictEqual(forced.latest, '3.0.0');
      assert.strictEqual(forced.latest_source, 'network');
      // Offline again with a stale cache: the old answer, labelled cache.
      writeRaw(m, { version: '3.0.0', fetched_at: Date.now() - 2 * HOUR });
      global.fetch = async () => { throw new Error('offline'); };
      const offline = await m.getVersionCheckDetailed('1.0.0');
      assert.strictEqual(offline.latest, '3.0.0');
      assert.strictEqual(offline.latest_source, 'cache');
      assert.strictEqual(offline.updateAvailable, true);
    } finally {
      global.fetch = orig;
    }
  });
});
