'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('crypto');

const { loadPartial } = require('../../src/security-overlay/_shared/partial.js');
const { filterArgs } = require('../../src/security-overlay/_shared/allowlist.js');

delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-exploit/scripts/run-sqlmap.js')];
const { runSqlmap, filterSqlmapArgs } = require('../../src/security-overlay/skills/wize-sec-exploit/scripts/run-sqlmap.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-sqlmap-'));
  const sec = path.join(dir, '.wize', 'security');
  fs.mkdirSync(sec, { recursive: true });
  return sec;
}

function signedScope() {
  const body = '\n## allowlist\nhosts:\n  - localhost\nurls:\n  - http://localhost:3000/\n## dast_target\nurl: http://localhost:3000\n';
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  return {
    frontmatter: { accepted_by: 'a', accepted_at: '2026-06-17T12:00:00Z', scope_sha256: hash },
    body
  };
}

test('filterSqlmapArgs keeps the documented safe flags and strips --dump/--os-shell (AC-E06-2)', () => {
  const args = filterArgs('sqlmap', ['-u', 'http://localhost:3000', '--batch', '--level=1', '--risk=1', '--dump', '--os-shell']);
  assert.ok(args.includes('-u'), 'url flag must be present');
  assert.ok(args.includes('http://localhost:3000'), 'url value must pass through');
  assert.ok(!args.includes('--dump'), '--dump must be stripped (exfiltration, not in allowlist)');
  assert.ok(!args.includes('--os-shell'), '--os-shell must be stripped (out of allowlist)');
  // --batch and --level=1 should pass.
  assert.ok(args.includes('--batch'));
});

test('runSqlmap does NOT invoke sqlmap when --active is absent (AC-E06-2)', async () => {
  const sec = mkProject();
  let execCalled = false;
  const r = await runSqlmap({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ sqlmap: { present: true, version: '1.7' } })
  });
  assert.equal(execCalled, false, 'sqlmap must NOT be invoked without --active');
  assert.equal(r.ok, true, 'pipeline must continue even when sqlmap is gated off');
  const partial = loadPartial({ securityDir: sec, phase: 'dast' });
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /sqlmap-pasive|passive/);
});

test('runSqlmap degrades with [sqlmap] when --active but tool is missing (AC-E06-4)', async () => {
  const sec = mkProject();
  let execCalled = false;
  const r = await runSqlmap({
    securityDir: sec,
    scope: signedScope(),
    active: true,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ sqlmap: { present: false } })
  });
  assert.equal(execCalled, false, 'sqlmap must NOT be invoked when missing');
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'dast' });
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /sqlmap\b/);
});

test('runSqlmap invokes sqlmap with allowlisted args when --active + tool present (AC-E06-2)', async () => {
  const sec = mkProject();
  const captured = [];
  const mockExec = (bin, args) => {
    captured.push({ bin, args });
    return { stdout: '', stderr: '' };
  };
  await runSqlmap({
    securityDir: sec,
    scope: signedScope(),
    active: true,
    execFn: mockExec,
    detectFn: () => ({ sqlmap: { present: true, version: '1.7' } })
  });
  // The mock should have been called at least once (for the dast_target).
  assert.ok(captured.length > 0, 'sqlmap should be invoked at least once when --active');
  for (const call of captured) {
    assert.equal(call.bin, 'sqlmap');
    // --dump and --os-shell must not appear in the argv passed to execFile.
    assert.ok(!call.args.includes('--dump'));
    assert.ok(!call.args.includes('--os-shell'));
  }
});

test('runSqlmap refuses out-of-scope target even with --active', async () => {
  const sec = mkProject();
  const scope = signedScope();
  scope.body = '\n## allowlist\nhosts: []\nurls:\n  - http://localhost:3000/\n## dast_target\nurl: http://evil.example.com\n';
  scope.frontmatter.scope_sha256 = crypto.createHash('sha256').update(scope.body, 'utf8').digest('hex');
  let execCalled = false;
  await runSqlmap({
    securityDir: sec,
    scope,
    active: true,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ sqlmap: { present: true } })
  });
  assert.equal(execCalled, false, 'sqlmap must NOT be invoked for an out-of-scope URL');
});
