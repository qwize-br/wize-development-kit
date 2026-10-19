// `wize-dev-kit update`: isolated branch by default, --pr, --in-place, --check,
// downgrade guard and honest results. CLI behavior is tested by spawn (the CLI
// runs main() at load); planning logic is tested through the exports.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  GIT_ENV, git, commitAll, CLI, KIT, KIT_VERSION, tmpDir, makeInstalledRepo, addWorktree
} = require('./_helpers-git.js');
const { planTrackedChanges, cmdUpdate } = require(path.join(KIT, 'tools/installer/commands/update.js'));
const ops = require(path.join(KIT, 'tools/installer/git-ops.js'));

const BRANCH = `chore/wize-kit-${KIT_VERSION}`;
const OLD = '0.20.0';

function runCli(cwd, args, { env = {}, path: pathOverride } = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf-8',
    env: { ...GIT_ENV, ...(pathOverride ? { PATH: pathOverride } : {}), ...env }
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// A `gh` that logs its argv and answers `pr view` / `pr create` from env.
function stubGh(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const log = path.join(dir, 'gh.log');
  fs.writeFileSync(path.join(dir, 'gh'), `#!/bin/sh
echo "$@" >> "${log}"
case "$1 $2" in
  "pr view") if [ -n "$GH_VIEW" ]; then echo "$GH_VIEW"; exit 0; else exit 1; fi ;;
  "pr create") if [ "$GH_CREATE_FAIL" = 1 ]; then echo boom >&2; exit 1; fi; echo "https://github.com/o/r/pull/7"; exit 0 ;;
  *) exit 0 ;;
esac
`, { mode: 0o755 });
  return { dir, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf-8').split('\n').filter(Boolean) : []) };
}

// PATH with git and node but no gh.
function pathWithoutGh(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const which = (bin) => spawnSync('sh', ['-c', `command -v ${bin}`], { encoding: 'utf-8' }).stdout.trim();
  fs.symlinkSync(which('git'), path.join(dir, 'git'));
  fs.symlinkSync(process.execPath, path.join(dir, 'node'));
  return dir;
}

function addOrigin(repo) {
  const bare = path.join(tmpDir('wize-bare-'), 'origin.git');
  fs.mkdirSync(bare);
  git(bare, 'init', '--bare', '-q', '-b', 'main');
  git(repo, 'remote', 'add', 'origin', bare);
  git(repo, 'push', '-q', '-u', 'origin', 'main');
  git(repo, 'remote', 'set-head', 'origin', 'main');
  return bare;
}

// An installed project as 0.26 left it: pin 0.20.0, no managed .gitignore
// block, the `wize` aliases and a deliberately tracked wize-* file committed.
function legacyRepo(prefix, { origin = true } = {}) {
  const dir = makeInstalledRepo(path.join(tmpDir(prefix), 'repo'), { pin: OLD, gitignore: false });
  for (const rel of ['.claude/skills/wize/SKILL.md', '.cursor/rules/wize.mdc', '.wize/agents/wize.md', '.claude/skills/wize-dogfood/SKILL.md']) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), `# ${rel}\n`);
  }
  fs.writeFileSync(path.join(dir, 'README.md'), 'hello\n');
  git(dir, 'add', '--', '.claude', '.cursor', '.wize/agents', 'README.md');
  git(dir, 'commit', '-q', '-m', 'aliases');
  const bare = origin ? addOrigin(dir) : null;
  return { dir, bare };
}

const worktreeCount = (dir) => git(dir, 'worktree', 'list').split('\n').length;
const branchExists = (dir, b) => { try { git(dir, 'rev-parse', '--verify', '-q', `refs/heads/${b}`); return true; } catch { return false; } };
const tracked = (dir, ref) => git(dir, 'ls-tree', '-r', '--name-only', ref).split('\n');

// ---- 1. pin rewrite is honest ------------------------------------------------

function plainProject(toml) {
  const dir = tmpDir('wize-upd-plain-');
  fs.mkdirSync(path.join(dir, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.wize/config/project.toml'), toml);
  return dir;
}

test('in-place keeps the pin comment and reports the verified write', () => {
  const dir = plainProject(`[project]\nname = "x"\nkit_version = "${OLD}"  # pinned\n\n[install]\nide_targets = ["generic"]\nprofiles = ["core"]\n`);
  const r = runCli(dir, ['update', '--in-place', '--no-render']);
  assert.strictEqual(r.code, 0, r.err);
  const toml = fs.readFileSync(path.join(dir, '.wize/config/project.toml'), 'utf-8');
  assert.match(toml, new RegExp(`^kit_version = "${KIT_VERSION.replace(/\./g, '\\.')}"  # pinned$`, 'm'));
  assert.match(r.out, new RegExp(`✓ project\\.toml kit_version → ${KIT_VERSION.replace(/\./g, '\\.')}`));
});

test('an unborn HEAD (git init, no commits) updates in place instead of failing', () => {
  const dir = plainProject(`[project]\nname = "x"\nkit_version = "${OLD}"\n\n[install]\nide_targets = ["generic"]\nprofiles = ["core"]\n`);
  git(dir, 'init', '-q');
  const r = runCli(dir, ['update', '--no-render']);
  assert.strictEqual(r.code, 0, r.err);
  assert.match(r.out, /\(in-place\)/);
  assert.match(fs.readFileSync(path.join(dir, '.wize/config/project.toml'), 'utf-8'), new RegExp(`kit_version = "${KIT_VERSION.replace(/\./g, '\\.')}"`));
});

test('an unborn HEAD with --pr still fails (nothing to branch from)', () => {
  const dir = plainProject(`[project]\nname = "x"\nkit_version = "${OLD}"\n`);
  git(dir, 'init', '-q');
  const r = runCli(dir, ['update', '--pr', '--no-render']);
  assert.strictEqual(r.code, 1);
});

test('in-place inserts a missing kit_version', () => {
  const dir = plainProject('[project]\nname = "x"\n\n[install]\nide_targets = ["generic"]\nprofiles = ["core"]\n');
  const r = runCli(dir, ['update', '--in-place', '--no-render']);
  assert.strictEqual(r.code, 0, r.err);
  assert.match(fs.readFileSync(path.join(dir, '.wize/config/project.toml'), 'utf-8'), new RegExp(`^kit_version = "${KIT_VERSION.replace(/\./g, '\\.')}"$`, 'm'));
});

test('an unwritable kit_version exits 1 and prints no success mark', () => {
  const dir = plainProject('[project]\nname = "x"\nkit_version = 5\n');
  const before = fs.readFileSync(path.join(dir, '.wize/config/project.toml'), 'utf-8');
  const r = runCli(dir, ['update', '--in-place', '--no-render']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /could not write kit_version in project\.toml/);
  assert.ok(!r.out.includes('✓'), r.out);
  assert.strictEqual(fs.readFileSync(path.join(dir, '.wize/config/project.toml'), 'utf-8'), before);
});

test('update without project.toml exits 1 and says to install first', () => {
  const dir = tmpDir('wize-upd-empty-');
  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /run install first/);
});

// ---- 2. downgrade guard ----------------------------------------------------------

test('a pin ahead of the binary is refused unless --allow-downgrade', () => {
  const dir = plainProject('[project]\nname = "x"\nkit_version = "9.9.9"\n');
  const file = path.join(dir, '.wize/config/project.toml');
  const before = fs.readFileSync(file);
  const r = runCli(dir, ['update', '--in-place', '--no-render']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, new RegExp(`project pinned to 9\\.9\\.9, this kit is ${KIT_VERSION.replace(/\./g, '\\.')}; run: npx wize-dev-kit@latest update`));
  assert.ok(fs.readFileSync(file).equals(before));

  const ok = runCli(dir, ['update', '--in-place', '--no-render', '--allow-downgrade']);
  assert.strictEqual(ok.code, 0, ok.err);
  assert.match(fs.readFileSync(file, 'utf-8'), new RegExp(`kit_version = "${KIT_VERSION.replace(/\./g, '\\.')}"`));
});

// ---- 3. default (isolated) mode ----------------------------------------------------

test('default mode prepares one commit on chore/wize-kit-<to> and leaves the checkout alone', () => {
  const { dir } = legacyRepo('wize-upd-iso-');
  fs.writeFileSync(path.join(dir, 'README.md'), 'dirty edit\n');
  fs.writeFileSync(path.join(dir, 'scratch.txt'), 'untracked\n');
  const mainBefore = git(dir, 'rev-parse', 'main');
  const statusBefore = git(dir, 'status', '--porcelain');
  const indexBefore = git(dir, 'ls-files', '-s');
  const wtBefore = worktreeCount(dir);

  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.match(r.out, /Restart your harness after the change reaches this checkout/);

  assert.ok(branchExists(dir, BRANCH));
  assert.strictEqual(git(dir, 'rev-list', '--count', `main..${BRANCH}`), '1');
  assert.strictEqual(git(dir, 'log', '-1', '--format=%s', BRANCH), `chore(wize): bump kit ${OLD} -> ${KIT_VERSION}`);
  const changed = git(dir, 'diff', '--name-only', `main..${BRANCH}`).split('\n').sort();
  assert.deepStrictEqual(changed, [
    '.claude/skills/wize/SKILL.md', '.cursor/rules/wize.mdc', '.gitignore', '.wize/agents/wize.md', '.wize/config/project.toml'
  ]);

  assert.strictEqual(git(dir, 'rev-parse', 'main'), mainBefore);
  assert.strictEqual(git(dir, 'status', '--porcelain'), statusBefore);
  assert.strictEqual(git(dir, 'ls-files', '-s'), indexBefore);
  assert.strictEqual(git(dir, 'rev-parse', 'HEAD'), mainBefore);
  assert.strictEqual(worktreeCount(dir), wtBefore);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'README.md'), 'utf-8'), 'dirty edit\n');
  assert.match(git(dir, 'show', `${BRANCH}:.wize/config/project.toml`), new RegExp(`kit_version = "${KIT_VERSION.replace(/\./g, '\\.')}"`));
  assert.match(fs.readFileSync(path.join(dir, '.wize/config/project.toml'), 'utf-8'), new RegExp(`kit_version = "${OLD}"`));
});

