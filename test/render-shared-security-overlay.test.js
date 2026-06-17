'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { collectAssets } = require('../tools/installer/render-shared.js');

// Build a tiny kit-shaped fixture in a temp dir:
//   src/<overlay>/skills/<slug>/SKILL.md (overlay: web|app|security|<none>=core)
//   src/<overlay>/workflows/<wf>/workflow.md
// Walkers look for files literally named skill.md (workflow.md, agent.yaml),
// so we mirror that naming to drive collectAssets end-to-end.
function buildKit() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-render-sec-'));

  const make = (overlayDir, frontmatterOverlay) => {
    const dir = path.join(root, 'src', overlayDir, 'skills', 'a-skill');
    fs.mkdirSync(dir, { recursive: true });
    const fm = frontmatterOverlay
      ? `---\ncode: wize-${overlayDir}-skill\noverlay: ${frontmatterOverlay}\n---\n\nbody\n`
      : `---\ncode: wize-${overlayDir}-skill\n---\n\nbody\n`;
    // walkSkills expects the file to be literally named skill.md (lowercase).
    fs.writeFileSync(path.join(dir, 'skill.md'), fm);
  };

  make('web', 'web');
  make('app', 'app');
  make('security', 'security');
  make('core', null); // no overlay = always emitted

  return root;
}

test('collectAssets includes security-overlay skill only when profile is selected (AC-E01-2)', () => {
  const kit = buildKit();

  // Without security-overlay: security skill filtered out.
  const a = collectAssets(kit, { profiles: ['core', 'web-overlay', 'app-overlay'] });
  const codes = a.map(x => x.code).sort();
  assert.ok(codes.includes('wize-core-skill'), 'core skill should always be present');
  assert.ok(codes.includes('wize-web-skill'), 'web skill should be present (web-overlay in profiles)');
  assert.ok(codes.includes('wize-app-skill'), 'app skill should be present (app-overlay in profiles)');
  assert.ok(!codes.includes('wize-security-skill'), 'security skill should be filtered out');

  // With security-overlay: security skill emitted.
  const b = collectAssets(kit, { profiles: ['core', 'security-overlay'] });
  const codes2 = b.map(x => x.code).sort();
  assert.ok(codes2.includes('wize-security-skill'), 'security skill should be present (security-overlay in profiles)');
  assert.ok(!codes2.includes('wize-web-skill'), 'web skill should be filtered out when web-overlay absent');
});

test('collectAssets also filters workflows by overlay: security', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-render-sec-wf-'));
  const makeWf = (overlayDir, frontmatterOverlay) => {
    const dir = path.join(root, 'src', overlayDir, 'workflows', 'a-wf');
    fs.mkdirSync(dir, { recursive: true });
    const fm = frontmatterOverlay
      ? `---\ncode: wf-${overlayDir}\noverlay: ${frontmatterOverlay}\n---\n\nbody\n`
      : `---\ncode: wf-${overlayDir}\n---\n\nbody\n`;
    fs.writeFileSync(path.join(dir, 'workflow.md'), fm);
  };
  makeWf('web', 'web');
  makeWf('security', 'security');
  makeWf('core', null);

  const a = collectAssets(root, { profiles: ['core'] });
  assert.ok(a.map(x => x.code).includes('wf-core'));
  assert.ok(!a.map(x => x.code).includes('wf-web'));
  assert.ok(!a.map(x => x.code).includes('wf-security'));

  const b = collectAssets(root, { profiles: ['core', 'security-overlay'] });
  assert.ok(b.map(x => x.code).includes('wf-security'));
  assert.ok(!b.map(x => x.code).includes('wf-web'));
});