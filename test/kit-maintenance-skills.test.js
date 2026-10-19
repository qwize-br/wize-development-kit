// Text guards for the kit-maintenance loop: the action-driven Step 2.5 in
// /wize and /wize-help, and /wize-update as the single maintenance entrypoint.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(KIT, rel), 'utf-8');

const WIZE = 'src/orchestrator-skills/wize/skill.md';
const HELP = 'src/orchestrator-skills/wize-help/skill.md';
const UPDATE = 'src/orchestrator-skills/wize-update/skill.md';

function step25(text) {
  const m = /## Step 2\.5[^\n]*\n([\s\S]*?)(?=\n## Step 3)/.exec(text);
  assert.ok(m, 'Step 2.5 section missing');
  return m[1];
}

for (const rel of [WIZE, HELP]) {
  test(`${rel} Step 2.5 follows the action field once per conversation`, () => {
    const s = step25(read(rel));
    for (const needle of ['version-check --json', '`action`', '`hydrate`', '`update`', '`use-pin`', '`install`', 'commands.hydrate', 'commands.update', 'commands.pr']) {
      assert.ok(s.includes(needle), `${rel}: ${needle}`);
    }
    assert.match(s, /once per conversation/);
    assert.match(s, /Never compare versions by hand/);
    assert.match(s, /Abrir PR do bump do kit\? \(git push\)/);
    assert.match(s, /No Bash: one line suggesting `\/wize-update`/);
  });

  test(`${rel} Step 2.5 keeps following hydrate when update checks are disabled`, () => {
    const s = step25(read(rel));
    assert.doesNotMatch(s, /\| `none`, or `disabled: true`/);
    assert.match(s, /\| `none` \| Say nothing\. \|/);
    assert.match(s, /`disabled: true` only turns off update checks[^\n]*`hydrate`/);
  });

  test(`${rel} Step 2.5 never lowers the pin unattended`, () => {
    const s = step25(read(rel));
    assert.match(s, /`pin-unpublished`/);
    assert.match(s, /Never run it unattended/);
    assert.match(s, /Rebaixar o pin\?/);
  });

  test(`${rel} Step 2.5 no longer compares versions by hand`, () => {
    const s = step25(read(rel));
    assert.ok(!/Compare its `installed` field/.test(s));
    assert.ok(!s.includes('npm view'));
  });
}

test('wize-update is kit maintenance: hydrate, update, one push confirmation', () => {
  const text = read(UPDATE);
  assert.ok(text.includes('version-check --json'));
  assert.ok(text.includes('update --pr'));
  assert.ok(text.includes('commands.hydrate'));
  assert.match(text, /worktree/);
  assert.match(text, /never commit on the default branch/i);
  assert.match(text, /never force-push/);
  assert.match(text, /Abrir PR do bump do kit\? \(git push\)/);
  assert.match(text, /git push -u origin chore\/wize-kit-/);
  assert.match(text, /update --in-place/);
  assert.ok(!text.includes('Never run Step 3 without this confirmation'));
  assert.ok(!text.includes('npm view'));
});

test('wize-update never switches branches or runs --in-place without asking', () => {
  const text = read(UPDATE);
  const fallbacks = text.slice(text.indexOf('Fallbacks:'), text.indexOf('Rules:'));
  const bullet = fallbacks.split('\n').find(l => /commit fails/.test(l));
  assert.ok(bullet, 'commit-failure fallback present');
  assert.match(bullet, /relay the hook/);
  assert.match(bullet, /only after a yes/);
  assert.doesNotMatch(text, /switch to a feature branch and run/);
  assert.doesNotMatch(text, /Everything local runs without asking/);
});

test('wize-update asks before the push, not before the local branch', () => {
  const text = read(UPDATE);
  const update = text.indexOf('## Step 3');
  const pr = text.indexOf('## Step 4');
  assert.ok(update > 0 && pr > update);
  assert.ok(!/confirm/i.test(text.slice(update, pr).replace(/It is idempotent[^\n]*/, '')), 'Step 3 must not ask for confirmation');
  assert.ok(/Ask once/.test(text.slice(pr)));
});

test('wize-help carries the hydrate hint and the adapters-missing heuristic', () => {
  const text = read(HELP);
  assert.match(text, /Adapters ausentes[^\n]*hydrate/);
  assert.ok(text.includes('hydrate path'));
});

test('module.yaml describes wize-update as maintenance', () => {
  const y = read('src/orchestrator-skills/module.yaml');
  const m = /code: wize-update\n[^\n]*\n\s+description: "([^"]*)"/.exec(y);
  assert.ok(m);
  assert.match(m[1], /hydrate/i);
  assert.match(m[1], /PR/);
});

test('dogfood copies no longer recommend npm view', () => {
  for (const rel of ['.cursor/rules/wize-help.mdc', '.kimi/skills/wize-help/SKILL.md', '.opencode/commands/wize-help.md', '.wize/agents/wize-help.md']) {
    const text = read(rel);
    assert.ok(!text.includes('npm view wize-dev-kit version'), rel);
    assert.ok(text.includes('version-check --json'), rel);
  }
});
