// Best-effort, non-blocking npm registry check for "is there a newer wize-dev-kit
// version than the one I'm running?". Designed so the CLI can call it from
// `list` / `agent list` / `help` and print a single hint at the top, without
// ever blocking the command if the network is slow, the user is offline, or
// the registry is misbehaving.
//
// Strategy:
//   - Cache the registry answer in $XDG_CACHE_HOME (or ~/.cache) for 1 hour.
//   - Resolve via fetch with a 1.5s timeout. Failure is silent.
//   - Compare with the kit version baked into the running CLI.
//   - Expose a `printUpdateHintIfAny(currentVersion)` helper for the CLI.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CACHE_TTL_MS = 60 * 60 * 1000;       // 1h
const NETWORK_TIMEOUT_MS = 1500;

function cacheFile() {
  const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(base, 'wize-dev-kit', 'registry-version.json');
}

function readCache() {
  const f = cacheFile();
  try {
    const stat = fs.statSync(f);
    if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) return null;
    return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch (_) {
    return null;
  }
}

function writeCache(payload) {
  const f = cacheFile();
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(payload), 'utf-8');
  } catch (_) { /* cache failure is harmless */ }
}

async function fetchLatestFromRegistry() {
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
    return typeof latest === 'string' ? latest : null;
  } catch (_) {
    return null;   // any error → silent fallback
  } finally {
    clearTimeout(timer);
  }
}

// Returns the registry-latest version, hitting the cache first. Never throws,
// never blocks meaningfully (network call is capped + abortable).
async function getLatestVersion({ skipCache = false } = {}) {
  if (!skipCache) {
    const c = readCache();
    if (c && c.version) return c.version;
  }
  const fresh = await fetchLatestFromRegistry();
  if (fresh) writeCache({ version: fresh, fetched_at: Date.now() });
  return fresh;
}

function semverGreater(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

// Prints a one-line hint when a newer version is available. Silent otherwise.
// Designed to be awaited near the top of a CLI command; if anything is slow
// or off, it just returns.
async function printUpdateHintIfAny(currentVersion, { log = console.log, isTTY = process.stdout.isTTY } = {}) {
  if (process.env.WIZE_DISABLE_UPDATE_CHECK === '1') return;
  if (!isTTY) return;            // don't spam pipes
  try {
    const latest = await getLatestVersion();
    if (!latest) return;
    if (semverGreater(latest, currentVersion)) {
      log('');
      log(`  ↑ Update available: wize-dev-kit ${currentVersion} → ${latest}`);
      log(`    Run \`npx wize-dev-kit@latest update\` in your project to refresh adapters.`);
      log('');
    }
  } catch (_) {
    /* total fallback — never block the command */
  }
}

module.exports = {
  CACHE_TTL_MS,
  NETWORK_TIMEOUT_MS,
  cacheFile,
  readCache,
  writeCache,
  fetchLatestFromRegistry,
  getLatestVersion,
  semverGreater,
  printUpdateHintIfAny
};
