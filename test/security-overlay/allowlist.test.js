'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  filterArgs,
  UnknownToolError,
  loadAllowlist
} = require('../../src/security-overlay/_shared/allowlist.js');

test('filterArgs keeps allowed flags and passes through positional arguments (targets, URLs)', () => {
  const out = filterArgs('nmap', ['-sV', '--script', 'vuln', '127.0.0.1']);
  // -sV is in the nmap allowlist; positional target 127.0.0.1 is passed through.
  // --script is NOT in the allowlist (it would pull in nmap scripting — denied).
  assert.deepEqual(out, ['-sV', '127.0.0.1']);
});

test('filterArgs keeps URL-style positional args for tools that take URLs (sqlmap)', () => {
  const out = filterArgs('sqlmap', ['-u', 'http://localhost:3000/api', '--batch']);
  assert.deepEqual(out, ['-u', 'http://localhost:3000/api', '--batch']);
});

test('filterArgs strips dangerous flags not in the allowlist (sqlmap --dump)', () => {
  const out = filterArgs('sqlmap', ['-u', 'http://localhost:3000', '--dump']);
  assert.deepEqual(out, ['-u', 'http://localhost:3000']);
});

test('filterArgs strips --os-shell from sqlmap (out of allowlist)', () => {
  const out = filterArgs('sqlmap', ['-u', 'http://localhost', '--os-shell', '--batch']);
  assert.deepEqual(out, ['-u', 'http://localhost', '--batch']);
});

test('filterArgs with empty args returns []', () => {
  assert.deepEqual(filterArgs('nmap', []), []);
});

test('filterArgs throws UnknownToolError for unknown tools', () => {
  assert.throws(() => filterArgs('malicious-tool', ['--anything']), err => {
    return err instanceof UnknownToolError && err.tool === 'malicious-tool';
  });
});

test('loadAllowlist reads from a JSON file with the documented shape', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-al-'));
  const file = path.join(dir, 'tool-allowlist.json');
  fs.writeFileSync(file, JSON.stringify({
    nmap: ['-sV', '-Pn'],
    nuclei: ['-u']
  }));
  const out = loadAllowlist(file);
  assert.deepEqual(out.nmap, ['-sV', '-Pn']);
  assert.deepEqual(out.nuclei, ['-u']);
});

test('kit ships a tool-allowlist.json with all expected tools (data contract)', () => {
  const file = path.join(__dirname, '..', '..', 'src', 'security-overlay', 'data', 'tool-allowlist.json');
  assert.ok(fs.existsSync(file), 'src/security-overlay/data/tool-allowlist.json must exist');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const tool of ['nmap', 'gitleaks', 'osv-scanner', 'grype', 'nuclei', 'nikto', 'sqlmap', 'ffuf']) {
    assert.ok(Array.isArray(data[tool]), `${tool} entry must be an array of allowed flags`);
  }
});

test('filterArgs against the kit allowlist accepts a typical nuclei invocation', () => {
  const out = filterArgs('nuclei', ['-u', 'http://localhost:3000', '-t', 'passive', '-severity', 'low,medium,high']);
  assert.deepEqual(out, ['-u', 'http://localhost:3000', '-t', 'passive', '-severity', 'low,medium,high']);
});
