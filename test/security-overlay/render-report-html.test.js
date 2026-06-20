'use strict';

// render-report-html.test.js — the HTML consolidator. Verifies the
// single-file self-contained contract: no remote refs, semantic
// structure, severity badges, OWASP tags.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('os');
const crypto = require('crypto');

const { writePartial } = require('../../src/security-overlay/_shared/partial.js');

delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-report/scripts/render-report.js')];
const { renderReport } = require('../../src/security-overlay/skills/wize-sec-report/scripts/render-report.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-html-'));
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

test('renderReport generates report.html in the security dir (AC-E07-2)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'sast', mode: 'passive', scope, status: 'complete',
    sections: { secrets: '- **src/x.ts** rule `aws-access-token` — ***REDACTED***' }
  });
  renderReport({ securityDir: sec });
  const htmlPath = path.join(sec, 'report.html');
  assert.ok(fs.existsSync(htmlPath), 'report.html should exist');
});

test('report.html has no remote references (AC-E07-3)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'recon', mode: 'passive', scope, status: 'complete',
    sections: { open_ports: '- **80/tcp** nginx' }
  });
  renderReport({ securityDir: sec });
  const html = fs.readFileSync(path.join(sec, 'report.html'), 'utf8');
  assert.doesNotMatch(html, /src="https?:/i, 'no remote <script src>');
  assert.doesNotMatch(html, /href="https?:/i, 'no remote <link href>');
  assert.doesNotMatch(html, /@import/i, 'no @import');
});

test('report.html is semantic: doctype, lang, main, footer (AC-E07-5)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'recon', mode: 'passive', scope, status: 'complete',
    sections: { open_ports: '- **80/tcp** nginx' }
  });
  renderReport({ securityDir: sec });
  const html = fs.readFileSync(path.join(sec, 'report.html'), 'utf8');
  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /<html\s+lang=/i);
  assert.match(html, /<main\b/i);
  assert.match(html, /<footer\b/i);
  // Skip link to #main for accessibility.
  assert.match(html, /<a\s+href="#main"/i);
});

test('each finding has a severity badge (AC-E07-4)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'dast', mode: 'passive', scope, status: 'complete',
    sections: {
      nuclei: '- **missing-csp-header** severity=medium matched_at: http://localhost/'
    }
  });
  renderReport({ securityDir: sec });
  const html = fs.readFileSync(path.join(sec, 'report.html'), 'utf8');
  // The finding should appear inside an <article> with a severity badge.
  assert.match(html, /<article\b/i);
  assert.match(html, /class="[^"]*severity-medium/);
});

test('at least one finding has a tag OWASP (AC-E07-4)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'dast', mode: 'passive', scope, status: 'complete',
    sections: {
      nuclei: '- **missing-csp-header** severity=medium matched_at: http://localhost/'
    }
  });
  renderReport({ securityDir: sec });
  const html = fs.readFileSync(path.join(sec, 'report.html'), 'utf8');
  assert.match(html, /A\d{2}:2021/);
});

test('report.html redacts secrets even in the HTML (defense in depth)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'sast', mode: 'passive', scope, status: 'complete',
    sections: { secrets: '- AKIAEXAMPLEKEY123456789 was found' }
  });
  renderReport({ securityDir: sec });
  const html = fs.readFileSync(path.join(sec, 'report.html'), 'utf8');
  assert.ok(!html.includes('AKIAEXAMPLEKEY123456789'));
  assert.match(html, /\*\*\*REDACTED\*\*\*/);
});

test('report.html executive summary uses an accessible <table> with scope attributes', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'sast', mode: 'passive', scope, status: 'complete',
    sections: { deps: '- **lodash@4.0.0** `CVE-1` cvss=7.5' }
  });
  renderReport({ securityDir: sec });
  const html = fs.readFileSync(path.join(sec, 'report.html'), 'utf8');
  // Table headers should have scope=col (or row).
  assert.match(html, /<th\s+scope="col"/i);
});

test('report.html uses mobile-first CSS (a viewport meta + responsive units)', () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec, phase: 'recon', mode: 'passive', scope, status: 'complete',
    sections: { open_ports: '- **80/tcp** nginx' }
  });
  renderReport({ securityDir: sec });
  const html = fs.readFileSync(path.join(sec, 'report.html'), 'utf8');
  // Mobile-first: include a viewport meta tag.
  assert.match(html, /<meta\s+name="viewport"/i);
});
