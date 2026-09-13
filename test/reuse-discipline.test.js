/*
 * Reuse-discipline tests — protects the "less code" machinery introduced in
 * v0.18.0: the reuse ladder in the generated AGENTS.md, the /wize-subtract
 * delete-list, the /wize-debt ledger, the Subtraction Hunter layer in
 * wize-code-review, and the retrospective's code accounting.
 *
 * These are behavioural guards: if any of them disappears, the kit silently
 * goes back to only *saying* it writes less code.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(KIT, rel), 'utf-8');

test('wize-subtract exists with the delete-list contract', () => {
  const skill = read('src/core-skills/wize-subtract/skill.md');
  assert.match(skill, /^code:\s*wize-subtract$/m);
  assert.match(skill, /^description:/m);
  // Every tag the review emits.
  for (const tag of ['delete:', 'stdlib:', 'native:', 'yagni:', 'shrink:']) {
    assert.ok(skill.includes(tag), `wize-subtract must define the \`${tag}\` tag`);
  }
  // The metric that makes the review falsifiable.
  assert.match(skill, /net: -<N> lines possible/);
  // The safety floor must be explicit, or the review will cut real protections.
  assert.match(skill, /chopping block/i);
  // It lists findings; it does not apply them.
  assert.match(skill, /does not apply/i);
});

test('wize-debt exists with the marker + ledger contract', () => {
  const skill = read('src/core-skills/wize-debt/skill.md');
  assert.match(skill, /^code:\s*wize-debt$/m);
  assert.match(skill, /^description:/m);
  assert.match(skill, /wize-debt:/);
  assert.match(skill, /ceiling/);
  assert.match(skill, /upgrade/);
  assert.match(skill, /no-trigger/);
  // Read-only: it must never edit the code it reports on.
  assert.match(skill, /Reads and reports/i);
});

test('wize-code-review runs the Subtraction Hunter as a fourth layer', () => {
  const step = read('src/method-skills/4-implementation/wize-code-review/steps/step-02-review.md');
  assert.match(step, /Subtraction Hunter/);
  assert.match(step, /wize-subtract/);
  const triage = read('src/method-skills/4-implementation/wize-code-review/steps/step-03-triage.md');
  assert.match(triage, /Subtraction Hunter/);
  assert.ok(triage.includes('subtract'), 'triage must accept the `subtract` source');
  const wf = read('src/method-skills/4-implementation/wize-code-review/workflow.md');
  assert.match(wf, /Blind Hunter, Edge Case Hunter, Subtraction Hunter, Acceptance Auditor/);
});

test('retrospective carries code accounting', () => {
  const retro = read('src/method-skills/4-implementation/wize-retrospective/workflow.md');
  assert.match(retro, /Code accounting/i);
  for (const metric of ['shortstat', 'Dependencies', 'wize-debt', 'Complexity']) {
    assert.ok(retro.includes(metric), `retro code accounting must cover \`${metric}\``);
  }
});

test('Shuri reconciles the debt marker instead of banning every TODO', () => {
  const persona = read('src/method-skills/4-implementation/wize-agent-dev/persona.md');
  assert.match(persona, /wize-debt:/);
  assert.ok(!/won't ship code with TODO comments/.test(persona), 'the blanket TODO ban must be gone');
  assert.match(persona, /wize-subtract/);
});

test('generated AGENTS.md carries the code ladder (always-on)', () => {
  const { renderAgentsMd } = require('../tools/installer/render-shared.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wdk-agents-'));
  try {
    renderAgentsMd(KIT, tmp, { profiles: ['core'] });
    const agents = fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf-8');
    assert.match(agents, /## Writing code \(always on\)/);
    // The seven rungs.
    for (const rung of ['YAGNI', 'Already in this codebase', 'standard library', 'platform or framework', 'installed dependency', 'one line', 'minimum code that works']) {
      assert.ok(agents.includes(rung), `AGENTS.md must carry the rung: ${rung}`);
    }
    // Anti-over-engineering rules + the safety floor.
    assert.match(agents, /Deletion over addition\. Boring over clever\. Fewest files possible\./);
    assert.match(agents, /Bug fix = root cause/);
    assert.match(agents, /Lazy, not negligent/);
    assert.match(agents, /wize-debt:/);
    assert.match(agents, /wize-subtract/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
