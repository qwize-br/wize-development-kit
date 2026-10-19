'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const KIT = path.resolve(__dirname, '..');
const { findProjectRoot, resolveRoot } = require(path.join(KIT, 'tools/installer/project-root.js'));
const { GIT_ENV, initRepo } = require('./_helpers-git.js');

const CLI = path.join(KIT, 'tools/installer/wize-cli.js');

function tmp(prefix) {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function seed(root) {
  fs.mkdirSync(path.join(root, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(root, '.wize/config/project.toml'),
    '[project]\nname = "t"\nkit_version = "0.0.1"\n\n[install]\nprofiles = ["core"]\nide_targets = ["claude-code"]\n');
}

test('findProjectRoot resolves a subdirectory to the project root', () => {
  const root = tmp('wize-pr-sub-');
  initRepo(root);
  seed(root);
  const deep = path.join(root, 'a/b/c');
  fs.mkdirSync(deep, { recursive: true });
  assert.strictEqual(findProjectRoot(deep), root);
  assert.strictEqual(findProjectRoot(root), root);
});

test('findProjectRoot stops at a nested .git FILE boundary', () => {
  const root = tmp('wize-pr-boundary-');
  seed(root);
  const child = path.join(root, 'child');
  fs.mkdirSync(path.join(child, 'src'), { recursive: true });
  fs.writeFileSync(path.join(child, '.git'), 'gitdir: /somewhere/else\n');
  assert.strictEqual(findProjectRoot(path.join(child, 'src')), null);
});

test('findProjectRoot with no .git anywhere checks only the start dir', () => {
  const root = tmp('wize-pr-nogit-');
  seed(root);
  const sub = path.join(root, 'sub');
  fs.mkdirSync(sub);
  assert.strictEqual(findProjectRoot(sub), null, 'never climbs without a git boundary');
  assert.strictEqual(findProjectRoot(root), root);
});

test('resolveRoot precedence: --root > WIZE_PROJECT_ROOT > ORCA (hydrate only) > walk > cwd', () => {
  const a = tmp('wize-rr-a-');
  const b = tmp('wize-rr-b-');
  const c = tmp('wize-rr-c-');
  const proj = tmp('wize-rr-proj-');
  initRepo(proj);
  seed(proj);
  const sub = path.join(proj, 'sub');
  fs.mkdirSync(sub);

  assert.strictEqual(resolveRoot({ flags: { root: a }, env: { WIZE_PROJECT_ROOT: b, ORCA_WORKTREE_PATH: c }, cwd: sub, forCommand: 'hydrate' }), a);
  assert.strictEqual(resolveRoot({ flags: {}, env: { WIZE_PROJECT_ROOT: b, ORCA_WORKTREE_PATH: c }, cwd: sub, forCommand: 'hydrate' }), b);
  assert.strictEqual(resolveRoot({ flags: {}, env: { ORCA_WORKTREE_PATH: c }, cwd: sub, forCommand: 'hydrate' }), proj, 'a project found from cwd beats an inherited ORCA_WORKTREE_PATH');
  assert.strictEqual(resolveRoot({ flags: {}, env: { ORCA_WORKTREE_PATH: c }, cwd: a, forCommand: 'hydrate' }), c, 'ORCA_WORKTREE_PATH used when cwd finds no project');
  assert.strictEqual(resolveRoot({ flags: {}, env: { ORCA_WORKTREE_PATH: c }, cwd: sub, forCommand: 'sync' }), proj, 'ORCA ignored outside hydrate');
  assert.strictEqual(resolveRoot({ flags: {}, env: {}, cwd: sub, forCommand: 'sync' }), proj);
  assert.strictEqual(resolveRoot({ flags: {}, env: {}, cwd: a, forCommand: 'sync' }), a, 'falls back to cwd');
  assert.strictEqual(resolveRoot({ flags: { root: true }, env: {}, cwd: sub }), proj, 'valueless --root is ignored');
});

test('resolveRoot resolves a relative --root against cwd', () => {
  const base = tmp('wize-rr-rel-');
  fs.mkdirSync(path.join(base, 'p'));
  assert.strictEqual(resolveRoot({ flags: { root: 'p' }, env: {}, cwd: base }), path.join(base, 'p'));
});

test('CLI doctor and sync find the project from a subdirectory', () => {
  const root = tmp('wize-pr-cli-');
  initRepo(root);
  seed(root);
  const sub = path.join(root, 'deep/er');
  fs.mkdirSync(sub, { recursive: true });

  const doctor = spawnSync(process.execPath, [CLI, 'doctor'], { cwd: sub, env: GIT_ENV, encoding: 'utf-8', timeout: 30000 });
  assert.doesNotMatch(doctor.stdout + doctor.stderr, /No \.wize\/config\/project\.toml found/);

  const sync = spawnSync(process.execPath, [CLI, 'sync'], { cwd: sub, env: GIT_ENV, encoding: 'utf-8', timeout: 30000 });
  assert.strictEqual(sync.status, 0, sync.stderr);
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md')), 'rendered at the root');
  assert.ok(!fs.existsSync(path.join(sub, '.claude')), 'nothing written in the subdirectory');
});

test('CLI --root and a boolean flag before a positional keep the positional', () => {
  const root = tmp('wize-pr-cliroot-');
  seed(root);
  const elsewhere = tmp('wize-pr-else-');
  const r = spawnSync(process.execPath, [CLI, 'sync', '--root', root], { cwd: elsewhere, env: GIT_ENV, encoding: 'utf-8', timeout: 30000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md')));

  const wizeDirs = spawnSync(process.execPath, [CLI, 'agent', '--root', root, 'list'], { cwd: elsewhere, env: GIT_ENV, encoding: 'utf-8', timeout: 30000 });
  assert.strictEqual(wizeDirs.status, 0, wizeDirs.stderr);
});

test('source: wize-cli.js no longer passes process.cwd() as projectRoot for sync/update/doctor/document-project', () => {
  const src = fs.readFileSync(CLI, 'utf-8');
  assert.doesNotMatch(src, /projectRoot:\s*process\.cwd\(\)/);
  assert.match(src, /resolveRoot\(/);
});

test('source: wize-cli.js declares the boolean flag set', () => {
  const src = fs.readFileSync(CLI, 'utf-8');
  const m = src.match(/const BOOLEAN_FLAGS = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(m, 'BOOLEAN_FLAGS missing');
  for (const f of ['yes', 'json', 'quiet', 'strict', 'check', 'dry-run', 'if-needed', 'no-delegate', 'no-notice', 'no-render', 'in-place', 'pr', 'allow-downgrade', 'exit-code', 'refresh', 'here', 'force', 'baseline']) {
    assert.ok(m[1].includes(`'${f}'`), `missing ${f}`);
  }
});
