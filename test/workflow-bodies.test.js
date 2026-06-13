// Guards that every workflow.md in the kit has actual body content
// (not the 0.1.x stubs). Threshold chosen so a stub of ~600 chars fails
// and the expanded 0.2.0 bodies (≥ 1.5 KB) pass.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { walk } = require('../tools/installer/validators/walk.js');

const KIT = path.resolve(__dirname, '..');
const MIN_BODY_BYTES = 1500;

// These workflows are intentionally short (very small surface, no body to
// expand without padding). They're allowlisted; everything else must clear
// the threshold.
// These workflows wrap concrete scaffolders / builders / orchestrator helpers
// whose contract is short by design. They reference the bigger playbooks /
// stack catalogs / agent spec for context.
const SHORT_ALLOWED = new Set([
  // Builder skills — body lives in the schema + agent spec
  'wize-create-agent',
  'wize-create-skill',
  'wize-create-workflow',
  // Overlay scaffolds — body lives in the stack catalogs + playbooks
  'wize-web-scaffold',
  'wize-web-deploy',
  'wize-web-seo-audit',
  'wize-app-scaffold',
  'wize-app-release-channels',
  'wize-app-store-listing',
  // Orchestrator helpers — handlers are short by intent
  'wize-onboarding',
  'wize-party-mode',
  // Research dispatchers — full body lives in step files + templates
  'wize-market-research',
  'wize-domain-research',
  'wize-technical-research'
]);

const workflowFiles = [
  ...walk(path.join(KIT, 'src/method-skills'), name => name === 'workflow.md'),
  ...walk(path.join(KIT, 'src/tea-skills'), name => name === 'workflow.md'),
  ...walk(path.join(KIT, 'src/orchestrator-skills'), name => name === 'workflow.md'),
  ...walk(path.join(KIT, 'src/builder-skills'), name => name === 'workflow.md'),
  ...walk(path.join(KIT, 'src/web-overlay'), name => name === 'workflow.md'),
  ...walk(path.join(KIT, 'src/app-overlay'), name => name === 'workflow.md')
];

assert.ok(workflowFiles.length > 0, 'no workflow.md files discovered — walker mis-wired');

for (const file of workflowFiles) {
  const rel = path.relative(KIT, file);
  test(`workflow has non-stub body: ${rel}`, () => {
    const content = fs.readFileSync(file, 'utf-8');
    const slug = path.basename(path.dirname(file));
    if (SHORT_ALLOWED.has(slug)) return;
    assert.ok(content.length >= MIN_BODY_BYTES,
      `${rel}: ${content.length} bytes (need ≥ ${MIN_BODY_BYTES}). Either expand it or add to SHORT_ALLOWED.`);
    const h2Count = (content.match(/^## /gm) || []).length;
    assert.ok(h2Count >= 4,
      `${rel}: only ${h2Count} H2 sections — workflows should be structured into multiple sections.`);
  });
}
