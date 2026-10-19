// Best-effort, non-blocking npm registry check for "is there a newer wize-dev-kit
// version than the one I'm running?". Designed so the CLI can call it from
// `list` / `agent list` / `help` and print a single hint at the top, without
// ever blocking the command if the network is slow, the user is offline, or
// the registry is misbehaving.
//
// Strategy:
//   - Cache the registry answer in $XDG_CACHE_HOME (or ~/.cache) as
//     { version, fetched_at, attempted_at }. The 1h TTL runs from fetched_at.
//   - Hints never wait on the network: getLatestNoWait() returns whatever is
//     cached (any age) and, when it is stale, starts a detached refresher.
//   - The explicit `version-check` command resolves via fetch with a 1.5s
//     timeout. Failure is silent and falls back to the cache.
//   - Compare with the kit version baked into the running CLI.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const { semverGreater, compareVersions } = require('./semver.js');

const CACHE_TTL_MS = 60 * 60 * 1000;       // 1h
const ATTEMPT_THROTTLE_MS = 10 * 60 * 1000; // 10 min between background refresh attempts
const NETWORK_TIMEOUT_MS = 1500;

function cacheFile() {
  const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(base, 'wize-dev-kit', 'registry-version.json');
}

function toMs(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') { const t = Date.parse(v); if (Number.isFinite(t)) return t; }
  return null;
}

// The cache entry regardless of age: { version, fetchedAt, attemptedAt }.
// fetched_at drives the TTL; the file mtime only stands in for a legacy payload
// that has none. Null when the file is missing or unreadable.
function readCacheEntry() {
  const f = cacheFile();
  try {
    const stat = fs.statSync(f);
    const payload = JSON.parse(fs.readFileSync(f, 'utf-8'));
    if (!payload || typeof payload !== 'object') return null;
    const fetchedAt = toMs(payload.fetched_at);
    return {
      version: typeof payload.version === 'string' && payload.version ? payload.version : null,
      fetchedAt: fetchedAt === null ? stat.mtimeMs : fetchedAt,
      attemptedAt: toMs(payload.attempted_at) || 0,
      payload
    };
  } catch (_) {
    return null;
  }
}

function isFresh(entry, now = Date.now()) {
  return !!(entry && entry.version && now - entry.fetchedAt <= CACHE_TTL_MS);
}

// Returns the cached payload only while it is fresh.
function readCache() {
  const entry = readCacheEntry();
  return isFresh(entry) ? entry.payload : null;
}

function writeCache(payload) {
  const f = cacheFile();
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(payload), 'utf-8');
  } catch (_) { /* cache failure is harmless */ }
}

// Records a refresh attempt without touching the cached answer or its age.
function markAttempted(now = Date.now()) {
  const entry = readCacheEntry();
  writeCache({
    version: entry ? entry.version : null,
    fetched_at: entry ? entry.fetchedAt : 0,
    attempted_at: now
  });
}

