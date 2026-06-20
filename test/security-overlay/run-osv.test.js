'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');

const { loadPartial } = require('../../src/security-overlay/_shared/partial.js');

delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-recon/scripts/run-osv.js')];
const { runOsv } = require('../../src/security-overlay/skills/wize-sec-recon/scripts/run-osv.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-osv-'));
  return path.join(dir, '.wize', 'security');
}

function signedScope() {
  const body = '\n## allowlist\nhosts: []\nurls: []\n## dast_target\nurl: http://localhost\n';
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  return {
    frontmatter: { accepted_by: 'a', accepted_at: '2026-06-17T12:00:00Z', scope_sha256: hash },
    body
  };
}

test('runOsv writes dep findings with cve + cvss to sast.md (AC-E05-2)', async () => {
  const sec = mkProject();
  fs.mkdirSync(sec, { recursive: true });
  // A manifest must exist in manifestRoot for osv to run.
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-osv-proj-'));
  fs.writeFileSync(path.join(proj, 'composer.lock'), '{"packages":[]}');
  const mockExec = (bin, args) => {
    // osv-scanner v2: --output-file <path> is where the JSON report goes.
    const ofIdx = args.indexOf('--output-file');
    if (ofIdx >= 0) {
      const reportPath = args[ofIdx + 1];
      // v2 shape: results -> packages -> { package, groups, vulnerabilities }
      const report = {
        results: [{
          packages: [{
            package: { name: 'lodash', version: '4.17.20', ecosystem: 'npm' },
            groups: [{ ids: ['CVE-2021-23337'], aliases: ['CVE-2021-23337'], max_severity: '7.5' }],
            vulnerabilities: [{ id: 'CVE-2021-23337' }]
          }]
        }]
      };
      fs.writeFileSync(reportPath, JSON.stringify(report), 'utf8');
    }
    return { stdout: '', stderr: '' };
  };
  const r = await runOsv({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: mockExec,
    detectFn: () => ({ 'osv-scanner': { present: true }, grype: { present: false } }),
    manifestRoot: proj,
    reportFilename: 'osv-report.json'
  });
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'sast' });
  assert.match(partial.body, /## deps/);
  assert.match(partial.body, /lodash/);
  assert.match(partial.body, /CVE-2021-23337/);
  assert.match(partial.body, /7\.5/);
});

test('runOsv degrades when both osv-scanner and grype are missing (AC-E05-3)', async () => {
  const sec = mkProject();
  fs.mkdirSync(sec, { recursive: true });
  let execCalled = false;
  const r = await runOsv({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ 'osv-scanner': { present: false }, grype: { present: false } })
  });
  assert.equal(execCalled, false);
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'sast' });
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /deps/);
});

test('runOsv falls back to grype when osv-scanner is missing', async () => {
  const sec = mkProject();
  fs.mkdirSync(sec, { recursive: true });
  let invoked = null;
  const mockExec = (bin) => {
    invoked = bin;
    if (bin === 'grype') {
      const report = {
        matches: [{
          artifact: { name: 'left-pad', version: '1.3.0' },
          vulnerability: { id: 'CVE-2023-XXXX', severity: 'Medium', cvss: [{ metrics: { baseScore: 5.3 } }] }
        }]
      };
      fs.writeFileSync(path.join(sec, 'grype-report.json'), JSON.stringify(report), 'utf8');
    }
    return { stdout: '', stderr: '' };
  };
  await runOsv({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: mockExec,
    detectFn: () => ({ 'osv-scanner': { present: false }, grype: { present: true } })
  });
  assert.equal(invoked, 'grype', 'should fall back to grype when osv-scanner is missing');
  const partial = loadPartial({ securityDir: sec, phase: 'sast' });
  assert.match(partial.body, /left-pad/);
  assert.match(partial.body, /CVE-2023-XXXX/);
});

test('runOsv degrades with deps-no-manifest when no manifest files are present', async () => {
  const sec = mkProject();
  fs.mkdirSync(sec, { recursive: true });
  // No manifests in the project. detectFn reports osv-scanner present.
  await runOsv({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: () => ({ stdout: '', stderr: '' }),
    detectFn: () => ({ 'osv-scanner': { present: true } }),
    manifestRoot: os.tmpdir() // empty dir
  });
  const partial = loadPartial({ securityDir: sec, phase: 'sast' });
  assert.equal(partial.frontmatter.partial_status, 'incomplete');
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /manifest/);
});

test('runOsv passes detected lockfiles via -L', async () => {
  const sec = mkProject();
  fs.mkdirSync(sec, { recursive: true });
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-osv-proj-'));
  fs.writeFileSync(path.join(proj, 'package-lock.json'), '{"packages":{}}');
  let capturedArgs = null;
  const mockExec = (bin, args) => {
    capturedArgs = args;
    const ofIdx = args.indexOf('--output-file');
    if (ofIdx >= 0) fs.writeFileSync(args[ofIdx + 1], '{"results":[]}', 'utf8');
    return { stdout: '', stderr: '' };
  };
  await runOsv({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: mockExec,
    detectFn: () => ({ 'osv-scanner': { present: true } }),
    manifestRoot: proj
  });
  // The lockfile should be passed via -L.
  assert.ok(capturedArgs.includes('-L'), 'osv-scanner should receive -L for the lockfile');
  const lIdx = capturedArgs.indexOf('-L');
  assert.match(capturedArgs[lIdx + 1], /package-lock\.json$/);
});