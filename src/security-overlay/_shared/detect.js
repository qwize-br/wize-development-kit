'use strict';

// detect.js — cache-aware detector for external pentest tools.
//
// detectTools(names, { cacheDir }) -> { name: { present, path?, version? } }
//   - present = false when the tool is not on PATH (the common case for users
//     who haven't installed the toolchain yet). detectTools NEVER throws on
//     a missing tool — the calling skill is expected to degrade gracefully.
//   - path    = full path to the binary (when present).
//   - version = best-effort version string from `<bin> --version`; null if
//     the version probe failed (timeout, non-zero exit, no output).
//
// The result is cached at <cacheDir>/.tools.json so a long pipeline
// (recon -> enumerate -> exploit -> report) calls `command -v` at most
// once per tool per session. The overlay is single-threaded per
// invocation, so we don't lock the cache file.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const CACHE_FILENAME = '.tools.json';
const VERSION_TIMEOUT_MS = 2000;

function cachePath(cacheDir) {
  return path.join(cacheDir || path.join(process.cwd(), '.wize', 'security'), CACHE_FILENAME);
}

function readCache(cacheDir) {
  const p = cachePath(cacheDir);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return {};
  }
}

function writeCache(cacheDir, data) {
  const dir = cacheDir || path.join(process.cwd(), '.wize', 'security');
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cachePath(cacheDir), JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {
    // best-effort; a write failure does not invalidate the in-memory result
  }
}

function which(name) {
  // Use `command -v` (POSIX) — returns 0 and prints the path if found.
  // Falls back to `which` for systems without `command` (Windows cmd).
  try {
    const r = spawnSync('command', ['-v', name], { encoding: 'utf8', timeout: 1000 });
    if (r.status === 0 && r.stdout) {
      return r.stdout.split('\n')[0].trim();
    }
  } catch (_) { /* fall through */ }
  try {
    const r = spawnSync('which', [name], { encoding: 'utf8', timeout: 1000 });
    if (r.status === 0 && r.stdout) return r.stdout.split('\n')[0].trim();
  } catch (_) { /* fall through */ }
  return null;
}

function probeVersion(binPath) {
  // Try the most common version flags in order. Each is a separate probe;
  // a failure is non-fatal (we return null).
  const flags = ['--version', '-version', '-V', 'version'];
  for (const f of flags) {
    try {
      const out = execFileSync(binPath, [f], {
        encoding: 'utf8',
        timeout: VERSION_TIMEOUT_MS,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      const first = (out || '').split('\n')[0].trim();
      if (first) return first.slice(0, 120);
    } catch (_) {
      // try next flag
    }
  }
  return null;
}

function probeOne(name) {
  const p = which(name);
  if (!p) return { present: false };
  return { present: true, path: p, version: probeVersion(p) };
}

// detectTools(names, opts?) -> { name: {present, path?, version?} }
// opts.cacheDir: where to read/write the cache file (default .wize/security).
function detectTools(names, opts = {}) {
  const cacheDir = opts.cacheDir;
  const cache = readCache(cacheDir);
  const out = {};
  let mutated = false;

  for (const name of names || []) {
    if (cache[name]) {
      out[name] = cache[name];
      continue;
    }
    const entry = probeOne(name);
    out[name] = entry;
    cache[name] = entry;
    mutated = true;
  }

  if (mutated) writeCache(cacheDir, cache);
  return out;
}

function clearToolCache(opts = {}) {
  const p = cachePath(opts.cacheDir);
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (_) { /* ignore */ }
}

module.exports = {
  detectTools,
  clearToolCache,
  CACHE_FILENAME
};
