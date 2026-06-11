// Guards that every playbook + stack-catalog referenced by an overlay
// module.yaml actually exists on disk, so Mantis/Hawkeye/Tony don't try
// to open a phantom file at runtime.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');

const OVERLAYS = [
  {
    code: 'web-overlay',
    moduleYaml: path.join(KIT, 'src/web-overlay/module.yaml'),
    overlayRoot: path.join(KIT, 'src/web-overlay'),
    expectedPlaybooks: [
      'playbooks/wcag-aa.md',
      'playbooks/responsive-breakpoints.md',
      'playbooks/semantic-html.md',
      'playbooks/playwright-vitest.md',
      'playbooks/web-perf-budgets.md'
    ]
  },
  {
    code: 'app-overlay',
    moduleYaml: path.join(KIT, 'src/app-overlay/module.yaml'),
    overlayRoot: path.join(KIT, 'src/app-overlay'),
    expectedPlaybooks: [
      'playbooks/apple-hig.md',
      'playbooks/material-design-3.md',
      'playbooks/touch-targets-and-gestures.md',
      'playbooks/permissions-ux.md',
      'playbooks/detox-maestro.md',
      'playbooks/mobile-perf-budgets.md',
      'playbooks/device-matrix.md'
    ]
  }
];

function extractPlaybookRefs(yamlContent) {
  // Capture every "- playbooks/{file}.md" or `"playbooks/{file}.md"` line
  // referenced from any agent_playbooks entry.
  const refs = new Set();
  const re = /["']?(playbooks\/[a-z0-9-]+\.md)["']?/gi;
  let m;
  while ((m = re.exec(yamlContent)) !== null) refs.add(m[1]);
  return [...refs];
}

for (const overlay of OVERLAYS) {
  test(`${overlay.code}: every playbook referenced in module.yaml exists on disk`, () => {
    assert.ok(fs.existsSync(overlay.moduleYaml), `module.yaml missing: ${overlay.moduleYaml}`);
    const yaml = fs.readFileSync(overlay.moduleYaml, 'utf-8');
    const declared = extractPlaybookRefs(yaml);
    assert.ok(declared.length > 0, `${overlay.code} module.yaml lists no playbooks at all`);
    for (const rel of declared) {
      const full = path.join(overlay.overlayRoot, rel);
      assert.ok(fs.existsSync(full), `${overlay.code}: declared playbook is missing — ${rel}`);
      const content = fs.readFileSync(full, 'utf-8');
      assert.ok(content.length > 400, `${overlay.code}: playbook ${rel} looks empty/placeholder (< 400 chars)`);
      assert.match(content, /^---/, `${overlay.code}: playbook ${rel} missing frontmatter`);
    }
  });

  test(`${overlay.code}: all expected playbooks are present`, () => {
    for (const rel of overlay.expectedPlaybooks) {
      const full = path.join(overlay.overlayRoot, rel);
      assert.ok(fs.existsSync(full), `${overlay.code}: expected playbook missing — ${rel}`);
    }
  });

  test(`${overlay.code}: stack-catalog.md exists at overlay root`, () => {
    const catalog = path.join(overlay.overlayRoot, 'stack-catalog.md');
    assert.ok(fs.existsSync(catalog), `${overlay.code} stack-catalog.md missing`);
    const content = fs.readFileSync(catalog, 'utf-8');
    assert.ok(content.length > 1000, `${overlay.code} stack-catalog.md too short`);
    assert.match(content, /^---/, `${overlay.code} stack-catalog.md missing frontmatter`);
  });
}
