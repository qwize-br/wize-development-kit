// Regression test for the wize-sprint-planning hand-off section.
//
// After the planning workflow writes sprint-status.yaml with stories in
// ready-for-dev, the hand-off must suggest the dev loop pattern:
//   /loop /wize-dev-story
// so the user can drive one story at a time without re-invoking the
// workflow per story. This is non-blocking: the test fails loudly if the
// recommendation is removed, so a future edit can't silently drop it.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');
const WF = path.join(KIT, 'src/method-skills/4-implementation/wize-sprint-planning/workflow.md');

test('wize-sprint-planning hand-off suggests /loop /wize-dev-story', () => {
  assert.ok(fs.existsSync(WF), `workflow file missing at ${WF}`);
  const content = fs.readFileSync(WF, 'utf-8');

  // Locate the Hand-off section so we don't match stray comments.
  const handoffMatch = content.match(/## Hand-off\s*\n([\s\S]*?)(?:\n## |\s*$)/);
  assert.ok(handoffMatch, '## Hand-off section not found in wize-sprint-planning/workflow.md');
  const handoff = handoffMatch[1];

  assert.match(handoff, /\/loop/, 'hand-off must mention /loop');
  assert.match(handoff, /\/wize-dev-story/, 'hand-off must mention /wize-dev-story');
  assert.match(
    handoff,
    /\/loop\s+\/wize-dev-story/,
    'hand-off must suggest the combined "/loop /wize-dev-story" pattern'
  );
});
