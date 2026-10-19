// Tests for the install-time helpers: idempotent .gitignore injection
// and per-developer .wize/config/user.toml generation.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const {
  applyGitignore,
  generateUserToml,
  GITIGNORE_BEGIN,
  GITIGNORE_END,
  ALIAS_PATHS,
  buildGitignoreBlock
} = require(path.join(KIT, 'tools/installer/setup-helpers.js'));

function tmpRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('applyGitignore creates .gitignore when missing', () => {
  const root = tmpRoot('wize-gi-create-');
  const r = applyGitignore(root);
  assert.strictEqual(r.mode, 'created');
  assert.ok(r.changed);
  const content = fs.readFileSync(path.join(root, '.gitignore'), 'utf-8');
  assert.ok(content.includes(GITIGNORE_BEGIN), 'begin marker missing');
  assert.ok(content.includes(GITIGNORE_END), 'end marker missing');
  assert.match(content, /\.wize\/config\/user\.toml/);
  assert.match(content, /\.claude\/skills\/wize-\*/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('applyGitignore appends to existing .gitignore without removing user content', () => {
  const root = tmpRoot('wize-gi-append-');
  const existing = 'node_modules/\n.env\nbuild/\n';
  fs.writeFileSync(path.join(root, '.gitignore'), existing, 'utf-8');

  const r = applyGitignore(root);
  assert.strictEqual(r.mode, 'appended');
  const content = fs.readFileSync(path.join(root, '.gitignore'), 'utf-8');
  assert.match(content, /^node_modules\/$/m, 'pre-existing line lost');
  assert.match(content, /^\.env$/m);
  assert.match(content, /^build\/$/m);
  assert.ok(content.includes(GITIGNORE_BEGIN), 'begin marker missing');
  fs.rmSync(root, { recursive: true, force: true });
});

test('applyGitignore is idempotent — running twice yields the same content', () => {
  const root = tmpRoot('wize-gi-idem-');
  fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n', 'utf-8');

  const r1 = applyGitignore(root);
  const after1 = fs.readFileSync(path.join(root, '.gitignore'), 'utf-8');
  const r2 = applyGitignore(root);
  const after2 = fs.readFileSync(path.join(root, '.gitignore'), 'utf-8');

  assert.strictEqual(r1.mode, 'appended');
  assert.strictEqual(r2.mode, 'unchanged');
  assert.ok(!r2.changed, 'second run should report no change');
  assert.strictEqual(after1, after2, 'content must be byte-identical');
  fs.rmSync(root, { recursive: true, force: true });
});

test('applyGitignore replaces an outdated block without disturbing surrounding lines', () => {
  const root = tmpRoot('wize-gi-replace-');
  const stale = [
    'node_modules/',
    '',
    GITIGNORE_BEGIN,
    '# stale content from a previous kit version',
    '.wize/old-path/',
    GITIGNORE_END,
    '',
    'build/'
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, '.gitignore'), stale, 'utf-8');

  const r = applyGitignore(root);
  assert.strictEqual(r.mode, 'replaced');
  const content = fs.readFileSync(path.join(root, '.gitignore'), 'utf-8');
  assert.match(content, /^node_modules\/$/m, 'top user content lost');
  assert.match(content, /^build\/$/m, 'bottom user content lost');
  assert.doesNotMatch(content, /old-path/, 'stale block content survived');
  assert.match(content, /\.wize\/config\/user\.toml/, 'new block missing');
  fs.rmSync(root, { recursive: true, force: true });
});

test('applyGitignore in dryRun does not write the file', () => {
  const root = tmpRoot('wize-gi-dry-');
  const r = applyGitignore(root, { dryRun: true });
  assert.ok(r.changed);
  assert.strictEqual(r.mode, 'created');
  assert.ok(!fs.existsSync(path.join(root, '.gitignore')), '.gitignore should not have been written');
  fs.rmSync(root, { recursive: true, force: true });
});

test('generateUserToml embeds the name and leaves role commented when absent', () => {
  const content = generateUserToml({ name: 'André' });
  assert.match(content, /^\[user\]$/m);
  assert.match(content, /^name = "André"$/m);
  assert.match(content, /^# role = /m, 'role should be a commented placeholder when not provided');
  assert.match(content, /\[preferences\]/);
});

test('generateUserToml escapes embedded double quotes in name', () => {
  const content = generateUserToml({ name: 'A "tricky" Name' });
  assert.match(content, /^name = "A \\"tricky\\" Name"$/m);
});

test('generateUserToml renders role when explicitly provided', () => {
  const content = generateUserToml({ name: 'André', role: 'developer' });
  assert.match(content, /^role = "developer"$/m);
  assert.doesNotMatch(content, /^# role = /m);
});

test('ALIAS_PATHS holds exactly the 12 alias entrypoints', () => {
  assert.strictEqual(ALIAS_PATHS.length, 12);
  assert.strictEqual(new Set(ALIAS_PATHS).size, 12);
});

test('gitignore block lists every alias entry and .claude/worktrees/, with no brace patterns', () => {
  const block = buildGitignoreBlock();
  const lines = block.split('\n');
  for (const a of ALIAS_PATHS) assert.ok(lines.includes(a), `missing alias line ${a}`);
  assert.ok(lines.includes('.claude/worktrees/'));
  assert.ok(lines.includes('# Worktrees created inside the repo (Claude Code)'));
  assert.ok(lines.includes('.github/agents/wize-*.agent.md'));
  assert.ok(!block.includes('{'), 'gitignore has no brace expansion');
  assert.ok(!lines.some(l => /wize\*/.test(l) && !/wize-\*/.test(l)), 'no bare wize* glob');
  assert.ok(!lines.includes('.wize/security/'), 'security policy is not decided here');
  assert.match(block, /regenerate with `npx wize-dev-kit hydrate`/);
  assert.match(block, /Managed by wize-dev-kit \(install\/update\)/);
  // Each alias line follows its wize-* sibling.
  assert.ok(lines.indexOf('.claude/skills/wize/') === lines.indexOf('.claude/skills/wize-*') + 1);
});

test('replacing an old 0.26.1 block adds the alias lines and is then idempotent', () => {
  const root = tmpRoot('wize-gi-0261-');
  const old = [
    'node_modules/',
    '',
    GITIGNORE_BEGIN,
    '# Managed by `npx wize-dev-kit install`. Re-running install will update',
    '# the lines between the markers below; lines outside are untouched.',
    '',
    '# Personal / per-developer (do NOT commit)',
    '.wize/config/user.toml',
    '',
    '# Generated IDE adapter outputs (regenerate with `npx wize-dev-kit install`)',
    '.claude/skills/wize-*',
    '.cursor/rules/wize-*.mdc',
    GITIGNORE_END,
    '',
    '.wize/security/'
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, '.gitignore'), old, 'utf-8');

  const r1 = applyGitignore(root);
  assert.strictEqual(r1.mode, 'replaced');
  const after1 = fs.readFileSync(path.join(root, '.gitignore'), 'utf-8');
  for (const a of ALIAS_PATHS) assert.ok(after1.split('\n').includes(a), `missing ${a}`);
  assert.match(after1, /^node_modules\/$/m);
  assert.match(after1, /^\.wize\/security\/$/m, 'user line outside the block stays');

  const r2 = applyGitignore(root);
  assert.strictEqual(r2.mode, 'unchanged');
  assert.strictEqual(fs.readFileSync(path.join(root, '.gitignore'), 'utf-8'), after1);
  fs.rmSync(root, { recursive: true, force: true });
});

test('computeGitignore is pure and agrees with applyGitignore on every mode', () => {
  const { computeGitignore, applyGitignore } = require(path.join(KIT, 'tools/installer/setup-helpers.js'));
  const created = computeGitignore(null);
  assert.strictEqual(created.mode, 'created');
  assert.ok(created.changed);
  const appended = computeGitignore('node_modules/\n');
  assert.strictEqual(appended.mode, 'appended');
  assert.ok(appended.next.startsWith('node_modules/\n\n'));
  assert.strictEqual(computeGitignore(appended.next).mode, 'unchanged');
  assert.strictEqual(computeGitignore(appended.next).changed, false);
  const stale = appended.next.replace('.claude/skills/wize/\n', '');
  assert.strictEqual(computeGitignore(stale).mode, 'replaced');

  const root = tmpRoot('wize-gi-pure-');
  fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n');
  applyGitignore(root);
  assert.strictEqual(fs.readFileSync(path.join(root, '.gitignore'), 'utf-8'), appended.next);
});

// ---------- gitignoreBlockStatus (0.27.0) ----------

test('gitignoreBlockStatus: ok, drift, missing', () => {
  const { gitignoreBlockStatus, buildGitignoreBlock, GITIGNORE_BEGIN } = require(path.join(KIT, 'tools/installer/setup-helpers.js'));
  const block = buildGitignoreBlock();
  assert.strictEqual(gitignoreBlockStatus(null), 'missing');
  assert.strictEqual(gitignoreBlockStatus('node_modules/\n'), 'missing');
  assert.strictEqual(gitignoreBlockStatus(`node_modules/\n\n${block}\n\ndist/\n`), 'ok');
  assert.strictEqual(gitignoreBlockStatus(`${block}\n`.replace(/\n/g, '\r\n')), 'ok', 'CRLF is tolerated');
  assert.strictEqual(gitignoreBlockStatus(block.replace('.wize/.local/\n', '')), 'drift');
  assert.strictEqual(gitignoreBlockStatus(`${GITIGNORE_BEGIN}\nold\n# <<< wize-dev-kit (managed) <<<\n`), 'drift');
});
