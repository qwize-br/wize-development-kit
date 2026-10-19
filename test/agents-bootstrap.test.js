// Managed AGENTS.md bootstrap block: rendered into new files, upserted by
// `update` into kit-generated files only, never into a foreign AGENTS.md.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { git, commitAll, KIT, KIT_VERSION, tmpDir, makeInstalledRepo } = require('./_helpers-git.js');
const shared = require(path.join(KIT, 'tools/installer/render-shared.js'));
const { planTrackedChanges, cmdUpdate } = require(path.join(KIT, 'tools/installer/commands/update.js'));

const { BOOTSTRAP_BEGIN, BOOTSTRAP_END, upsertBootstrapBlock, isKitAgentsMd } = shared;
const count = (text, needle) => text.split(needle).length - 1;

function renderNew() {
  const root = tmpDir('wize-ab-new-');
  shared.renderAgentsMd(KIT, root, { profiles: ['core'] });
  return fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf-8');
}

test('a new AGENTS.md has exactly one block, between the intro and Operating context', () => {
  const text = renderNew();
  assert.strictEqual(count(text, BOOTSTRAP_BEGIN), 1);
  assert.strictEqual(count(text, BOOTSTRAP_END), 1);
  const begin = text.indexOf(BOOTSTRAP_BEGIN);
  assert.ok(text.indexOf('Detailed artifacts live under') < begin);
  assert.ok(begin < text.indexOf('## Operating context'));
  assert.ok(text.startsWith('# Agents — Wize Development Kit'));
});

test('the block names version-check --json, hydrate and commands.pr, and no version number', () => {
  const block = shared.BOOTSTRAP_BLOCK;
  assert.ok(block.includes('version-check --json'));
  assert.ok(block.includes('`hydrate`'));
  assert.ok(block.includes('commands.pr'));
  assert.ok(block.includes('commands.update'));
  assert.ok(block.includes('use-pin'));
  assert.match(block, /Never commit a kit update on the default branch/);
  assert.ok(!/\d+\.\d+\.\d+/.test(block), 'version-agnostic, so update never churns it');
});

test('upsert twice is identical, and a freshly rendered file is already stable', () => {
  const rendered = renderNew();
  assert.strictEqual(upsertBootstrapBlock(rendered), rendered);
  const once = upsertBootstrapBlock('# Agents — Wize Development Kit\n\nIntro.\n\n## Roster\n\n- a\n');
  assert.strictEqual(upsertBootstrapBlock(once), once);
  assert.strictEqual(count(once, BOOTSTRAP_BEGIN), 1);
});

test('an old AGENTS.md without the block gets it once, before the first heading', () => {
  const old = '# Agents — Wize Development Kit\n\nIntro.\n\n## Operating context\n\nbody\n\n## Roster\n';
  const next = upsertBootstrapBlock(old);
  assert.strictEqual(count(next, BOOTSTRAP_BEGIN), 1);
  assert.ok(next.indexOf(BOOTSTRAP_BEGIN) < next.indexOf('## Operating context'));
  assert.ok(next.includes('body\n\n## Roster'));
});

test('with no heading the block is appended', () => {
  const next = upsertBootstrapBlock('# Agents — Wize Development Kit\n\nJust an intro.\n');
  assert.ok(next.startsWith('# Agents — Wize Development Kit\n\nJust an intro.\n\n' + BOOTSTRAP_BEGIN));
  assert.ok(next.endsWith(BOOTSTRAP_END + '\n'));
});

test('an edited block is replaced; text outside the markers is untouched', () => {
  const stale = `# Agents — Wize Development Kit\n\nintro\n\n<!-- wize:bootstrap:begin (old wording) -->\nold text\n${BOOTSTRAP_END}\n\n## Roster\nmine\n`;
  const next = upsertBootstrapBlock(stale);
  assert.ok(!next.includes('old text'));
  assert.strictEqual(count(next, 'wize:bootstrap:begin'), 1);
  assert.ok(next.endsWith('\n\n## Roster\nmine\n'));
});

