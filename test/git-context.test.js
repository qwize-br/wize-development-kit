'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const { gitContext, defaultBranch, trackedSet, hasRemote, worktreeList } = require(path.join(KIT, 'tools/installer/git-context.js'));
const { applyGitEnv, git, initRepo, commitAll } = require('./_helpers-git.js');

// git-context shells out with the inherited env; make it hermetic in-process.
applyGitEnv();

function tmp(prefix) {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function makeRepo() {
  const root = tmp('wize-gc-');
  initRepo(root);
  fs.writeFileSync(path.join(root, 'a.txt'), 'a\n');
  commitAll(root);
  return root;
}

test('primary checkout: not linked, on its branch', () => {
  const root = makeRepo();
  const ctx = gitContext(root);
  assert.strictEqual(ctx.isRepo, true);
  assert.strictEqual(ctx.linked, false);
  assert.strictEqual(ctx.branch, 'main');
  assert.strictEqual(ctx.detached, false);
  assert.strictEqual(ctx.primary, root);
  assert.strictEqual(ctx.toplevel, root);
  assert.match(ctx.head, /^[0-9a-f]{7,}$/);
});

test('linked worktree: linked, own branch, primary points at the main checkout', () => {
  const root = makeRepo();
  const wt = path.join(tmp('wize-gc-wt-'), 'feat');
  git(root, 'worktree', 'add', '-q', '-b', 'feat/x', wt);
  const ctx = gitContext(wt);
  assert.strictEqual(ctx.linked, true);
  assert.strictEqual(ctx.branch, 'feat/x');
  assert.strictEqual(ctx.primary, root);
  assert.strictEqual(ctx.toplevel, wt);
  assert.strictEqual(worktreeList(root).length, 2);
});

test('detached worktree: detached true, branch null', () => {
  const root = makeRepo();
  const wt = path.join(tmp('wize-gc-det-'), 'd');
  git(root, 'worktree', 'add', '-q', '--detach', wt);
  const ctx = gitContext(wt);
  assert.strictEqual(ctx.linked, true);
  assert.strictEqual(ctx.detached, true);
  assert.strictEqual(ctx.branch, null);
  assert.ok(ctx.head);
});

test('not a repo', () => {
  const dir = tmp('wize-gc-none-');
  const ctx = gitContext(dir);
  assert.strictEqual(ctx.isRepo, false);
  assert.strictEqual(ctx.linked, false);
  assert.strictEqual(trackedSet(dir), null, 'git failure is reported, not read as an empty repo');
  assert.strictEqual(defaultBranch(dir), null);
  assert.strictEqual(hasRemote(dir, 'origin'), false);
});

test('defaultBranch: local fallback, origin/HEAD, and none', () => {
  const root = makeRepo();
  assert.strictEqual(hasRemote(root, 'origin'), false);
  assert.strictEqual(defaultBranch(root), 'main');

  const remote = tmp('wize-gc-remote-');
  git(remote, 'init', '-q', '--bare', '-b', 'trunk');
  git(root, 'remote', 'add', 'origin', remote);
  assert.strictEqual(hasRemote(root, 'origin'), true);
  git(root, 'branch', '-m', 'trunk');
  git(root, 'push', '-q', 'origin', 'trunk');
  git(root, 'remote', 'set-head', 'origin', 'trunk');
  assert.strictEqual(defaultBranch(root), 'trunk');

  const odd = tmp('wize-gc-odd-');
  initRepo(odd);
  fs.writeFileSync(path.join(odd, 'x'), 'x');
  commitAll(odd);
  git(odd, 'branch', '-m', 'develop');
  assert.strictEqual(defaultBranch(odd), null);
});

test('defaultBranch honors init.defaultBranch', () => {
  const odd = tmp('wize-gc-cfg-');
  initRepo(odd);
  fs.writeFileSync(path.join(odd, 'x'), 'x');
  commitAll(odd);
  git(odd, 'branch', '-m', 'develop');
  git(odd, 'config', 'init.defaultBranch', 'develop');
  assert.strictEqual(defaultBranch(odd), 'develop');
});

test('trackedSet lists absolute paths of tracked files only', () => {
  const root = makeRepo();
  fs.writeFileSync(path.join(root, 'untracked.txt'), 'u');
  const set = trackedSet(root);
  assert.ok(set.has(path.join(root, 'a.txt')));
  assert.ok(!set.has(path.join(root, 'untracked.txt')));
});

test('trackedSet from a monorepo subdirectory also lists tracked files elsewhere in the repository', () => {
  const root = makeRepo();
  fs.mkdirSync(path.join(root, 'app'));
  fs.mkdirSync(path.join(root, 'shared'));
  fs.writeFileSync(path.join(root, 'app/a.txt'), 'a');
  fs.writeFileSync(path.join(root, 'shared/s.txt'), 's');
  commitAll(root, 'mono');
  const set = trackedSet(path.join(root, 'app'));
  assert.ok(set.has(path.join(root, 'app/a.txt')));
  assert.ok(set.has(path.join(root, 'shared/s.txt')), 'a tracked file outside the project directory');
});

// A repository with `.claude/skills` as a submodule that tracks one skill file.
function repoWithSkillsSubmodule(prefix) {
  const sub = tmp(`${prefix}sub-`);
  initRepo(sub);
  fs.mkdirSync(path.join(sub, 'wize-help'));
  fs.writeFileSync(path.join(sub, 'wize-help/SKILL.md'), 'TEAM SKILL\n');
  commitAll(sub);
  const root = makeRepo();
  fs.mkdirSync(path.join(root, '.claude'));
  git(root, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', sub, '.claude/skills');
  commitAll(root, 'add submodule');
  return root;
}

test('trackedSet treats everything inside a submodule as tracked', () => {
  const root = repoWithSkillsSubmodule('wize-gc-subm-');
  const set = trackedSet(root);
  assert.ok(set.has(path.join(root, '.claude/skills/wize-help/SKILL.md')), 'a file the submodule tracks');
  assert.ok(set.has(path.join(root, '.claude/skills/wize-new/SKILL.md')), 'a path that does not exist yet, inside it');
  assert.ok(set.has(path.join(root, '.claude/skills')), 'the gitlink itself');
  assert.ok(!set.has(path.join(root, '.claude/skills-other/x')), 'a sibling with the same prefix');
  assert.ok(!set.has(path.join(root, 'untracked.txt')));
});

test('falls back to the .git entry when the git binary is missing', () => {
  const root = makeRepo();
  const wt = path.join(tmp('wize-gc-fb-'), 'wt');
  git(root, 'worktree', 'add', '-q', '-b', 'fb', wt);
  const savedPath = process.env.PATH;
  process.env.PATH = path.join(os.tmpdir(), 'wize-no-git-bin');
  try {
    const primary = gitContext(root);
    assert.strictEqual(primary.isRepo, true);
    assert.strictEqual(primary.linked, false);
    const linked = gitContext(wt);
    assert.strictEqual(linked.isRepo, true);
    assert.strictEqual(linked.linked, true);
    assert.strictEqual(linked.branch, null);
    assert.strictEqual(trackedSet(root), null);
  } finally {
    process.env.PATH = savedPath;
  }
});

test('falls back to a .git above the root when git is missing (monorepo subdir)', () => {
  const root = makeRepo();
  const sub = path.join(root, 'apps', 'web');
  fs.mkdirSync(sub, { recursive: true });
  const savedPath = process.env.PATH;
  process.env.PATH = path.join(os.tmpdir(), 'wize-no-git-bin');
  try {
    const ctx = gitContext(sub);
    assert.strictEqual(ctx.isRepo, true);
    assert.strictEqual(ctx.toplevel, fs.realpathSync(root));
  } finally {
    process.env.PATH = savedPath;
  }
});

test('trackedUnder lists tracked files for the given pathspecs only', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-gc-tu-'));
  initRepo(dir);
  fs.mkdirSync(path.join(dir, 'a/wize'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'a/wize/x.md'), 'x');
  fs.writeFileSync(path.join(dir, 'a/other.md'), 'x');
  fs.writeFileSync(path.join(dir, 'wize.md'), 'x');
  commitAll(dir);
  const { trackedUnder } = require(path.join(KIT, 'tools/installer/git-context.js'));
  assert.deepStrictEqual(trackedUnder(dir, ['a/wize/', 'wize.md', 'missing/']).sort(), ['a/wize/x.md', 'wize.md']);
  assert.deepStrictEqual(trackedUnder(dir, []), []);
  assert.deepStrictEqual(trackedUnder(os.tmpdir(), ['x']), []);
  fs.rmSync(dir, { recursive: true, force: true });
});