// ---- 8. alias untrack ---------------------------------------------------------------

test('aliases are untracked on the branch yet stay on disk; other wize-* files stay tracked', () => {
  const { dir } = legacyRepo('wize-upd-alias-');
  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 0, r.err);
  const files = tracked(dir, BRANCH);
  for (const p of ['.claude/skills/wize/SKILL.md', '.cursor/rules/wize.mdc', '.wize/agents/wize.md']) {
    assert.ok(!files.includes(p), `${p} should be untracked on ${BRANCH}`);
    assert.ok(fs.existsSync(path.join(dir, p)), `${p} should remain on disk in the primary`);
  }
  assert.ok(files.includes('.claude/skills/wize-dogfood/SKILL.md'), 'deliberately tracked wize-* file stays');
  assert.ok(git(dir, 'show', `${BRANCH}:.gitignore`).includes('.claude/skills/wize/'));
});

// ---- 4. any starting point ------------------------------------------------------------

test('works from a linked worktree on a feature branch', () => {
  const { dir } = legacyRepo('wize-upd-linked-');
  const wt = addWorktree(dir, path.join(path.dirname(dir), 'wt'), 'feat/x');
  const mainBefore = git(dir, 'rev-parse', 'main');
  const headBefore = git(wt, 'rev-parse', 'HEAD');
  const r = runCli(wt, ['update']);
  assert.strictEqual(r.code, 0, r.err);
  assert.ok(branchExists(dir, BRANCH));
  assert.strictEqual(git(wt, 'rev-parse', 'HEAD'), headBefore);
  assert.strictEqual(git(wt, 'symbolic-ref', '--short', 'HEAD'), 'feat/x');
  assert.strictEqual(git(dir, 'rev-parse', 'main'), mainBefore);
  assert.strictEqual(worktreeCount(dir), 2);
});

test('works from a detached HEAD', () => {
  const { dir } = legacyRepo('wize-upd-detached-');
  git(dir, 'checkout', '-q', '--detach');
  const head = git(dir, 'rev-parse', 'HEAD');
  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 0, r.err);
  assert.ok(branchExists(dir, BRANCH));
  assert.strictEqual(git(dir, 'rev-parse', 'HEAD'), head);
  assert.strictEqual(git(dir, 'rev-parse', 'main'), head);
});

test('works from a subdirectory project root inside a repo', () => {
  const root = tmpDir('wize-upd-mono-');
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  const sub = path.join(repo, 'apps/web');
  makeInstalledRepo(sub, { pin: OLD, gitignore: false });
  fs.rmSync(path.join(sub, '.git'), { recursive: true });
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'init');
  const r = runCli(sub, ['update']);
  assert.strictEqual(r.code, 0, r.err);
  assert.match(git(repo, 'show', `${BRANCH}:apps/web/.wize/config/project.toml`), new RegExp(`kit_version = "${KIT_VERSION.replace(/\./g, '\\.')}"`));
  assert.ok(git(repo, 'show', `${BRANCH}:apps/web/.gitignore`).includes('wize-dev-kit (managed)'));
  assert.strictEqual(worktreeCount(repo), 1);
});

// ---- 5. convergence and idempotence ----------------------------------------------------

test('an already converged project creates no branch', () => {
  const { dir } = legacyRepo('wize-upd-conv-');
  const out = runCli(dir, ['update']);
  assert.strictEqual(out.code, 0);
  git(dir, 'merge', '-q', '--ff-only', BRANCH);
  git(dir, 'push', '-q', 'origin', 'main');
  git(dir, 'branch', '-q', '-D', BRANCH);
  const again = runCli(dir, ['update']);
  assert.strictEqual(again.code, 0, again.err);
  assert.match(again.out, new RegExp(`already converged at ${KIT_VERSION.replace(/\./g, '\\.')}`));
  assert.ok(!branchExists(dir, BRANCH));
});

test('a rerun after the branch exists adds no commit', () => {
  const { dir } = legacyRepo('wize-upd-rerun-');
  assert.strictEqual(runCli(dir, ['update']).code, 0);
  const tip = git(dir, 'rev-parse', BRANCH);
  const again = runCli(dir, ['update']);
  assert.strictEqual(again.code, 0, again.err);
  assert.match(again.out, new RegExp(`already prepared on ${BRANCH.replace(/[./]/g, '\\$&')}`));
  assert.strictEqual(git(dir, 'rev-parse', BRANCH), tip);
  assert.strictEqual(git(dir, 'rev-list', '--count', `main..${BRANCH}`), '1');
});

