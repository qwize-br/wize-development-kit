'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CLI_PATH = path.join(__dirname, '..', 'tools', 'installer', 'wize-cli.js');

test('PROFILES contains security-overlay entry (AC-E01-1)', () => {
  const src = fs.readFileSync(CLI_PATH, 'utf8');

  // Match the security-overlay entry in the PROFILES array.
  // Shape: { code: 'security-overlay', label: 'Wize Security (AI Pentester overlay)', required: false }
  const entryRe =
    /\{\s*code:\s*'security-overlay'\s*,\s*label:\s*'([^']+)'\s*,\s*required:\s*(true|false)\s*\}/;
  const m = src.match(entryRe);
  assert.ok(m, 'security-overlay entry not found in PROFILES');
  assert.equal(m[2], 'false', 'security-overlay must be required: false (optional)');
  assert.match(m[1], /Security/);
  assert.match(m[1], /Pentester/);
});

test('PROFILES entry sits alongside web-overlay and app-overlay (sanity)', () => {
  const src = fs.readFileSync(CLI_PATH, 'utf8');
  const webIdx = src.indexOf("code: 'web-overlay'");
  const appIdx = src.indexOf("code: 'app-overlay'");
  const secIdx = src.indexOf("code: 'security-overlay'");
  assert.ok(webIdx > 0 && appIdx > 0 && secIdx > 0, 'expected all three overlay entries in PROFILES');
  assert.ok(webIdx < secIdx, 'security-overlay should be appended after web-overlay');
  assert.ok(appIdx < secIdx, 'security-overlay should be appended after app-overlay');
});

test('install emits authorized-use disclaimer when security-overlay is selected (AC-E01-4)', () => {
  const src = fs.readFileSync(CLI_PATH, 'utf8');
  // The disclaimer should be conditional on security-overlay being in the selected profiles,
  // and contain the canonical warning text.
  assert.match(
    src,
    /security-overlay[\s\S]{0,400}Uso autorizado/,
    'expected a disclaimer printed when security-overlay is selected'
  );
  assert.match(src, /Uso autorizado[\s\S]{0,400}scope\.md/);
});
