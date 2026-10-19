/*
 * Ship-discipline tests — protects the v0.24.0 rules: the step-0 branch guard,
 * proof-per-type in dev-story, commit-pinned evidence in TEA, the pre-PR rebase
 * rule, and the multi-agent lines in the generated AGENTS.md.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(KIT, rel), 'utf-8');

const DEV_STORY = 'src/method-skills/4-implementation/wize-dev-story/workflow.md';
const QUICK_DEV = 'src/method-skills/4-implementation/wize-quick-dev/workflow.md';

test('dev-story and quick-dev carry the branch guard', () => {
  for (const rel of [DEV_STORY, QUICK_DEV]) {
    const text = read(rel);
    assert.match(text, /Branch guard/, `${rel} must have a branch guard step`);
    assert.ok(text.includes('git branch --show-current'), `${rel} must read the current branch`);
    assert.ok(text.includes('git symbolic-ref refs/remotes/origin/HEAD'), `${rel} must resolve the default branch, not hardcode it`);
    assert.match(text, /feat\/<story-id>|fix\/<slug>/, `${rel} must name the branch to create`);
  }
});

test('dev-story step 10 defines proof per change type, baseline and hosting', () => {
  const text = read(DEV_STORY);
  assert.match(text, /By change type/);
  assert.match(text, /`untested` needs a reason/);
  assert.match(text, /never by switching branch or stashing/);
  assert.match(text, /Never an anonymous or public third-party host/);
  assert.match(text, /PII, tokens, internal URLs and admin screens/);
  assert.match(read(QUICK_DEV), /before captured pre-fix/);
});

test('TEA pins evidence to a commit and treats untested as not-met', () => {
  const review = read('src/tea-skills/wize-tea-review/workflow.md');
  assert.match(review, /plus the commit SHA/);
  assert.match(review, /Evidence from a commit other than HEAD/);
  const gate = read('src/tea-skills/wize-tea-gate/workflow.md');
  assert.match(gate, /unpinned/);
  assert.match(gate, /`untested` counts as `not-met`, unless \*\*WAIVED\*\*/);
  assert.match(read('src/orchestrator-skills/wize-check/skill.md'), /Evidence names the commit/);
});

test('wize-pre-pr-check rebases and restricts force pushes', () => {
  const skill = read('src/core-skills/wize-pre-pr-check/skill.md');
  assert.match(skill, /rebase/);
  assert.ok(skill.includes('--force-with-lease'));
  assert.match(skill, /nunca `--force` puro/);
});

test('generated AGENTS.md carries the plan-is-not-edit and multi-agent lines', () => {
  const { renderAgentsMd } = require('../tools/installer/render-shared.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wdk-agents-'));
  try {
    renderAgentsMd(KIT, tmp, { profiles: ['core'] });
    const agents = fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf-8');
    assert.match(agents, /never implies editing, pushing or publishing/);
    assert.match(agents, /If several agents share a repo: one branch or worktree per agent/);
    assert.match(agents, /--force-with-lease/);
    assert.match(agents, /regenerate lockfiles instead of hand-merging/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('playwright playbook documents success-path capture', () => {
  const pb = read('src/web-overlay/playbooks/playwright-vitest.md');
  assert.match(pb, /Capturing proof \(success path\)/);
  assert.match(pb, /recordVideo/);
  assert.match(pb, /finally \{ await context\.close\(\); \}/);
});