test('a prepared branch checked out elsewhere is reported, not recommitted', () => {
  const { dir } = legacyRepo('wize-upd-elsewhere-');
  assert.strictEqual(runCli(dir, ['update']).code, 0);
  const wt = path.join(path.dirname(dir), 'prep');
  git(dir, 'worktree', 'add', '-q', wt, BRANCH);
  const again = runCli(dir, ['update']);
  assert.strictEqual(again.code, 0, again.err);
  assert.match(again.out, /already prepared on .+ \(.*prep\)/);
});

test('a branch checked out elsewhere with pending work exits 1', () => {
  const { dir } = legacyRepo('wize-upd-elsewhere2-');
  const wt = path.join(path.dirname(dir), 'prep');
  git(dir, 'worktree', 'add', '-q', wt, '-b', BRANCH);
  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, new RegExp(`${BRANCH.replace(/[./]/g, '\\$&')} is checked out at .*prep; finish it there`));
  assert.strictEqual(git(dir, 'rev-list', '--count', `main..${BRANCH}`), '0');
});

// ---- 6. --pr ------------------------------------------------------------------------------

test('--pr pushes the branch without force and creates the PR with gh', () => {
  const { dir, bare } = legacyRepo('wize-upd-pr-');
  const gh = stubGh(path.join(tmpDir('wize-gh-'), 'bin'));
  const mainBefore = git(dir, 'rev-parse', 'main');
  const r = runCli(dir, ['update', '--pr'], { path: `${gh.dir}:${process.env.PATH}` });
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.strictEqual(git(bare, 'rev-parse', `refs/heads/${BRANCH}`), git(dir, 'rev-parse', BRANCH));
  assert.strictEqual(git(bare, 'rev-parse', 'refs/heads/main'), mainBefore);
  const create = gh.calls().find(c => c.startsWith('pr create'));
  assert.ok(create, gh.calls().join('\n'));
  assert.ok(create.includes(`--base main --head ${BRANCH}`), create);
  assert.match(r.out, /https:\/\/github\.com\/o\/r\/pull\/7/);
  assert.strictEqual(git(dir, 'rev-parse', 'main'), mainBefore);
});

test('--pr with an open PR prints its URL and creates nothing', () => {
  const { dir } = legacyRepo('wize-upd-pr-open-');
  const gh = stubGh(path.join(tmpDir('wize-gh-'), 'bin'));
  const r = runCli(dir, ['update', '--pr'], {
    path: `${gh.dir}:${process.env.PATH}`,
    env: { GH_VIEW: '{"url":"https://github.com/o/r/pull/3","state":"OPEN"}' }
  });
  assert.strictEqual(r.code, 0, r.err);
  assert.match(r.out, /https:\/\/github\.com\/o\/r\/pull\/3/);
  assert.ok(!gh.calls().some(c => c.startsWith('pr create')));
});

test('--pr without gh prints the GitHub compare URL', () => {
  const { dir } = legacyRepo('wize-upd-pr-nogh-');
  git(dir, 'config', 'remote.origin.pushurl', git(dir, 'remote', 'get-url', 'origin'));
  git(dir, 'config', 'remote.origin.url', 'git@github.com:acme/widgets.git');
  const bin = pathWithoutGh(path.join(tmpDir('wize-nogh-'), 'bin'));
  const r = runCli(dir, ['update', '--pr', '--base', 'main'], { path: bin });
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.ok(r.out.includes(`https://github.com/acme/widgets/compare/main...${BRANCH}?expand=1`), r.out);
});

test('--pr falls back to the compare URL when gh pr create fails', () => {
  const { dir } = legacyRepo('wize-upd-pr-ghfail-');
  git(dir, 'config', 'remote.origin.pushurl', git(dir, 'remote', 'get-url', 'origin'));
  git(dir, 'config', 'remote.origin.url', 'https://github.com/acme/widgets.git');
  const gh = stubGh(path.join(tmpDir('wize-gh-'), 'bin'));
  const r = runCli(dir, ['update', '--pr', '--base', 'main'], { path: `${gh.dir}:${process.env.PATH}`, env: { GH_CREATE_FAIL: '1' } });
  assert.strictEqual(r.code, 0, r.err);
  assert.ok(r.out.includes(`https://github.com/acme/widgets/compare/main...${BRANCH}?expand=1`), r.out);
});

test('--pr without an origin exits 1 and keeps the branch locally', () => {
  const { dir } = legacyRepo('wize-upd-pr-noorigin-', { origin: false });
  const r = runCli(dir, ['update', '--pr']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, new RegExp(`no origin remote; branch ${BRANCH.replace(/[./]/g, '\\$&')} kept locally`));
  assert.ok(branchExists(dir, BRANCH));
});

test('--pr refuses to overwrite a diverged remote branch', () => {
  const { dir, bare } = legacyRepo('wize-upd-pr-diverged-');
  git(dir, 'checkout', '-q', '-b', 'other');
  fs.writeFileSync(path.join(dir, 'other.txt'), 'x\n');
  commitAll(dir, 'other');
  git(dir, 'push', '-q', 'origin', `other:${BRANCH}`);
  const remoteTip = git(bare, 'rev-parse', `refs/heads/${BRANCH}`);
  git(dir, 'checkout', '-q', 'main');
  git(dir, 'branch', '-q', '-D', 'other');
  const r = runCli(dir, ['update', '--pr']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, new RegExp(`remote ${BRANCH.replace(/[./]/g, '\\$&')} diverged; resolve manually`));
  assert.strictEqual(git(bare, 'rev-parse', `refs/heads/${BRANCH}`), remoteTip);
});

// The weekly Action and a second developer start from a checkout without the
// local branch while origin already carries this update.
function cloneOf(bare) {
  const dir = path.join(tmpDir('wize-clone-'), 'clone');
  git(path.dirname(dir), 'clone', '-q', bare, dir);
  return dir;
}

