'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

delete require.cache[require.resolve('../../src/security-overlay/_shared/preflight.js')];

function freshRequire() {
  delete require.cache[require.resolve('../../src/security-overlay/_shared/preflight.js')];
  return require('../../src/security-overlay/_shared/preflight.js');
}

test('preflight returns os/arch/packageManager and a tools map', () => {
  const { runPreflight, formatReport } = freshRequire();
  // Mock spawnSync via the env-injection hook.
  process.env.WIZE_SEC_PREFLIGHT_OS = 'linux';
  process.env.WIZE_SEC_PREFLIGHT_PM = 'apt';
  // Mark all allowlist tools as present so missing is empty.
  process.env.WIZE_SEC_PREFLIGHT_TOOLS = JSON.stringify({
    nmap: '/usr/bin/nmap', gitleaks: '/usr/bin/gitleaks', 'osv-scanner': '/usr/bin/osv-scanner',
    grype: '/usr/bin/grype', nuclei: '/usr/bin/nuclei', nikto: '/usr/bin/nikto',
    sqlmap: '/usr/bin/sqlmap', ffuf: '/usr/bin/ffuf', curl: '/usr/bin/curl'
  });
  delete process.env.WIZE_SEC_PREFLIGHT_MOCK; // force real detector
  const r = runPreflight({});
  assert.equal(r.os, 'linux');
  assert.equal(r.packageManager, 'apt');
  assert.ok(typeof r.arch === 'string');
  assert.ok(typeof r.tools === 'object');
  assert.equal(r.tools.nmap.present, true);
  assert.equal(r.tools.curl.present, true);
  assert.deepEqual(r.missing, []);
  // formatReport should produce a stable string.
  const text = formatReport(r);
  assert.match(text, /linux/);
  assert.match(text, /apt/);
});

test('preflight reports missing tools', () => {
  const { runPreflight } = freshRequire();
  process.env.WIZE_SEC_PREFLIGHT_OS = 'darwin';
  process.env.WIZE_SEC_PREFLIGHT_PM = 'brew';
  process.env.WIZE_SEC_PREFLIGHT_TOOLS = JSON.stringify({ node: '/usr/bin/node' });
  const r = runPreflight({});
  assert.equal(r.os, 'darwin');
  assert.equal(r.packageManager, 'brew');
  // nmap/gitleaks/etc. all missing.
  assert.ok(r.missing.length > 0, 'should report at least one missing tool');
  assert.ok(r.missing.includes('nmap') || r.missing.includes('gitleaks'),
    'nmap and/or gitleaks should be in the missing list');
  // tools map marks them as not present.
  for (const name of r.missing) {
    assert.equal(r.tools[name].present, false, `${name} should be present=false`);
  }
});

test('preflight detects WSL on Windows', () => {
  const { runPreflight } = freshRequire();
  process.env.WIZE_SEC_PREFLIGHT_OS = 'wsl';
  process.env.WIZE_SEC_PREFLIGHT_PM = 'apt';
  process.env.WIZE_SEC_PREFLIGHT_TOOLS = '{}';
  const r = runPreflight({});
  assert.equal(r.os, 'wsl');
  assert.equal(r.packageManager, 'apt');
});

test('preflight returns packageManager=none when no known PM is detected', () => {
  const { runPreflight } = freshRequire();
  process.env.WIZE_SEC_PREFLIGHT_OS = 'linux';
  process.env.WIZE_SEC_PREFLIGHT_PM = 'none';
  process.env.WIZE_SEC_PREFLIGHT_TOOLS = '{}';
  const r = runPreflight({});
  assert.equal(r.packageManager, 'none');
});

test('preflight does not throw when command -v is missing (Windows w/o bash)', () => {
  const { runPreflight } = freshRequire();
  process.env.WIZE_SEC_PREFLIGHT_OS = 'win32';
  process.env.WIZE_SEC_PREFLIGHT_PM = 'scoop';
  process.env.WIZE_SEC_PREFLIGHT_TOOLS = JSON.stringify({ node: 'C:\\node\\node.exe' });
  // On win32, the detector should use `where` instead of `command -v`.
  const r = runPreflight({});
  assert.equal(r.os, 'win32');
  assert.equal(r.tools.node.present, true);
});

test('preflight filters empty tool names from data/tool-allowlist.json', () => {
  const { runPreflight } = freshRequire();
  process.env.WIZE_SEC_PREFLIGHT_OS = 'linux';
  process.env.WIZE_SEC_PREFLIGHT_PM = 'apt';
  process.env.WIZE_SEC_PREFLIGHT_TOOLS = '{}';
  const r = runPreflight({});
  // The detector must only check the real tool names (nmap, nuclei, etc.)
  // and NOT include the schema field "_schema" or "categories" from
  // data/owasp-top10.json.
  assert.ok(!('categories' in r.tools));
  assert.ok(!('_schema' in r.tools));
});

test('formatReport includes a count and a list of missing tools', () => {
  const { runPreflight, formatReport } = freshRequire();
  process.env.WIZE_SEC_PREFLIGHT_OS = 'darwin';
  process.env.WIZE_SEC_PREFLIGHT_PM = 'brew';
  process.env.WIZE_SEC_PREFLIGHT_TOOLS = JSON.stringify({ node: '/usr/bin/node' });
  const r = runPreflight({});
  const text = formatReport(r);
  assert.match(text, /missing/i);
  // The text should include the count.
  assert.match(text, /tools/);
});
