'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { compose } = require('../tools/installer/onboarding.js');

const baseDetection = { brownfield: false };
const baseProfiles = [{ code: 'core' }];

test('compose includes wize-sec-pentest hint when security-overlay is selected (AC-E01-5)', () => {
  const profiles = [...baseProfiles, { code: 'security-overlay' }];
  const out = compose(baseDetection, profiles);
  assert.match(out, /\/wize-sec-pentest/);
  assert.match(out, /overlay/);
});

test('compose does NOT include wize-sec-pentest hint when security-overlay is absent', () => {
  const out = compose(baseDetection, baseProfiles);
  assert.doesNotMatch(out, /\/wize-sec-pentest/);
});

test('compose keeps existing overlay hints (regression)', () => {
  const profiles = [
    ...baseProfiles,
    { code: 'web-overlay' },
    { code: 'app-overlay' },
    { code: 'security-overlay' }
  ];
  const out = compose(baseDetection, profiles);
  assert.match(out, /\/wize-web-scaffold/);
  assert.match(out, /\/wize-app-scaffold/);
  assert.match(out, /\/wize-sec-pentest/);
});