test('--pr from a fresh clone reuses an update branch that origin already carries', () => {
  const { dir, bare } = legacyRepo('wize-upd-pr-again-');
  const gh = stubGh(path.join(tmpDir('wize-gh-'), 'bin'));
  assert.strictEqual(runCli(dir, ['update', '--pr'], { path: `${gh.dir}:${process.env.PATH}` }).code, 0);
  const remoteTip = git(bare, 'rev-parse', `refs/heads/${BRANCH}`);

  const other = cloneOf(bare);
  assert.ok(!branchExists(other, BRANCH));
  const open = runCli(other, ['update', '--pr', '--base', 'origin/main'], {
    path: `${gh.dir}:${process.env.PATH}`,
    env: { GH_VIEW: '{"url":"https://github.com/o/r/pull/3","state":"OPEN"}' }
  });
  assert.strictEqual(open.code, 0, open.err + open.out);
  assert.match(open.out, /already prepared on origin\//);
  assert.match(open.out, /https:\/\/github\.com\/o\/r\/pull\/3/);
  assert.strictEqual(git(bare, 'rev-parse', `refs/heads/${BRANCH}`), remoteTip, 'the remote branch is untouched');
  assert.ok(!branchExists(other, BRANCH), 'no local branch is built');
  assert.strictEqual(worktreeCount(other), 1, 'no temp worktree left behind');

  // The earlier PR was closed but its branch kept: a new PR is opened for it.
  const createsBefore = gh.calls().filter(c => c.startsWith('pr create')).length;
  const closed = runCli(other, ['update', '--pr', '--base', 'origin/main'], {
    path: `${gh.dir}:${process.env.PATH}`,
    env: { GH_VIEW: '{"url":"https://github.com/o/r/pull/3","state":"CLOSED"}' }
  });
  assert.strictEqual(closed.code, 0, closed.err + closed.out);
  assert.strictEqual(gh.calls().filter(c => c.startsWith('pr create')).length, createsBefore + 1);
});

test('--pr with a local branch built apart from the converged remote one opens the PR instead of failing', () => {
  const { dir, bare } = legacyRepo('wize-upd-pr-twin-');
  const gh = stubGh(path.join(tmpDir('wize-gh-'), 'bin'));
  const other = cloneOf(bare);
  assert.strictEqual(runCli(other, ['update'], { env: { GIT_COMMITTER_DATE: '2020-01-01T00:00:00Z' } }).code, 0);
  assert.strictEqual(runCli(dir, ['update', '--pr'], { path: `${gh.dir}:${process.env.PATH}` }).code, 0);
  assert.notStrictEqual(git(other, 'rev-parse', BRANCH), git(bare, 'rev-parse', `refs/heads/${BRANCH}`), 'two different commits, same content');

  const r = runCli(other, ['update', '--pr'], {
    path: `${gh.dir}:${process.env.PATH}`,
    env: { GH_VIEW: '{"url":"https://github.com/o/r/pull/3","state":"OPEN"}' }
  });
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.match(r.out, /already carries this update/);
  assert.match(r.out, /pull\/3/);
});

test('--pr cannot be combined with --in-place', () => {
  const { dir } = legacyRepo('wize-upd-pr-inplace-');
  const r = runCli(dir, ['update', '--pr', '--in-place']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /--pr and --in-place cannot be combined/);
});

// ---- base selection ---------------------------------------------------------------------------

test('without a reachable origin the local default branch is used with a warning', () => {
  const { dir } = legacyRepo('wize-upd-nofetch-', { origin: false });
  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 0, r.err);
  assert.match(r.out, /using local main; fetch failed/);
  assert.ok(branchExists(dir, BRANCH));
});

test('the base is fetched from origin when origin has moved ahead', () => {
  const { dir, bare } = legacyRepo('wize-upd-fetch-');
  const other = path.join(path.dirname(dir), 'other');
  git(path.dirname(dir), 'clone', '-q', bare, other);
  fs.writeFileSync(path.join(other, 'upstream.txt'), 'u\n');
  git(other, 'add', '-A');
  git(other, 'commit', '-q', '-m', 'upstream');
  git(other, 'push', '-q', 'origin', 'main');
  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 0, r.err);
  assert.ok(tracked(dir, BRANCH).includes('upstream.txt'), 'branch is based on the fetched origin/main');
  assert.strictEqual(git(dir, 'rev-parse', `${BRANCH}~1`), git(dir, 'rev-parse', 'origin/main'));
});

test('--base with an unknown ref exits 1', () => {
  const { dir } = legacyRepo('wize-upd-badbase-');
  const r = runCli(dir, ['update', '--base', 'nope']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /base nope not found/);
});

test('a base without project.toml aborts', () => {
  const { dir } = legacyRepo('wize-upd-nobaseproj-');
  git(dir, 'checkout', '-q', '--orphan', 'bare');
  git(dir, 'rm', '-rfq', '.');
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'empty');
  git(dir, 'checkout', '-q', 'main');
  fs.mkdirSync(path.join(dir, '.wize/config'), { recursive: true });
  const r = runCli(dir, ['update', '--base', 'bare']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /project\.toml not found on bare/);
});

// ---- 9. in-place ---------------------------------------------------------------------------------

test('--in-place refuses when a planned tracked file is dirty', () => {
  const { dir } = legacyRepo('wize-upd-dirty-');
  const file = path.join(dir, '.wize/config/project.toml');
  fs.appendFileSync(file, '# local note\n');
  const before = fs.readFileSync(file, 'utf-8');
  const r = runCli(dir, ['update', '--in-place', '--no-render']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /uncommitted changes/);
  assert.strictEqual(fs.readFileSync(file, 'utf-8'), before);
});

test('--in-place on the default branch edits, untracks, renders, writes the marker and warns', () => {
  const { dir } = legacyRepo('wize-upd-inplace-');
  const r = runCli(dir, ['update', '--in-place']);
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.match(r.out, /do not commit this on main: create a branch first \(or rerun without --in-place\)/);
  assert.match(fs.readFileSync(path.join(dir, '.wize/config/project.toml'), 'utf-8'), new RegExp(`kit_version = "${KIT_VERSION.replace(/\./g, '\\.')}"`));
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/wize-orchestrator/SKILL.md')));
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir, '.wize/.local/hydrated.json'), 'utf-8')).kit_version, KIT_VERSION);
  assert.strictEqual(git(dir, 'ls-files', '--', '.claude/skills/wize/'), '');
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/wize/SKILL.md')));
  assert.strictEqual(git(dir, 'rev-list', '--count', 'HEAD'), '2', 'in-place never commits');
});

test('--in-place in a linked worktree on a feature branch warns about merge conflicts', () => {
  const { dir } = legacyRepo('wize-upd-inplace-wt-');
  const wt = addWorktree(dir, path.join(path.dirname(dir), 'wt'), 'feat/y');
  const r = runCli(wt, ['update', '--in-place', '--no-render']);
  assert.strictEqual(r.code, 0, r.err);
  assert.match(r.out, /pin bump on a feature branch conflicts at merge; prefer the default \(isolated\) mode/);
});

test('in a non-git directory update rewrites the pin and renders in place', () => {
  const dir = plainProject(`[project]\nname = "x"\nkit_version = "${OLD}"\n\n[install]\nide_targets = ["claude-code"]\nprofiles = ["core"]\n`);
  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 0, r.err);
  assert.match(r.out, /\(in-place\)/);
  assert.ok(fs.existsSync(path.join(dir, '.claude/skills/wize-orchestrator/SKILL.md')));
});

// ---- 10. --check / --dry-run ----------------------------------------------------------------------

test('--check exits 11 when pending and 0 when converged, without writing', () => {
  const { dir } = legacyRepo('wize-upd-check-');
  const snapshot = () => [git(dir, 'status', '--porcelain'), git(dir, 'branch', '--list'), String(worktreeCount(dir)), git(dir, 'rev-parse', 'refs/remotes/origin/main')];
  const before = snapshot();
  const pending = runCli(dir, ['update', '--check']);
  assert.strictEqual(pending.code, 11, pending.err);
  assert.deepStrictEqual(snapshot(), before);
  assert.ok(!branchExists(dir, BRANCH));

  assert.strictEqual(runCli(dir, ['update']).code, 0);
  git(dir, 'merge', '-q', '--ff-only', BRANCH);
  git(dir, 'push', '-q', 'origin', 'main');
  assert.strictEqual(runCli(dir, ['update', '--check']).code, 0);
});

