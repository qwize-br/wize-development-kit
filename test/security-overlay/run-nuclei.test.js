'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');

const { loadPartial } = require('../../src/security-overlay/_shared/partial.js');

delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-exploit/scripts/run-nuclei.js')];
const { runNuclei, filterNucleiArgs } = require('../../src/security-overlay/skills/wize-sec-exploit/scripts/run-nuclei.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-nuclei-'));
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

test('filterNucleiArgs returns passive templates by default (no --active)', () => {
  const args = filterNucleiArgs('http://localhost:3000', false, '/tmp/out.json');
  assert.ok(args.includes('-t'), 'should include -t flag');
  // -t value should be 'passive'.
  const tIdx = args.indexOf('-t');
  assert.equal(args[tIdx + 1], 'passive', 'default template set is passive');
});

test('filterNucleiArgs returns default templates when --active', () => {
  const args = filterNucleiArgs('http://localhost:3000', true, '/tmp/out.json');
  const tIdx = args.indexOf('-t');
  assert.equal(args[tIdx + 1], 'default', 'active mode uses default templates');
});

test('runNuclei writes OWASP-tagged findings to dast.md (AC-E06-1)', async () => {
  const sec = mkProject();
  const mockExec = (bin, args) => {
    if (args.includes('-json') || args.includes('-o')) {
      const oIdx = args.indexOf('-o');
      const outPath = args[oIdx + 1];
      const findings = [
        { 'template-id': 'missing-csp-header', info: { severity: 'medium', name: 'Missing CSP' }, 'matched-at': 'http://localhost:3000/', cvss: 5.3 },
        { 'template-id': 'tech-detect-nginx', info: { severity: 'info', name: 'Nginx detected' }, 'matched-at': 'http://localhost:3000/', cvss: 0 }
      ];
      fs.writeFileSync(outPath, findings.map(f => JSON.stringify(f)).join('\n'), 'utf8');
    }
    return { stdout: '', stderr: '' };
  };
  const r = await runNuclei({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: mockExec,
    detectFn: () => ({ nuclei: { present: true, version: '2.9' } })
  });
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'dast' });
  assert.match(partial.body, /## nuclei/);
  assert.match(partial.body, /missing-csp-header/);
  assert.match(partial.body, /tech-detect-nginx/);
  // The csp-header rule is mapped to A05:2021 (cors/csp/header).
  assert.match(partial.body, /A05:2021/);
});

test('runNuclei degrades when nuclei is missing (AC-E06-4)', async () => {
  const sec = mkProject();
  let execCalled = false;
  const r = await runNuclei({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ nuclei: { present: false } })
  });
  assert.equal(execCalled, false, 'nuclei must NOT be invoked when missing');
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'dast' });
  assert.equal(partial.frontmatter.partial_status, 'incomplete');
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /nuclei/);
});

test('runNuclei refuses out-of-scope DAST target', async () => {
  const sec = mkProject();
  const evilScope = signedScope();
  // Override dast_target.url to point OUTSIDE the allowlist.
  evilScope.body = '\n## allowlist\nhosts: []\nurls:\n  - http://localhost:3000/\n## dast_target\nurl: http://evil.example.com\n';
  const evilHash = crypto.createHash('sha256').update(evilScope.body, 'utf8').digest('hex');
  evilScope.frontmatter.scope_sha256 = evilHash;
  let execCalled = false;
  await runNuclei({
    securityDir: sec,
    scope: evilScope,
    active: false,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ nuclei: { present: true } })
  });
  assert.equal(execCalled, false, 'nuclei must NOT be invoked for an out-of-scope URL');
  const partial = loadPartial({ securityDir: sec, phase: 'dast' });
  assert.equal(partial.frontmatter.partial_status, 'incomplete');
});