// { latest, versions } from the registry packument, or null on any failure.
// `versions` lists every published version (null when the packument has none).
async function fetchRegistryInfo() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NETWORK_TIMEOUT_MS);
  try {
    const res = await fetch('https://registry.npmjs.org/wize-dev-kit', {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.npm.install-v1+json' }
    });
    if (!res.ok) return null;
    const body = await res.json();
    const latest = body && body['dist-tags'] && body['dist-tags'].latest;
    if (typeof latest !== 'string') return null;
    const versions = body.versions && typeof body.versions === 'object' ? Object.keys(body.versions) : null;
    return { latest, versions };
  } catch (_) {
    return null;   // any error → silent fallback
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLatestFromRegistry() {
  const info = await fetchRegistryInfo();
  return info ? info.latest : null;
}

// Resolves the registry-latest version: fresh cache first, then the network
// (capped, abortable). On failure the previous answer survives as a stale
// cache hit. Never throws.
// -> { latest, source: 'cache'|'network'|'none', stale }
async function resolveLatest({ skipCache = false } = {}) {
  const entry = readCacheEntry();
  if (!skipCache && isFresh(entry)) return { latest: entry.version, source: 'cache', stale: false };
  const info = await fetchRegistryInfo();
  if (info) {
    const now = Date.now();
    writeCache({ version: info.latest, fetched_at: now, attempted_at: now });
    return { latest: info.latest, source: 'network', stale: false, versions: info.versions };
  }
  markAttempted();
  if (entry && entry.version) return { latest: entry.version, source: 'cache', stale: true };
  return { latest: null, source: 'none', stale: false };
}

// Returns the registry-latest version, hitting the cache first. Never throws,
// never blocks meaningfully (network call is capped + abortable). A stale
// cache is not an answer here: when the fetch fails this resolves to null.
async function getLatestVersion({ skipCache = false } = {}) {
  const r = await resolveLatest({ skipCache });
  return r.stale ? null : r.latest;
}

function isCI(env = process.env) {
  const v = env.CI;
  return !!v && v !== '0' && v.toLowerCase() !== 'false';
}

function refresherArgs() {
  return [path.join(__dirname, 'wize-cli.js'), 'version-check', '--refresh', '--quiet'];
}

// Stale-while-revalidate: returns the cached version whatever its age (null
// when there is none) and never waits on the network. When the cache is
// older than the TTL and no attempt was made in the last 10 minutes, stamps
// attempted_at and starts a detached `version-check --refresh --quiet`.
// No refresher runs when updates are disabled, in CI, or with
// WIZE_NO_BG_REFRESH=1. `spawn` is injectable for tests.
function getLatestNoWait({ spawn = childProcess.spawn, env = process.env, now = Date.now() } = {}) {
  const entry = readCacheEntry();
  const version = entry ? entry.version : null;
  try {
    if (env.WIZE_DISABLE_UPDATE_CHECK === '1' || env.WIZE_NO_BG_REFRESH === '1' || isCI(env)) return version;
    if (isFresh(entry, now)) return version;
    if (entry && now - entry.attemptedAt < ATTEMPT_THROTTLE_MS) return version;
    markAttempted(now);
    const child = spawn(process.execPath, refresherArgs(), {
      detached: true,
      stdio: 'ignore',
      env: { ...env, WIZE_NO_BG_REFRESH: '1' }
    });
    if (child && typeof child.on === 'function') child.on('error', () => {});
    if (child && typeof child.unref === 'function') child.unref();
  } catch (_) { /* a failed spawn never disturbs the command */ }
  return version;
}

// One-line hints for a human's terminal. Never waits on the network: the
// registry answer comes from getLatestNoWait. Silent when stdout is not a
// TTY, in CI, when updates are disabled, or when `--json` is in argv.
// When the project's kit_version trails the running kit, that line comes
// first.
async function printUpdateHintIfAny(currentVersion, opts = {}) {
  const {
    log = console.log,
    isTTY = process.stdout.isTTY,
    env = process.env,
    argv = process.argv.slice(2),
    projectRoot = null,
    spawn
  } = opts;
  if (env.WIZE_DISABLE_UPDATE_CHECK === '1') return;
  if (!isTTY) return;            // don't spam pipes
  if (isCI(env)) return;
  if (argv.includes('--json')) return;
  try {
    const lines = [];
    if (projectRoot) {
      const { loadProjectConfig } = require('./toml.js');
      const cfg = loadProjectConfig(projectRoot);
      const pin = cfg.project && cfg.project.kit_version;
      if (pin && compareVersions(pin, currentVersion) < 0) {
        lines.push(`  ↑ wize-dev-kit: project pinned ${pin}, kit ${currentVersion} -> run npx wize-dev-kit@latest update (or /wize-update)`);
      }
    }
    const latest = getLatestNoWait({ env, ...(spawn ? { spawn } : {}) });
    if (latest && semverGreater(latest, currentVersion)) {
      lines.push(`  ↑ Update available: wize-dev-kit ${currentVersion} → ${latest}`);
      lines.push('    Run `npx wize-dev-kit@latest update` in your project to refresh adapters.');
    }
    if (lines.length) {
      log('');
      for (const l of lines) log(l);
      log('');
    }
  } catch (_) {
    /* total fallback — never block the command */
  }
}

// Pure, TTY-agnostic version check. printUpdateHintIfAny above is an
// opportunistic hint meant for a human's terminal (gated on isTTY so it
// never spams a pipe or a script); this is the explicit-invocation
// counterpart behind the `version-check` CLI command, which an AI agent
// shells out to non-interactively — stdout there is never a TTY, so a
// TTY-gated check would go silent exactly when it's needed. Always resolves
// to a plain object, never throws, and shares the same 1h cache.
async function getVersionCheckResult(currentVersion, { skipCache = false } = {}) {
  if (process.env.WIZE_DISABLE_UPDATE_CHECK === '1') {
    return { installed: currentVersion, latest: null, updateAvailable: false, disabled: true };
  }
  const latest = await getLatestVersion({ skipCache });
  return {
    installed: currentVersion,
    latest: latest || null,
    updateAvailable: latest ? semverGreater(latest, currentVersion) : false
  };
}

// Same answer plus where it came from. Unlike getVersionCheckResult it falls
// back to a stale cache when the registry is unreachable.
async function getVersionCheckDetailed(currentVersion, { skipCache = false } = {}) {
  if (process.env.WIZE_DISABLE_UPDATE_CHECK === '1') {
    return { installed: currentVersion, latest: null, updateAvailable: false, disabled: true, latest_source: 'none' };
  }
  const r = await resolveLatest({ skipCache });
  return {
    installed: currentVersion,
    latest: r.latest,
    updateAvailable: r.latest ? semverGreater(r.latest, currentVersion) : false,
    latest_source: r.source,
    ...(r.versions ? { published_versions: r.versions } : {})
  };
}

module.exports = {
  cacheFile,
  readCache,
  writeCache,
  fetchLatestFromRegistry,
  resolveLatest,
  getLatestVersion,
  getLatestNoWait,
  semverGreater,
  isCI,
  printUpdateHintIfAny,
  getVersionCheckResult,
  getVersionCheckDetailed
};