test('--check --json has the documented shape', () => {
  const { dir } = legacyRepo('wize-upd-check-json-');
  const r = runCli(dir, ['update', '--check', '--json']);
  assert.strictEqual(r.code, 11);
  const j = JSON.parse(r.out);
  assert.deepStrictEqual(Object.keys(j).sort(), ['base', 'branch', 'branch_exists', 'changelog', 'converged', 'files', 'from', 'mode', 'to', 'untrack']);
  assert.strictEqual(j.from, OLD);
  assert.strictEqual(j.to, KIT_VERSION);
  assert.strictEqual(j.mode, 'isolated');
  assert.strictEqual(j.base, 'origin/main');
  assert.strictEqual(j.branch, BRANCH);
  assert.strictEqual(j.branch_exists, false);
  assert.strictEqual(j.converged, false);
  assert.deepStrictEqual(j.files.sort(), ['.gitignore', '.wize/config/project.toml']);
  assert.deepStrictEqual(j.untrack.sort(), ['.claude/skills/wize/SKILL.md', '.cursor/rules/wize.mdc', '.wize/agents/wize.md']);
  assert.ok(Array.isArray(j.changelog));
});

test('--check exits 12 when the pin is ahead of the binary; --dry-run always exits 0', () => {
  const dir = plainProject('[project]\nname = "x"\nkit_version = "9.9.9"\n');
  assert.strictEqual(runCli(dir, ['update', '--check']).code, 12);
  assert.strictEqual(runCli(dir, ['update', '--dry-run']).code, 0);
  const pending = plainProject(`[project]\nname = "x"\nkit_version = "${OLD}"\n`);
  const dry = runCli(pending, ['update', '--dry-run']);
  assert.strictEqual(dry.code, 0);
  assert.match(dry.out, /pending changes/);
  assert.match(fs.readFileSync(path.join(pending, '.wize/config/project.toml'), 'utf-8'), new RegExp(OLD.replace(/\./g, '\\.')));
});

test('a real run with --json emits exactly one object', () => {
  const { dir } = legacyRepo('wize-upd-json-');
  const r = runCli(dir, ['update', '--json']);
  assert.strictEqual(r.code, 0, r.err);
  const j = JSON.parse(r.out);
  assert.strictEqual(j.changed, true);
  assert.strictEqual(j.mode, 'isolated');
  assert.strictEqual(j.branch, BRANCH);
  assert.strictEqual(j.from, OLD);
  assert.strictEqual(j.to, KIT_VERSION);
});

// ---- 11. failing hook ----------------------------------------------------------------------------------

test('a failing pre-commit hook exits 1, creates no branch and removes the temp worktree', () => {
  const { dir } = legacyRepo('wize-upd-hook-');
  const hook = path.join(dir, '.git/hooks/pre-commit');
  fs.writeFileSync(hook, '#!/bin/sh\necho "hook says no" >&2\nexit 1\n', { mode: 0o755 });
  const wtBefore = worktreeCount(dir);
  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /hook says no/);
  assert.match(r.err, /nothing was created/);
  assert.ok(!branchExists(dir, BRANCH));
  assert.strictEqual(worktreeCount(dir), wtBefore);
  assert.strictEqual(git(dir, 'worktree', 'prune', '--dry-run', '-v'), '');
});

// ---- planning and git-ops ---------------------------------------------------------------------------------

test('planTrackedChanges is pure and limits untracking to the alias paths', () => {
  const { dir } = legacyRepo('wize-upd-plan-', { origin: false });
  const before = git(dir, 'status', '--porcelain');
  const plan = planTrackedChanges(dir, KIT_VERSION);
  assert.strictEqual(plan.ok, true);
  assert.strictEqual(plan.from, OLD);
  assert.deepStrictEqual(plan.files.map(f => f.path).sort(), ['.gitignore', '.wize/config/project.toml']);
  assert.deepStrictEqual(plan.untrack.sort(), ['.claude/skills/wize/SKILL.md', '.cursor/rules/wize.mdc', '.wize/agents/wize.md']);
  assert.ok(!plan.untrack.some(p => p.includes('wize-dogfood')));
  assert.strictEqual(plan.converged, false);
  assert.strictEqual(git(dir, 'status', '--porcelain'), before);
  assert.match(fs.readFileSync(path.join(dir, '.wize/config/project.toml'), 'utf-8'), new RegExp(OLD.replace(/\./g, '\\.')));
});

test('planTrackedChanges reports converged when nothing differs and no-project when absent', () => {
  const { dir } = legacyRepo('wize-upd-plan2-', { origin: false });
  assert.strictEqual(runCli(dir, ['update', '--in-place', '--no-render']).code, 0);
  assert.strictEqual(planTrackedChanges(dir, KIT_VERSION).converged, true);
  assert.deepStrictEqual(planTrackedChanges(tmpDir('wize-upd-plan3-'), KIT_VERSION), { ok: false, error: 'no-project' });
});

test('planTrackedChanges skips the gitignore and untrack steps when refreshGitignore is false', () => {
  const { dir } = legacyRepo('wize-upd-plan4-', { origin: false });
  const plan = planTrackedChanges(dir, KIT_VERSION, { refreshGitignore: false });
  assert.deepStrictEqual(plan.files.map(f => f.path), ['.wize/config/project.toml']);
  assert.deepStrictEqual(plan.untrack, []);
});

test('programmatic cmdUpdate works in a non-git directory and returns the documented fields', async () => {
  const dir = plainProject(`[project]\nname = "x"\nkit_version = "${OLD}"\n\n[install]\nide_targets = ["generic"]\nprofiles = ["core"]\n`);
  const r = await cmdUpdate({ kitRoot: KIT, projectRoot: dir, opts: { log: () => {} } });
  assert.strictEqual(r.changed, true);
  assert.strictEqual(r.mode, 'in-place');
  assert.strictEqual(r.from, OLD);
  assert.strictEqual(r.to, KIT_VERSION);
  assert.ok(Array.isArray(r.adapters) && r.adapters.length === 1);
  assert.strictEqual(r.exitCode, 0);
});

test('assertNotDefaultBranch throws on the default branch and passes on a detached HEAD', () => {
  const { dir } = legacyRepo('wize-upd-guard-', { origin: false });
  assert.throws(() => ops.assertNotDefaultBranch(dir), /refusing to commit on main/);
  git(dir, 'checkout', '-q', '--detach');
  assert.doesNotThrow(() => ops.assertNotDefaultBranch(dir));
  git(dir, 'checkout', '-q', '-b', 'feat/z');
  assert.doesNotThrow(() => ops.assertNotDefaultBranch(dir));
});

test('ops.commit refuses on the default branch', () => {
  const { dir } = legacyRepo('wize-upd-guard2-', { origin: false });
  assert.throws(() => ops.commit(dir, 'chore: nope', ''), /refusing to commit on main/);
});

test('originWebUrl understands ssh and https GitHub remotes and rejects others', () => {
  const { dir } = legacyRepo('wize-upd-url-', { origin: false });
  const cases = [
    ['git@github.com:acme/widgets.git', 'https://github.com/acme/widgets'],
    ['ssh://git@github.com/acme/widgets.git', 'https://github.com/acme/widgets'],
    ['https://github.com/acme/widgets', 'https://github.com/acme/widgets'],
    ['https://tok@github.com/acme/widgets.git', 'https://github.com/acme/widgets'],
    ['git@gitlab.com:acme/widgets.git', null]
  ];
  git(dir, 'remote', 'add', 'origin', 'https://example.invalid/x.git');
  for (const [url, expected] of cases) {
    git(dir, 'remote', 'set-url', 'origin', url);
    assert.strictEqual(ops.originWebUrl(dir), expected, url);
  }
});

