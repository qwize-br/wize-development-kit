'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { compose } = require('../tools/installer/onboarding.js');

const baseDetection = { brownfield: false };
const baseProfiles = [{ code: 'core' }];

test('compose returns → /wize for greenfield core-only (AC-E09-S10)', () => {
  const out = compose(baseDetection, baseProfiles);
  assert.strictEqual(out, '→ /wize');
});

test('compose returns → /wize for brownfield core-only', () => {
  const out = compose({ brownfield: true }, baseProfiles);
  assert.ok(out.includes('Brownfield detected'));
  assert.ok(out.endsWith('→ /wize'));
});

test('compose returns → /wize for all overlay profiles', () => {
  const profiles = [
    ...baseProfiles,
    { code: 'web-overlay' },
    { code: 'app-overlay' },
    { code: 'security-overlay' }
  ];
  const out = compose({ brownfield: true }, profiles);
  assert.ok(out.includes('Brownfield detected'));
  assert.ok(out.includes('Security pentest'));
  assert.ok(out.endsWith('→ /wize'));
});

test('compose output is always ≤3 lines', () => {
  const allProfiles = [
    { code: 'core' },
    { code: 'web-overlay' },
    { code: 'app-overlay' },
    { code: 'security-overlay' }
  ];
  const out = compose({ brownfield: true }, allProfiles);
  const lines = out.split('\n');
  assert.ok(lines.length <= 3, `expected ≤3 lines, got ${lines.length}: ${out}`);
});

test('compose output is always ≤3 lines for greenfield core-only', () => {
  const out = compose(baseDetection, baseProfiles);
  const lines = out.split('\n');
  assert.ok(lines.length <= 3, `expected ≤3 lines, got ${lines.length}: ${out}`);
});

test('security-overlay adds mention but does not break the one-line CTA', () => {
  const profiles = [
    ...baseProfiles,
    { code: 'security-overlay' }
  ];
  const out = compose({ brownfield: false }, profiles);
  assert.ok(out.includes('Security pentest'));
  assert.ok(out.endsWith('→ /wize'));
  const lines = out.split('\n');
  assert.ok(lines.length <= 3);
});

test('web-overlay and app-overlay do not add extra lines', () => {
  const profiles = [
    ...baseProfiles,
    { code: 'web-overlay' },
    { code: 'app-overlay' }
  ];
  const out = compose({ brownfield: false }, profiles);
  assert.strictEqual(out, '→ /wize');
});
