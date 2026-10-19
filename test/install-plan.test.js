// Unit tests for tools/installer/install-plan.js (decisions behind install/uninstall).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { applyGitEnv, git, initRepo, tmpDir, KIT, CLI, makeInstalledRepo } = require('./_helpers-git.js');

applyGitEnv();
const plan = require(path.join(KIT, 'tools/installer/install-plan.js'));

function projectToml(dir, body) {
  fs.mkdirSync(path.join(dir, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.wize/config/project.toml'), body);
}

const TOML = `[project]
name = "x"
kit_version = "0.27.0"

[install]
profiles = ["core", "web-overlay"]
ide_targets = ["claude-code", "generic"]

[language]
communication = "en"
document_output = "en"
`;

test('checkInstallRoot: installed / nested / subdir / ok / --here', () => {
  const root = tmpDir('wize-plan-root-');
  initRepo(root);
  const sub = path.join(root, 'a', 'b');
  fs.mkdirSync(sub, { recursive: true });

  assert.strictEqual(plan.checkInstallRoot({ cwd: root }).status, 'ok');
  const subdir = plan.checkInstallRoot({ cwd: sub });
  assert.strictEqual(subdir.status, 'subdir');
  assert.strictEqual(subdir.toplevel, root);
  assert.strictEqual(plan.checkInstallRoot({ cwd: sub, flags: { here: true } }).status, 'ok');

  projectToml(root, TOML);
  assert.strictEqual(plan.checkInstallRoot({ cwd: root }).status, 'installed');
  const nested = plan.checkInstallRoot({ cwd: sub });
  assert.strictEqual(nested.status, 'nested');
  assert.strictEqual(nested.root, root);
  assert.match(nested.message, /^kit already installed at .+; run from there$/);
  assert.strictEqual(plan.checkInstallRoot({ cwd: sub, flags: { here: true } }).status, 'ok');
  fs.rmSync(root, { recursive: true, force: true });
});

test('checkInstallRoot: a non-git directory is ok and never climbs', () => {
  const dir = tmpDir('wize-plan-nogit-');
  const r = plan.checkInstallRoot({ cwd: dir });
  assert.strictEqual(r.status, 'ok');
  assert.strictEqual(r.ctx.isRepo, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('checkInstallRoot: a .git file (linked worktree) counts as the repo root', () => {
  const base = tmpDir('wize-plan-wt-');
  const primary = path.join(base, 'main-repo');
  fs.mkdirSync(primary);
  initRepo(primary);
  git(primary, 'commit', '-q', '--allow-empty', '-m', 'init');
  const wt = path.join(base, 'wt');
  git(primary, 'worktree', 'add', '-q', wt, '-b', 'b');
  assert.strictEqual(plan.checkInstallRoot({ cwd: wt }).status, 'ok');
  assert.strictEqual(plan.defaultProjectName({ cwd: wt }), 'main-repo');
  fs.rmSync(base, { recursive: true, force: true });
});

test('conflictingFlags compares profiles/targets as sets and lang to communication', () => {
  const root = tmpDir('wize-plan-conf-');
  projectToml(root, TOML);
  assert.deepStrictEqual(plan.conflictingFlags({ flags: {}, root }), []);
  assert.deepStrictEqual(plan.conflictingFlags({ flags: { targets: 'generic,claude-code', profiles: 'web-overlay,core', lang: 'en' }, root }), []);
  assert.deepStrictEqual(plan.conflictingFlags({ flags: { profiles: 'web-overlay' }, root }), []);
  assert.deepStrictEqual(plan.conflictingFlags({ flags: { targets: 'claude-code' }, root }), ['--targets']);
  assert.deepStrictEqual(plan.conflictingFlags({ flags: { profiles: 'core', targets: 'cursor', lang: 'pt-BR' }, root }), ['--profiles', '--targets', '--lang']);
  fs.rmSync(root, { recursive: true, force: true });
});

test('installedPin reads kit_version and degrades to "unknown"', () => {
  const root = tmpDir('wize-plan-pin-');
  assert.strictEqual(plan.installedPin(root), 'unknown');
  projectToml(root, TOML);
  assert.strictEqual(plan.installedPin(root), '0.27.0');
  fs.rmSync(root, { recursive: true, force: true });
});

test('name precedence: specific flag > --name > derived', () => {
  const dir = tmpDir('wize-plan-names-');
  const cwd = path.join(dir, 'proj');
  fs.mkdirSync(cwd);
  assert.strictEqual(plan.resolveProjectName({ flags: { 'project-name': 'P', name: 'N' }, cwd }), 'P');
  assert.strictEqual(plan.resolveProjectName({ flags: { name: 'N' }, cwd }), 'N');
  assert.strictEqual(plan.resolveProjectName({ flags: {}, cwd }), 'proj');
  assert.strictEqual(plan.resolveUserName({ flags: { 'user-name': 'U', name: 'N' }, cwd }), 'U');
  assert.strictEqual(plan.resolveUserName({ flags: { name: 'N' }, cwd }), 'N');
  assert.strictEqual(plan.resolveUserName({ flags: {}, cwd }), null, 'interactive: caller prompts');
  assert.strictEqual(plan.resolveUserName({ flags: {}, cwd, env: { USER: 'bob' }, nonInteractive: true }) !== '', true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('baselineDecision: env wins, --baseline forces, existing docs block, greenfield skips', () => {
  const root = tmpDir('wize-plan-bl-');
  assert.deepStrictEqual(plan.baselineDecision({ root, env: { WIZE_SKIP_BASELINE: '1' }, flags: { baseline: true }, brownfield: true }), { run: false, reason: 'env' });
  assert.deepStrictEqual(plan.baselineDecision({ root, env: {}, flags: {}, brownfield: false }), { run: false, reason: 'greenfield' });
  assert.deepStrictEqual(plan.baselineDecision({ root, env: {}, flags: { baseline: true }, brownfield: false }), { run: true, reason: 'forced' });
  assert.deepStrictEqual(plan.baselineDecision({ root, env: {}, flags: {}, brownfield: true }), { run: true, reason: 'brownfield' });
  fs.mkdirSync(path.join(root, '.wize/knowledge/document-project'), { recursive: true });
  assert.strictEqual(plan.baselineDecision({ root, env: {}, flags: {}, brownfield: true }).run, true, 'an empty dir is not a baseline');
  fs.writeFileSync(path.join(root, '.wize/knowledge/document-project/overview.md'), 'x');
  assert.deepStrictEqual(plan.baselineDecision({ root, env: {}, flags: {}, brownfield: true }), { run: false, reason: 'exists' });
  assert.strictEqual(plan.baselineDecision({ root, env: {}, flags: { baseline: true }, brownfield: true }).run, true);
  fs.rmSync(root, { recursive: true, force: true });
});

test('resolveUninstallRoot: finds the root, refuses from a subdir, --root is explicit', () => {
  const root = tmpDir('wize-plan-un-');
  initRepo(root);
  projectToml(root, TOML);
  const sub = path.join(root, 'x');
  fs.mkdirSync(sub);
  assert.deepStrictEqual(plan.resolveUninstallRoot({ cwd: root, env: {} }), { root, explicit: false, refused: false });
  assert.deepStrictEqual(plan.resolveUninstallRoot({ cwd: sub, env: {} }), { root, explicit: false, refused: true });
  assert.deepStrictEqual(plan.resolveUninstallRoot({ cwd: sub, flags: { root }, env: {} }), { root, explicit: true, refused: false });
  assert.deepStrictEqual(plan.resolveUninstallRoot({ cwd: sub, flags: { root: '..' }, env: {} }), { root, explicit: true, refused: false });
  assert.strictEqual(plan.resolveUninstallRoot({ cwd: sub, env: { WIZE_PROJECT_ROOT: root } }).refused, false);
  fs.rmSync(root, { recursive: true, force: true });
});

test('checkInstallRoot: a linked worktree whose branch lacks the kit, while the primary has it', () => {
  const primary = makeInstalledRepo(path.join(tmpDir('wize-plan-prim-'), 'p'));
  const old = path.join(path.dirname(primary), 'old');
  const empty = git(primary, 'hash-object', '-t', 'tree', '/dev/null');
  git(primary, 'branch', 'older', git(primary, 'commit-tree', empty, '-m', 'old'));
  git(primary, 'worktree', 'add', '-q', old, 'older');
  const r = plan.checkInstallRoot({ cwd: old });
  assert.strictEqual(r.status, 'primary');
  assert.strictEqual(r.root, fs.realpathSync(primary));
  assert.match(r.message, /kit is installed on .+'s branch/);
  assert.strictEqual(plan.checkInstallRoot({ cwd: old, flags: { here: true } }).status, 'ok');

  const { spawnSync } = require('node:child_process');
  const { GIT_ENV } = require('./_helpers-git.js');
  const run = spawnSync(process.execPath, [CLI, 'install', '--yes'], { cwd: old, encoding: 'utf-8', env: { ...GIT_ENV, WIZE_SKIP_BASELINE: '1' } });
  assert.strictEqual(run.status, 0, run.stderr);
  assert.match(run.stdout, /skipping install/);
  assert.ok(!fs.existsSync(path.join(old, '.wize')));
  assert.ok(!fs.existsSync(path.join(old, 'AGENTS.md')));
});

test('checkInstallRoot: a subdirectory of a linked worktree that already has the kit is nested, not primary', () => {
  const primary = makeInstalledRepo(path.join(tmpDir('wize-plan-nested-wt-'), 'p'));
  git(primary, 'add', '-A');
  git(primary, 'commit', '-q', '--allow-empty', '-m', 'kit');
  const wt = path.join(path.dirname(primary), 'wt');
  git(primary, 'worktree', 'add', '-q', wt, '-b', 'feat');
  const sub = path.join(wt, 'sub');
  fs.mkdirSync(sub);
  const r = plan.checkInstallRoot({ cwd: sub });
  assert.strictEqual(r.status, 'nested');
  assert.strictEqual(r.root, fs.realpathSync(wt));
});

// A bare repository with worktrees has no primary checkout: wt[0] is the bare dir.
function bareLayout(prefix, { kitOnMain = true } = {}) {
  const base = tmpDir(prefix);
  const seed = makeInstalledRepo(path.join(base, 'seed'));
  git(seed, 'add', '-A');
  git(seed, 'commit', '-q', '--allow-empty', '-m', 'kit');
  const bare = path.join(base, 'repo.git');
  git(base, 'clone', '-q', '--bare', seed, bare);
  const empty = git(bare, 'hash-object', '-t', 'tree', '/dev/null');
  git(bare, 'branch', 'older', git(bare, 'commit-tree', empty, '-m', 'old'));
  const main = path.join(base, 'main');
  if (kitOnMain) git(bare, 'worktree', 'add', '-q', main, 'main');
  const old = path.join(base, 'old');
  git(bare, 'worktree', 'add', '-q', old, 'older');
  return { base, bare, main: kitOnMain ? fs.realpathSync(main) : null, old: fs.realpathSync(old) };
}

test('checkInstallRoot: bare repo + worktrees, the kit on the default-branch worktree is found', () => {
  const { main, old } = bareLayout('wize-plan-bare-');
  const r = plan.checkInstallRoot({ cwd: old });
  assert.strictEqual(r.status, 'primary');
  assert.strictEqual(r.root, main);
  assert.strictEqual(plan.checkInstallRoot({ cwd: old, flags: { here: true } }).status, 'ok');
});

test('checkInstallRoot: bare repo + worktrees, any non-bare worktree with the kit counts', () => {
  const { base, bare, old } = bareLayout('wize-plan-bare-any-', { kitOnMain: false });
  const feat = path.join(base, 'feat');
  git(bare, 'worktree', 'add', '-q', feat, 'main');
  const r = plan.checkInstallRoot({ cwd: old });
  assert.strictEqual(r.status, 'primary');
  assert.strictEqual(r.root, fs.realpathSync(feat));
});

test('checkInstallRoot: bare repo + worktrees with no kit anywhere is a fresh install', () => {
  const base = tmpDir('wize-plan-bare-none-');
  const seed = path.join(base, 'seed');
  fs.mkdirSync(seed);
  initRepo(seed);
  git(seed, 'commit', '-q', '--allow-empty', '-m', 'init');
  const bare = path.join(base, 'repo.git');
  git(base, 'clone', '-q', '--bare', seed, bare);
  const wt = path.join(base, 'wt');
  git(bare, 'worktree', 'add', '-q', wt, 'main');
  assert.strictEqual(plan.checkInstallRoot({ cwd: wt }).status, 'ok');
});