test('update leaves nothing behind in the OS temp dir worktree list', () => {
  const { dir } = legacyRepo('wize-upd-tmp-');
  runCli(dir, ['update']);
  assert.ok(!git(dir, 'worktree', 'list').includes('wize-update-'));
  assert.ok(!fs.readdirSync(os.tmpdir()).some(n => n.startsWith('wize-update-') && fs.existsSync(path.join(os.tmpdir(), n, '.git'))));
});

// ---- review round 1 -----------------------------------------------------------

test('update keeps the registration of an unrelated worktree whose directory is missing', () => {
  const { dir } = legacyRepo('wize-upd-prune-');
  const away = path.join(tmpDir('wize-upd-away-'), 'usb-wt');
  git(dir, 'worktree', 'add', '-q', '-b', 'usb', away);
  fs.renameSync(away, `${away}.unmounted`);
  assert.match(git(dir, 'worktree', 'list'), /prunable/);

  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.match(git(dir, 'worktree', 'list'), /usb/, 'the missing worktree is still registered');
  fs.renameSync(`${away}.unmounted`, away);
  git(away, 'status', '--porcelain');
});

test('the temp worktree is a full checkout, and a relative core.hooksPath resolves in it', () => {
  const { dir } = legacyRepo('wize-upd-sparse-');
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/big.txt'), 'big\n');
  fs.mkdirSync(path.join(dir, '.githooks'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.githooks/pre-commit'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  git(dir, 'add', 'src', '.githooks');
  git(dir, 'commit', '-q', '-m', 'more files');
  git(dir, 'config', 'core.hooksPath', '.githooks');
  git(dir, 'push', '-q', 'origin', 'main');

  const tmp = path.join(tmpDir('wize-upd-wtadd-'), 'tree');
  const added = ops.worktreeAdd(dir, tmp, 'HEAD');
  assert.ok(added.ok, added.err);
  try {
    assert.ok(fs.existsSync(path.join(tmp, 'src/big.txt')), 'project files are checked out');
    assert.ok(fs.existsSync(path.join(tmp, 'README.md')));
    assert.ok(fs.existsSync(path.join(tmp, '.githooks/pre-commit')), 'a relative hooksPath resolves');
    assert.strictEqual(git(tmp, 'status', '--porcelain'), '', 'the working tree matches the index');
  } finally {
    ops.worktreeRemove(dir, tmp);
  }

  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.ok(tracked(dir, BRANCH).includes('src/big.txt'));
  assert.ok(tracked(dir, BRANCH).includes('README.md'));
  assert.ok(tracked(dir, BRANCH).includes('.githooks/pre-commit'));
});

test('a pre-commit hook that runs `git add -u` stages nothing beyond the planned files', () => {
  const { dir } = legacyRepo('wize-upd-addu-');
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/app.js'), 'x\n');
  git(dir, 'add', 'src');
  git(dir, 'commit', '-q', '-m', 'src');
  git(dir, 'push', '-q', 'origin', 'main');
  fs.writeFileSync(path.join(dir, '.git/hooks/pre-commit'), '#!/bin/sh\ngit add -u\n', { mode: 0o755 });

  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 0, r.err + r.out);
  const names = git(dir, 'diff', '--name-only', 'main', BRANCH).split('\n');
  assert.deepStrictEqual(names.filter(n => n === 'src/app.js' || n === 'README.md'), [], 'no project file is touched');
  assert.ok(tracked(dir, BRANCH).includes('src/app.js'));
  assert.ok(tracked(dir, BRANCH).includes('README.md'));
});

test('a hook that stages files outside the plan aborts: no branch, no temp worktree', () => {
  for (const [name, body] of [
    ['deletion', 'git rm -q --cached README.md\n'],
    ['edit', 'echo changed >> README.md\ngit add README.md\n']
  ]) {
    const { dir } = legacyRepo(`wize-upd-stray-${name}-`);
    fs.writeFileSync(path.join(dir, '.git/hooks/pre-commit'), `#!/bin/sh\n${body}`, { mode: 0o755 });
    const wtBefore = worktreeCount(dir);
    const r = runCli(dir, ['update']);
    assert.strictEqual(r.code, 1, name);
    assert.match(r.err, /changed files outside the update \(README\.md\)/, name);
    assert.match(r.err, /nothing was created/, name);
    assert.ok(!branchExists(dir, BRANCH), name);
    assert.strictEqual(worktreeCount(dir), wtBefore, name);
  }
});

test('a hook that stages extra files cannot move an existing update branch either', () => {
  const { dir } = legacyRepo('wize-upd-stray-ref-');
  assert.strictEqual(runCli(dir, ['update']).code, 0);
  const first = git(dir, 'rev-parse', BRANCH);
  // Make the branch non-converged again so a second commit is attempted.
  const toml = git(dir, 'show', `${BRANCH}:.wize/config/project.toml`).replace(KIT_VERSION, '0.20.1');
  const wt = path.join(tmpDir('wize-upd-stray-wt-'), 'w');
  git(dir, 'worktree', 'add', '-q', '--detach', wt, BRANCH);
  fs.writeFileSync(path.join(wt, '.wize/config/project.toml'), toml);
  git(wt, 'commit', '-q', '-am', 'regress pin');
  const regressed = git(wt, 'rev-parse', 'HEAD');
  git(dir, 'worktree', 'remove', '--force', wt);
  git(dir, 'branch', '-f', BRANCH, regressed);
  fs.writeFileSync(path.join(dir, '.git/hooks/pre-commit'), '#!/bin/sh\necho x >> README.md\ngit add README.md\n', { mode: 0o755 });

  const r = runCli(dir, ['update']);
  assert.strictEqual(r.code, 1, r.err + r.out);
  assert.match(r.err, /changed files outside the update/);
  assert.strictEqual(git(dir, 'rev-parse', BRANCH), regressed, 'the branch did not move');
  assert.notStrictEqual(first, regressed);
});

test('update says when this checkout pins an older kit than the base', () => {
  const { dir } = legacyRepo('wize-upd-oldpin-');
  const wt = addWorktree(dir, path.join(tmpDir('wize-upd-oldwt-'), 'wt'), 'old');
  const toml = path.join(dir, '.wize/config/project.toml');
  fs.writeFileSync(toml, fs.readFileSync(toml, 'utf-8').replace(`"${OLD}"`, '"0.26.0"'));
  git(dir, 'commit', '-q', '-am', 'bump pin');
  git(dir, 'push', '-q', 'origin', 'main');

  const r = runCli(wt, ['update']);
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.match(r.out, new RegExp(`note: this checkout pins ${OLD.replace(/\./g, '\\.')}, origin/main pins 0\\.26\\.0`));
});

test('update says so when this checkout pins a newer kit than the base', () => {
  const { dir } = legacyRepo('wize-upd-newpin-');
  const wt = addWorktree(dir, path.join(tmpDir('wize-upd-newwt-'), 'wt'), 'newer');
  const toml = path.join(wt, '.wize/config/project.toml');
  fs.writeFileSync(toml, fs.readFileSync(toml, 'utf-8').replace(`"${OLD}"`, '"0.20.5"'));
  git(wt, 'commit', '-q', '-am', 'local pin ahead');

  const r = runCli(wt, ['update']);
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.match(r.out, /this checkout pins 0\.20\.5, origin\/main pins 0\.20\.0; origin\/main is behind this checkout/);
  assert.doesNotMatch(r.out, /merge origin\/main to pick that up/);
});

test('--base accepts origin/<default> when the default branch is not main or master and origin/HEAD is unset', () => {
  const { dir, bare } = legacyRepo('wize-upd-trunk-');
  git(dir, 'branch', '-m', 'trunk');
  git(dir, 'push', '-q', 'origin', 'trunk');
  git(bare, 'symbolic-ref', 'HEAD', 'refs/heads/trunk');
  git(dir, 'push', '-q', 'origin', '--delete', 'main');
  git(dir, 'remote', 'set-head', 'origin', '-d');
  git(dir, 'checkout', '-q', '-b', 'feature');
  git(dir, 'branch', '-D', 'trunk');
  assert.strictEqual(runCli(dir, ['update', '--check']).code, 1, 'without --base the default branch is unknown');
  const r = runCli(dir, ['update', '--check', '--base', 'origin/trunk']);
  assert.strictEqual(r.code, 11, r.err + r.out);
  assert.match(r.out, /base origin\/trunk/);
});

// ---- symlinks, help, downgrade subject -----------------------------------------------

function symlinkedGitignoreRepo(prefix, target) {
  const dir = makeInstalledRepo(path.join(tmpDir(prefix), 'repo'), { pin: OLD, gitignore: false });
  fs.writeFileSync(target, 'node_modules/\n# my shared ignore\n');
  fs.symlinkSync(target, path.join(dir, '.gitignore'));
  commitAll(dir, 'symlinked gitignore');
  return dir;
}

test('isolated update never writes through a tracked symlink (absolute or relative)', () => {
  const outside = tmpDir('wize-upd-outside-');
  const shared = path.join(outside, 'gitignore');
  const dir = symlinkedGitignoreRepo('wize-upd-symlink-', shared);
  const original = fs.readFileSync(shared, 'utf-8');

  const r = runCli(dir, ['update', '--base', 'main']);
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.strictEqual(fs.readFileSync(shared, 'utf-8'), original, 'the file behind the link is untouched');
  assert.strictEqual(fs.readlinkSync(path.join(dir, '.gitignore')), shared);
  assert.doesNotMatch(r.out, /^\s+\.gitignore$/m);
  assert.deepStrictEqual(git(dir, 'diff', '--name-only', `main...${BRANCH}`).split('\n'), ['.wize/config/project.toml']);
  assert.ok(!git(dir, 'show', `${BRANCH}:.gitignore`).includes('wize-dev-kit'), 'the link blob is unchanged');
  assert.strictEqual(git(dir, 'ls-tree', BRANCH, '.gitignore').split(' ')[0], '120000');

  const rel = makeInstalledRepo(path.join(tmpDir('wize-upd-symrel-'), 'repo'), { pin: OLD, gitignore: false });
  fs.writeFileSync(path.join(rel, 'shared.ignore'), '# shared\n');
  fs.symlinkSync('shared.ignore', path.join(rel, '.gitignore'));
  commitAll(rel, 'relative link');
  const r2 = runCli(rel, ['update', '--base', 'main']);
  assert.strictEqual(r2.code, 0, r2.err + r2.out);
  assert.strictEqual(git(rel, 'show', `${BRANCH}:shared.ignore`), '# shared');
});

test('showFile and isSpecialAt treat symlinks as not-a-file', () => {
  const dir = symlinkedGitignoreRepo('wize-upd-showfile-', path.join(tmpDir('wize-upd-showfile-out-'), 'g'));
  assert.strictEqual(ops.showFile(dir, 'HEAD', '.gitignore'), null);
  assert.strictEqual(ops.isSpecialAt(dir, 'HEAD', '.gitignore'), true);
  assert.strictEqual(ops.isSpecialAt(dir, 'HEAD', '.wize/config/project.toml'), false);
  assert.strictEqual(ops.isSpecialAt(dir, 'HEAD', 'nope'), false);
  assert.ok(ops.showFile(dir, 'HEAD', '.wize/config/project.toml').includes('[project]'));
});

test('in-place update leaves a symlinked .gitignore alone and refuses a symlinked target directory', () => {
  const outside = tmpDir('wize-upd-inplace-out-');
  const shared = path.join(outside, 'gitignore');
  const dir = symlinkedGitignoreRepo('wize-upd-inplace-', shared);
  const original = fs.readFileSync(shared, 'utf-8');
  const r = runCli(dir, ['update', '--in-place', '--no-render']);
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.strictEqual(fs.readFileSync(shared, 'utf-8'), original);

  const hookDir = path.join(outside, 'hooks');
  fs.mkdirSync(hookDir);
  const hookTpl = fs.readFileSync(path.join(KIT, 'tools/installer/templates/hydrate.sh'), 'utf-8');
  fs.writeFileSync(path.join(hookDir, 'hydrate.sh'), hookTpl.replace('\n', '\n# stale\n'));
  fs.symlinkSync(hookDir, path.join(dir, '.wize/hooks'));
  const before = fs.readFileSync(path.join(hookDir, 'hydrate.sh'), 'utf-8');
  const again = runCli(dir, ['update', '--in-place', '--no-render']);
  assert.strictEqual(fs.readFileSync(path.join(hookDir, 'hydrate.sh'), 'utf-8'), before, 'nothing written outside the project');
  assert.strictEqual(again.code, 1, again.err + again.out);
  assert.match(again.err, /refusing to write through a symlink: \.wize\/hooks\/hydrate\.sh/);
});

test('a downgrade commit says so in its subject', () => {
  const { dir } = legacyRepo('wize-upd-downsubj-', { origin: false });
  const toml = path.join(dir, '.wize/config/project.toml');
  fs.writeFileSync(toml, fs.readFileSync(toml, 'utf-8').replace(`"${OLD}"`, '"9.9.9"'));
  commitAll(dir, 'pin ahead');
  const r = runCli(dir, ['update', '--base', 'main', '--allow-downgrade']);
  assert.strictEqual(r.code, 0, r.err + r.out);
  assert.strictEqual(git(dir, 'log', '-1', '--format=%s', BRANCH), `chore(wize): downgrade kit 9.9.9 -> ${KIT_VERSION}`);
});

test('<command> --help prints help and runs nothing', () => {
  const { dir } = legacyRepo('wize-upd-help-', { origin: false });
  const before = git(dir, 'status', '--porcelain') + git(dir, 'branch', '--list');
  for (const cmd of ['update', 'sync', 'hydrate', 'install', 'uninstall', 'doctor', 'document-project']) {
    for (const flag of ['--help', '-h']) {
      const r = runCli(dir, [cmd, flag]);
      assert.strictEqual(r.code, 0, `${cmd} ${flag}: ${r.err}`);
      assert.match(r.out, /Usage|usage|wize-dev-kit v/, `${cmd} ${flag}`);
      assert.doesNotMatch(r.out, /prepared|Syncing|hydrated/, `${cmd} ${flag}`);
    }
  }
  assert.strictEqual(git(dir, 'status', '--porcelain') + git(dir, 'branch', '--list'), before);
  assert.ok(!fs.existsSync(path.join(dir, '.wize/.local')));
});

test('--in-place refuses when a tracked generated file has uncommitted edits', () => {
  const { dir } = legacyRepo('wize-upd-dirty-gen-');
  const file = path.join(dir, '.claude/skills/wize-dogfood/SKILL.md');
  fs.appendFileSync(file, 'MY UNCOMMITTED NOTE\n');
  const r = runCli(dir, ['update', '--in-place']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /tracked generated files/);
  assert.match(r.err, /wize-dogfood/);
  assert.match(fs.readFileSync(file, 'utf-8'), /MY UNCOMMITTED NOTE/);
  assert.match(fs.readFileSync(path.join(dir, '.wize/config/project.toml'), 'utf-8'), new RegExp(`kit_version = "${OLD.replace(/\./g, '\\.')}"`), 'nothing written');
  const ok = runCli(dir, ['update', '--in-place', '--no-render']);
  assert.strictEqual(ok.code, 0, ok.err);
  assert.match(fs.readFileSync(file, 'utf-8'), /MY UNCOMMITTED NOTE/);
});

test('--in-place refuses edits in tracked copilot agents and opencode commands, not only the sentinel dirs', () => {
  const dir = makeInstalledRepo(path.join(tmpDir('wize-upd-extra-dirs-'), 'repo'), { pin: OLD, gitignore: false, targets: ['copilot', 'opencode'] });
  const files = ['.github/agents/wize-agent-analyst.agent.md', '.opencode/commands/wize-advanced-elicitation.md'];
  for (const rel of ['.github/skills/wize/SKILL.md', '.opencode/commands/wize.md', '.opencode/agents/wize-agent-analyst.md', ...files]) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), `# ${rel}\n`);
  }
  git(dir, 'add', '-A', '-f');
  git(dir, 'commit', '-q', '-m', 'generated');
  for (const rel of files) {
    fs.appendFileSync(path.join(dir, rel), 'USER EDIT\n');
    const r = runCli(dir, ['update', '--in-place']);
    assert.strictEqual(r.code, 1, `${rel}: ${r.err}`);
    assert.match(r.err, /tracked generated files/);
    assert.ok(r.err.includes(rel), r.err);
    assert.match(fs.readFileSync(path.join(dir, '.wize/config/project.toml'), 'utf-8'), new RegExp(`kit_version = "${OLD.replace(/\./g, '\\.')}"`), 'nothing written');
    git(dir, 'checkout', '--', rel);
  }
});

