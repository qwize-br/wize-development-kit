'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');

const { loadPartial } = require('../../src/security-overlay/_shared/partial.js');

delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-exploit/scripts/run-nikto.js')];
const { runNikto, filterNiktoArgs } = require('../../src/security-overlay/skills/wize-sec-exploit/scripts/run-nikto.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-nikto-'));
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

test('filterNiktoArgs keeps -Tuning x6 (AC-E06-1)', () => {
  const args = filterNiktoArgs('localhost', '/tmp/out.txt');
  assert.ok(args.includes('-Tuning'), '-Tuning should be present');
  const idx = args.indexOf('-Tuning');
  assert.equal(args[idx + 1], 'x6', 'Tuning value must be x6 (safe checks)');
  assert.ok(args.includes('-ask'), '-ask should be present');
  assert.equal(args[args.indexOf('-ask') + 1], 'no', 'ask should be "no"');
});

test('runNikto writes findings with id/msg/severity/owasp to dast.md (AC-E06-1)', async () => {
  const sec = mkProject();
  const mockExec = (bin, args) => {
    const oIdx = args.indexOf('-o');
    const text = [
      'Nikto v2.5',
      '+ OSVDB-3092: /server-status: This may be exposed...',
      '+ /admin/: Admin login page/section found.',
      '+ Cookie PHPSESSID created without the httponly flag'
    ].join('\n');
    if (oIdx > 0) {
      const outPath = args[oIdx + 1];
      fs.writeFileSync(outPath, text, 'utf8');
    }
    return { stdout: text, stderr: '' };
  };
  const r = await runNikto({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: mockExec,
    detectFn: () => ({ nikto: { present: true, version: '2.5' } })
  });
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'dast' });
  assert.match(partial.body, /## nikto/);
  assert.match(partial.body, /OSVDB-3092/);
  assert.match(partial.body, /admin/);
  // Each finding should have an OWASP tag.
  assert.match(partial.body, /A\d{2}:2021/);
});

test('runNikto degrades when nikto is missing (AC-E06-4)', async () => {
  const sec = mkProject();
  let execCalled = false;
  const r = await runNikto({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ nikto: { present: false } })
  });
  assert.equal(execCalled, false, 'nikto must NOT be invoked when missing');
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'dast' });
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /nikto/);
});

test('runNikto refuses out-of-scope target', async () => {
  const sec = mkProject();
  const scope = signedScope();
  scope.body = '\n## allowlist\nhosts: []\nurls:\n  - http://localhost:3000/\n## dast_target\nurl: http://evil.example.com\n';
  scope.frontmatter.scope_sha256 = crypto.createHash('sha256').update(scope.body, 'utf8').digest('hex');
  let execCalled = false;
  await runNikto({
    securityDir: sec,
    scope,
    active: false,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ nikto: { present: true } })
  });
  assert.equal(execCalled, false);
});