'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('crypto');

const { loadPartial } = require('../../src/security-overlay/_shared/partial.js');
const { filterArgs } = require('../../src/security-overlay/_shared/allowlist.js');

delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-exploit/scripts/run-ffuf.js')];
const { runFfuf, filterFfufArgs } = require('../../src/security-overlay/skills/wize-sec-exploit/scripts/run-ffuf.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-ffuf-'));
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

test('the kit ships a wordlist with at least 100 entries (AC-E06-2)', () => {
  const file = path.join(__dirname, '..', '..', 'src', 'security-overlay', 'skills', 'wize-sec-exploit', 'data', 'common.txt');
  assert.ok(fs.existsSync(file), 'data/common.txt must exist');
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim());
  assert.ok(lines.length >= 100, `wordlist must have >= 100 entries; got ${lines.length}`);
});

test('filterFfufArgs respects the rate-limit and the FUZZ placeholder (AC-E06-2)', () => {
  const args = filterFfufArgs('http://localhost:3000', '/tmp/wordlist.txt');
  assert.ok(args.includes('-rate'), 'rate-limit flag should be present');
  const rIdx = args.indexOf('-rate');
  assert.equal(args[rIdx + 1], '5', 'rate-limit should be 5 (aggressive limit, conservative)');
  // -u should be present, with /FUZZ in the URL.
  const uIdx = args.indexOf('-u');
  assert.match(args[uIdx + 1], /\/FUZZ$/);
});

test('runFfuf does NOT invoke ffuf when --active is absent (AC-E06-2)', async () => {
  const sec = mkProject();
  let execCalled = false;
  const r = await runFfuf({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ ffuf: { present: true, version: '2.1' } })
  });
  assert.equal(execCalled, false, 'ffuf must NOT be invoked without --active');
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'dast' });
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /ffuf-passive|passive/);
});

test('runFfuf degrades with [ffuf] when --active but tool is missing (AC-E06-4)', async () => {
  const sec = mkProject();
  let execCalled = false;
  const r = await runFfuf({
    securityDir: sec,
    scope: signedScope(),
    active: true,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ ffuf: { present: false } })
  });
  assert.equal(execCalled, false);
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'dast' });
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /ffuf/);
});

test('runFfuf invokes ffuf with allowlisted args when --active + tool present (AC-E06-2)', async () => {
  const sec = mkProject();
  const captured = [];
  const mockExec = (bin, args) => {
    captured.push({ bin, args });
    // Write a fake JSON report at the path the runner passed to -o.
    const oIdx = args.indexOf('-o');
    if (oIdx > 0) {
      const outPath = args[oIdx + 1];
      const report = {
        results: [
          { input: { FUZZ: 'admin' }, url: 'http://localhost:3000/admin', status: 200, length: 1234 },
          { input: { FUZZ: 'login' }, url: 'http://localhost:3000/login', status: 302, length: 0 }
        ]
      };
      fs.writeFileSync(outPath, JSON.stringify(report), 'utf8');
    }
    return { stdout: '', stderr: '' };
  };
  const r = await runFfuf({
    securityDir: sec,
    scope: signedScope(),
    active: true,
    execFn: mockExec,
    detectFn: () => ({ ffuf: { present: true, version: '2.1' } })
  });
  assert.equal(r.ok, true);
  assert.ok(captured.length > 0, 'ffuf should have been invoked');
  for (const c of captured) {
    assert.equal(c.bin, 'ffuf');
    // The rate-limit should be present and not stripped.
    assert.ok(c.args.includes('-rate'));
  }
  const partial = loadPartial({ securityDir: sec, phase: 'dast' });
  assert.match(partial.body, /## ffuf/);
  assert.match(partial.body, /admin/);
  assert.match(partial.body, /login/);
});

test('runFfuf refuses out-of-scope target even with --active', async () => {
  const sec = mkProject();
  const scope = signedScope();
  scope.body = '\n## allowlist\nhosts: []\nurls:\n  - http://localhost:3000/\n## dast_target\nurl: http://evil.example.com\n';
  scope.frontmatter.scope_sha256 = crypto.createHash('sha256').update(scope.body, 'utf8').digest('hex');
  let execCalled = false;
  await runFfuf({
    securityDir: sec,
    scope,
    active: true,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ ffuf: { present: true } })
  });
  assert.equal(execCalled, false);
});