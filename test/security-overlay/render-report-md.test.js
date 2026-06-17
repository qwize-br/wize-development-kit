'use strict';

// render-report-md.test.js — the MD consolidator. Verifies idempotency,
// redaction, ordering by CVSS desc, and graceful handling of missing
// partials.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('crypto');

const { writePartial, listPartials } = require('../../src/security-overlay/_shared/partial.js');
const { tagOwasp } = require('../../src/security-overlay/_shared/owasp.js');

delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-report/scripts/render-report.js')];
const { renderReport } = require('../../src/security-overlay/skills/wize-sec-report/scripts/render-report.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-rpt-'));
  const sec = path.join(dir, '.wize', 'security');
  fs.mkdirSync(sec, { recursive: true });
  return { dir, sec };
}

function signedScope() {
  const body = '\n## allowlist\nhosts:\n  - localhost\nurls:\n  - http://localhost:3000/\n## dast_target\nurl: http://localhost:3000\n';
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  return {
    frontmatter: { accepted_by: 'a', accepted_at: '2026-06-17T12:00:00Z', scope_sha256: hash },
    body
  };
}

test('renderReport writes report.md from existing partials (AC-E07-2)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'recon', mode: 'passive', scope, status: 'complete',
    sections: { open_ports: '- **80/tcp** `http` — nginx' }
  });
  writePartial({
    securityDir: sec, phase: 'sast', mode: 'passive', scope, status: 'complete',
    sections: {
      secrets: '- **src/config.ts** line 12 rule `aws-access-token` — redacted_value: `***REDACTED***`',
      deps: '- **lodash@4.17.20** `CVE-2021-23337` cvss=7.5'
    }
  });
  const r = renderReport({ securityDir: sec });
  assert.ok(r.ok, 'renderReport should succeed');
  assert.ok(fs.existsSync(path.join(sec, 'report.md')), 'report.md should exist');
  const text = fs.readFileSync(path.join(sec, 'report.md'), 'utf8');
  assert.match(text, /# Security Report/);
  assert.match(text, /scope_sha256/);
  assert.match(text, /## recon/);
  assert.match(text, /## sast/);
  assert.match(text, /## executive summary/i);
});

test('renderReport is idempotent (running twice produces equivalent MD with normalized timestamps)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'recon', mode: 'passive', scope, status: 'complete',
    sections: { open_ports: '- **80/tcp** `http` — nginx' }
  });
  renderReport({ securityDir: sec });
  const first = fs.readFileSync(path.join(sec, 'report.md'), 'utf8');
  // Sleep a tiny moment so generated_at differs at the second level, then re-render.
  // (The renderer should normalize timestamps so diff is empty.)
  renderReport({ securityDir: sec });
  const second = fs.readFileSync(path.join(sec, 'report.md'), 'utf8');
  // Normalize generated_at: replace ISO timestamps with a placeholder.
  const norm = s => s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, 'TS');
  assert.equal(norm(first), norm(second), 'rendering twice should produce equivalent MD');
});

test('renderReport redacts AWS-style secret values in finding bodies (AC-E07-6)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  // Plant a raw AWS key in a partial section (simulating a tool that
  // mistakenly leaked the value).
  writePartial({
    securityDir: sec, phase: 'sast', mode: 'passive', scope, status: 'complete',
    sections: { secrets: '- AKIAEXAMPLEKEY123456789 was found in src/x.ts' }
  });
  renderReport({ securityDir: sec });
  const text = fs.readFileSync(path.join(sec, 'report.md'), 'utf8');
  assert.ok(!text.includes('AKIAEXAMPLEKEY123456789'), 'raw secret must NOT appear in report.md');
  assert.match(text, /\*\*\*REDACTED\*\*\*/);
});

test('renderReport handles missing partials without aborting (AC-E07-1)', () => {
  const { sec } = mkProject();
  // No partials written at all.
  const r = renderReport({ securityDir: sec });
  assert.equal(r.ok, true);
  const text = fs.readFileSync(path.join(sec, 'report.md'), 'utf8');
  // Each known phase is listed with status: missing.
  for (const phase of ['recon', 'enumerate', 'sast', 'dast']) {
    assert.match(text, new RegExp(`## ${phase}[\\s\\S]*status: missing`), `expected ## ${phase} section with status: missing`);
  }
});

test('renderReport orders findings by CVSS desc (AC-E07-4)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'sast', mode: 'passive', scope, status: 'complete',
    sections: {
      deps: [
        '- **low@1.0.0** `CVE-LOW` cvss=3.0',
        '- **high@1.0.0** `CVE-HIGH` cvss=8.0',
        '- **medium@1.0.0** `CVE-MED` cvss=5.0'
      ].join('\n')
    }
  });
  renderReport({ securityDir: sec });
  const text = fs.readFileSync(path.join(sec, 'report.md'), 'utf8');
  // High should appear before Medium, Medium before Low.
  const hiIdx = text.indexOf('CVE-HIGH');
  const medIdx = text.indexOf('CVE-MED');
  const loIdx = text.indexOf('CVE-LOW');
  assert.ok(hiIdx > 0 && medIdx > hiIdx && loIdx > medIdx,
    'findings should be ordered by CVSS desc: HIGH before MED before LOW');
});

test('renderReport applies tagOwasp to findings that have only rule + severity (AC-E07-4)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'dast', mode: 'passive', scope, status: 'complete',
    sections: {
      nuclei: '- **missing-csp-header** severity=medium matched_at: http://localhost:3000/'
    }
  });
  renderReport({ securityDir: sec });
  const text = fs.readFileSync(path.join(sec, 'report.md'), 'utf8');
  // The csp-header rule should be tagged as A05:2021 (security misconfig).
  assert.match(text, /A05:2021/);
});

test('renderReport includes refusals from .refusals.log in an appendix', () => {
  const { sec } = mkProject();
  fs.writeFileSync(path.join(sec, '.refusals.log'),
    '- timestamp: 2026-06-17T12:00:00Z\n  host: evil.example.com\n  reason: host not in allowlist\n', 'utf8');
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'recon', mode: 'passive', scope, status: 'complete',
    sections: { open_ports: '- **80/tcp** `http` — nginx' }
  });
  renderReport({ securityDir: sec });
  const text = fs.readFileSync(path.join(sec, 'report.md'), 'utf8');
  assert.match(text, /## [Rr]efusals/);
  assert.match(text, /evil\.example\.com/);
});