test('the downgrade refusal also points at --allow-downgrade for an unpublished pin', () => {
  const dir = plainProject('[project]\nname = "x"\nkit_version = "99.0.0"\n\n[install]\nide_targets = ["generic"]\nprofiles = ["core"]\n');
  const r = runCli(dir, ['update', '--in-place', '--no-render']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /--allow-downgrade/);
});

// ---- in-place guards: fail closed, symlinked output dirs, PR verb -------------------------------

// PATH with a `git` that fails every `status` call and delegates the rest.
function pathWithBrokenGitStatus(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const real = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf-8' }).stdout.trim();
  fs.writeFileSync(path.join(dir, 'git'), `#!/bin/sh\nif [ "$1" = status ]; then exit 128; fi\nexec "${real}" "$@"\n`, { mode: 0o755 });
  return `${dir}:${process.env.PATH}`;
}

test('--in-place fails closed when git status fails: plan files check', () => {
  const { dir } = legacyRepo('wize-upd-failclosed-plan-', { origin: false });
  const toml = path.join(dir, '.wize/config/project.toml');
  const before = fs.readFileSync(toml, 'utf-8');
  const r = runCli(dir, ['update', '--in-place', '--no-render'], { path: pathWithBrokenGitStatus(path.join(tmpDir('wize-brokengit-'), 'bin')) });
  assert.strictEqual(r.code, 1, r.err + r.out);
  assert.match(r.err, /git could not report the status of the files update must edit/);
  assert.strictEqual(fs.readFileSync(toml, 'utf-8'), before, 'nothing written');
});