test('a half-written block (one marker only) is left alone', () => {
  const broken = `# Agents — Wize Development Kit\n\n${BOOTSTRAP_BEGIN}\nno end marker\n## Roster\n`;
  assert.strictEqual(upsertBootstrapBlock(broken), broken);
});

test('isKitAgentsMd accepts only the generated title', () => {
  assert.ok(isKitAgentsMd('# Agents — Wize Development Kit\n\nx'));
  assert.ok(isKitAgentsMd('﻿# Agents — Wize Development Kit\r\nx'));
  assert.ok(!isKitAgentsMd('# My team agents\n\n## Rules\n'));
  assert.ok(!isKitAgentsMd(null));
});

test('update plans the block for a kit AGENTS.md and ignores a foreign one', () => {
  const kitMd = '# Agents — Wize Development Kit\n\nIntro.\n\n## Roster\n';
  const repo = makeInstalledRepo(path.join(tmpDir('wize-ab-plan-'), 'repo'), { pin: KIT_VERSION });
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), kitMd);
  const plan = planTrackedChanges(repo, KIT_VERSION);
  const entry = plan.files.find(f => f.path === 'AGENTS.md');
  assert.ok(entry && entry.content.includes(BOOTSTRAP_BEGIN));

  const foreign = '# Team rules\n\n## Rules\n\nbe kind\n';
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), foreign);
  assert.ok(!planTrackedChanges(repo, KIT_VERSION).files.some(f => f.path === 'AGENTS.md'));
});

test('update --in-place writes the block; a second run changes nothing', async () => {
  const repo = makeInstalledRepo(path.join(tmpDir('wize-ab-inplace-'), 'repo'), { pin: KIT_VERSION });
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), '# Agents — Wize Development Kit\n\nIntro.\n\n## Roster\n');
  commitAll(repo);
  const quiet = { log() {}, errlog() {} };
  await cmdUpdate({ kitRoot: KIT, projectRoot: repo, opts: { 'in-place': true, 'no-render': true, ...quiet } });
  const text = fs.readFileSync(path.join(repo, 'AGENTS.md'), 'utf-8');
  assert.strictEqual(count(text, BOOTSTRAP_BEGIN), 1);
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'bootstrap');
  const again = planTrackedChanges(repo, KIT_VERSION);
  assert.ok(again.converged, JSON.stringify(again.files.map(f => f.path)));
});

test('update leaves a foreign AGENTS.md byte for byte', async () => {
  const repo = makeInstalledRepo(path.join(tmpDir('wize-ab-foreign-'), 'repo'), { pin: KIT_VERSION });
  const foreign = '# Team rules\n\n## Rules\n\nbe kind\n';
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), foreign);
  commitAll(repo);
  await cmdUpdate({ kitRoot: KIT, projectRoot: repo, opts: { 'in-place': true, 'no-render': true, log() {}, errlog() {} } });
  assert.strictEqual(fs.readFileSync(path.join(repo, 'AGENTS.md'), 'utf-8'), foreign);
});

test('the bootstrap block asks before a pin-unpublished update, like the /wize skill', () => {
  const block = shared.BOOTSTRAP_BLOCK;
  assert.match(block, /`pin-unpublished`/);
  assert.match(block, /ask the user first/);
});

test('the block and the skills tell a worktree without the kit to merge it, not to install', () => {
  assert.match(shared.BOOTSTRAP_BLOCK, /kit-not-on-branch/);
  for (const rel of ['src/orchestrator-skills/wize/skill.md', 'src/orchestrator-skills/wize-help/skill.md', 'src/orchestrator-skills/wize-update/skill.md']) {
    const text = fs.readFileSync(path.join(__dirname, '..', rel), 'utf-8');
    assert.match(text, /kit-not-on-branch/, rel);
  }
});
