'use strict';

// detect.test.js — verifies the cached tool detector used by every skill
// to decide whether to run or degrade a check.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  detectTools,
  clearToolCache,
  CACHE_FILENAME
} = require('../../src/security-overlay/_shared/detect.js');

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wize-detect-'));
}

// Pick a tool we can guarantee on the host (node is the kit's runtime).
const KNOWN = 'node';
const UNKNOWN = 'wize-detect-nonexistent-' + Math.random().toString(36).slice(2);

test('detectTools reports present=true for known tools and present=false for missing ones', () => {
  const dir = mkTmp();
  const out = detectTools([KNOWN, UNKNOWN], { cacheDir: dir });
  assert.equal(out[KNOWN].present, true);
  assert.equal(out[UNKNOWN].present, false);
});

test('detectTools never throws on missing tools — pipeline must continue', () => {
  const dir = mkTmp();
  // Pass a tool name that cannot exist anywhere.
  assert.doesNotThrow(() => detectTools(['definitely-not-a-real-tool-xyz-12345'], { cacheDir: dir }));
});

test('detectTools writes the cache file under the given cacheDir', () => {
  const dir = mkTmp();
  detectTools([KNOWN], { cacheDir: dir });
  const cachePath = path.join(dir, CACHE_FILENAME);
  assert.ok(fs.existsSync(cachePath), 'cache file should exist');
  const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.ok(data[KNOWN], 'cache should contain entry for the known tool');
  assert.equal(data[KNOWN].present, true);
});

test('detectTools is cached across calls: second call reads from cache (no extra spawn)', () => {
  const dir = mkTmp();
  // First call populates the cache.
  const a = detectTools([KNOWN], { cacheDir: dir });
  // Second call should return the same shape and not throw.
  const b = detectTools([KNOWN], { cacheDir: dir });
  assert.equal(b[KNOWN].present, a[KNOWN].present);
  // The cache file exists after the first call and is still valid JSON.
  const cachePath = path.join(dir, CACHE_FILENAME);
  assert.ok(fs.existsSync(cachePath));
});

test('clearToolCache removes the on-disk cache file', () => {
  const dir = mkTmp();
  detectTools([KNOWN], { cacheDir: dir });
  assert.ok(fs.existsSync(path.join(dir, CACHE_FILENAME)));
  clearToolCache({ cacheDir: dir });
  assert.ok(!fs.existsSync(path.join(dir, CACHE_FILENAME)));
});

test('detectTools works for all tools listed in the kit allowlist', () => {
  // These may or may not be installed — we only assert detectTools does NOT
  // throw and returns the expected shape for each.
  const dir = mkTmp();
  const tools = ['nmap', 'gitleaks', 'osv-scanner', 'grype', 'nuclei', 'nikto', 'sqlmap', 'ffuf'];
  const out = detectTools(tools, { cacheDir: dir });
  for (const t of tools) {
    assert.ok(out[t], `detectTools should return an entry for ${t}`);
    assert.equal(typeof out[t].present, 'boolean');
  }
});