test('--in-place fails closed when git status fails: generated files check, --no-render bypasses it', () => {
  const dir = makeInstalledRepo(path.join(tmpDir('wize-upd-failclosed-gen-'), 'repo'));
  const broken = pathWithBrokenGitStatus(path.join(tmpDir('wize-brokengit-'), 'bin'));
  const r = runCli(dir, ['update', '--in-place'], { path: broken });
  assert.strictEqual(r.code, 1, r.err + r.out);
  assert.match(r.err, /git could not report the status of the generated files/);
  assert.match(r.err, /--no-render/);
  assert.ok(!fs.existsSync(path.join(dir, '.claude/skills')), 'nothing rendered');
  const ok = runCli(dir, ['update', '--in-place', '--no-render'], { path: broken });
  assert.strictEqual(ok.code, 0, ok.err + ok.out);
});

test('--in-place refuses before writing when a render would land on a dirty tracked file behind a symlinked output dir', () => {
  const dir = makeInstalledRepo(path.join(tmpDir('wize-upd-symdir-'), 'repo'), { pin: OLD, gitignore: false, targets: ['claude-code'] });
  const shared = path.join(dir, 'shared/skills/wize-orchestrator/SKILL.md');
  fs.mkdirSync(path.dirname(shared), { recursive: true });
  fs.writeFileSync(shared, 'committed\n');
  fs.mkdirSync(path.join(dir, '.claude'));
  fs.symlinkSync('../shared/skills', path.join(dir, '.claude/skills'));
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'shared skills');
  fs.appendFileSync(shared, 'MY UNCOMMITTED NOTE\n');
  assert.strictEqual(git(dir, 'status', '--porcelain', '--', '.claude/skills'), '', 'a git pathspec does not see through the symlink');

  const toml = path.join(dir, '.wize/config/project.toml');
  const tomlBefore = fs.readFileSync(toml, 'utf-8');
  const r = runCli(dir, ['update', '--in-place']);
  assert.strictEqual(r.code, 1, r.err + r.out);
  assert.match(r.err, /uncommitted changes in tracked generated files/);
  assert.ok(r.err.includes('shared/skills/wize-orchestrator/SKILL.md') || r.err.includes('.claude/skills/wize-orchestrator/SKILL.md'), r.err);
  assert.match(fs.readFileSync(shared, 'utf-8'), /MY UNCOMMITTED NOTE/);
  assert.strictEqual(fs.readFileSync(toml, 'utf-8'), tomlBefore, 'nothing written');
  assert.ok(!fs.existsSync(path.join(dir, 'shared/skills/wize')), 'no other file rendered');
  assert.ok(!fs.existsSync(path.join(dir, '.wize/.local')), 'no marker');

  const ok = runCli(dir, ['update', '--in-place', '--no-render']);
  assert.strictEqual(ok.code, 0, ok.err);
});

test('the PR title and body use the downgrade verb like the commit', () => {
  const { dir } = legacyRepo('wize-upd-prverb-');
  const toml = path.join(dir, '.wize/config/project.toml');
  fs.writeFileSync(toml, fs.readFileSync(toml, 'utf-8').replace(`"${OLD}"`, '"9.9.9"'));
  commitAll(dir, 'pin ahead');
  git(dir, 'push', '-q', 'origin', 'main');
  const gh = stubGh(path.join(tmpDir('wize-gh-'), 'bin'));
  const r = runCli(dir, ['update', '--pr', '--allow-downgrade'], { path: `${gh.dir}:${process.env.PATH}` });
  assert.strictEqual(r.code, 0, r.err + r.out);
  const calls = gh.calls().join('\n');
  assert.ok(calls.includes(`--title chore(wize): downgrade kit 9.9.9 -> ${KIT_VERSION}`), calls);
  assert.match(calls, /Downgrades the wize-dev-kit pin from 9\.9\.9/);
  assert.doesNotMatch(calls, /Bumps the wize-dev-kit pin/);
});
