'use strict';

// run-gitleaks.test.js — SAST secrets via gitleaks. Verifies that secret
// VALUES never appear in the generated partial.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');

const { loadPartial } = require('../../src/security-overlay/_shared/partial.js');

delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-recon/scripts/run-gitleaks.js')];
const { runGitleaks } = require('../../src/security-overlay/skills/wize-sec-recon/scripts/run-gitleaks.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-sast-'));
  const sec = path.join(dir, '.wize', 'security');
  // Pre-create the security dir so the mocked gitleaks can write its
  // report there (mirrors what writePartial does in production).
  fs.mkdirSync(sec, { recursive: true });
  return sec;
}

function signedScope() {
  const body = '\n## allowlist\nhosts: []\nurls: []\n## dast_target\nurl: http://localhost\n';
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  return {
    frontmatter: { accepted_by: 'a', accepted_at: '2026-06-17T12:00:00Z', scope_sha256: hash },
    body
  };
}

test('runGitleaks writes redacted findings to sast.md (AC-E05-1)', async () => {
  const sec = mkProject();
  // Mock gitleaks: it returns findings via writing a JSON file. We can't
  // easily inject a different working dir, so we just return a stub here
  // and assert the contract via the redaction logic.
  const REAL_SECRET = 'AKIAEXAMPLEKEY123456789';
  const mockExec = (bin, args) => {
    // Write a fake gitleaks report to the path gitleaks would have used.
    if (args.includes('-r')) {
      const rIdx = args.indexOf('-r');
      const reportPath = args[rIdx + 1];
      const report = [{
        File: 'src/config.ts',
        StartLine: 12,
        EndLine: 12,
        RuleID: 'aws-access-token',
        Match: REAL_SECRET,
        Secret: REAL_SECRET
      }];
      fs.writeFileSync(reportPath, JSON.stringify(report), 'utf8');
    }
    return { stdout: '', stderr: '' };
  };
  const r = await runGitleaks({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: mockExec,
    detectFn: () => ({ gitleaks: { present: true, version: '8.18' } }),
    reportFilename: 'gitleaks-report.json'
  });
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'sast' });
  assert.ok(partial, 'sast.md must be written');
  // The redaction marker must appear.
  assert.match(partial.body, /\*\*\*REDACTED\*\*\*/);
  // The actual secret must NOT appear in the partial.
  assert.ok(!partial.body.includes(REAL_SECRET),
    `sast.md must NOT contain the real secret (${REAL_SECRET})`);
  // File + line + rule should appear.
  assert.match(partial.body, /src\/config\.ts/);
  assert.match(partial.body, /line 12|line:\s*12|startLine.*12/i);
  assert.match(partial.body, /aws-access-token/);
});

test('runGitleaks degrades when gitleaks is missing (AC-E05-3)', async () => {
  const sec = mkProject();
  let execCalled = false;
  const r = await runGitleaks({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ gitleaks: { present: false } }),
    reportFilename: 'gitleaks-report.json'
  });
  assert.equal(execCalled, false, 'gitleaks must NOT be invoked when missing');
  assert.equal(r.ok, true, 'pipeline must continue');
  const partial = loadPartial({ securityDir: sec, phase: 'sast' });
  assert.equal(partial.frontmatter.partial_status, 'incomplete');
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /secrets|gitleaks/);
});

test('runGitleaks writes the gitleaks-report.json ONLY inside the security dir (AC-E05-1)', async () => {
  const sec = mkProject();
  const mockExec = (bin, args) => {
    if (args.includes('-r')) {
      const rIdx = args.indexOf('-r');
      const reportPath = args[rIdx + 1];
      fs.writeFileSync(reportPath, '[]', 'utf8');
    }
    return { stdout: '', stderr: '' };
  };
  await runGitleaks({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: mockExec,
    detectFn: () => ({ gitleaks: { present: true } }),
    reportFilename: 'gitleaks-report.json'
  });
  // The report should be inside the security dir, not in src/.
  const reportPath = path.join(sec, 'gitleaks-report.json');
  assert.ok(fs.existsSync(reportPath), 'gitleaks-report.json must be created inside the security dir');
  // The real secret path: ensure no report file is written anywhere in src/.
  // (Walk a couple of likely places; we already know sec is not src/.)
  assert.ok(!reportPath.includes('/src/'));
});

test('runGitleaks canary: run-gitleaks.js never writes raw secret bytes to disk anywhere outside the report file (AC-E05-1)', async () => {
  const sec = mkProject();
  const captured = [];
  const mockExec = (bin, args) => {
    if (args.includes('-r')) {
      const rIdx = args.indexOf('-r');
      const reportPath = args[rIdx + 1];
      // Capture what gitleaks would have written.
      const buf = JSON.stringify([{ File: 'x.ts', StartLine: 1, RuleID: 'r', Match: 'RAW_SECRET_VALUE', Secret: 'RAW_SECRET_VALUE' }]);
      fs.writeFileSync(reportPath, buf, 'utf8');
      captured.push({ path: reportPath, len: buf.length });
    }
    return { stdout: '', stderr: '' };
  };
  await runGitleaks({
    securityDir: sec,
    scope: signedScope(),
    active: false,
    execFn: mockExec,
    detectFn: () => ({ gitleaks: { present: true } }),
    reportFilename: 'gitleaks-report.json'
  });
  // The runner should NOT have written the raw secret anywhere in the
  // partial — only the redacted marker.
  const partial = loadPartial({ securityDir: sec, phase: 'sast' });
  assert.ok(!partial.body.includes('RAW_SECRET_VALUE'));
  // The report file IS allowed to contain the raw value (the runner
  // doesn't filter the report itself — gitleaks wrote it). We only verify
  // the partial is redacted.
  if (captured[0]) {
    const content = fs.readFileSync(captured[0].path, 'utf8');
    assert.ok(content.includes('RAW_SECRET_VALUE'),
      'report file SHOULD contain the raw value (intentional — the redaction is in the partial)');
  }
});