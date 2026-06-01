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
  GITIGNORE_END
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
