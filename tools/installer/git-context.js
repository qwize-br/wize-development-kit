// Read-only git facts about a project root: is it a repo, a linked worktree,
// which branch, where the primary checkout lives. Every call is bounded and
// failure-safe; a missing git binary degrades to a `.git` file/dir probe.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { real } = require('./util.js');

function git(root, args, { timeout = 3000 } = {}) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
      timeout,
      encoding: 'utf-8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    return null;
  }
}

function revParseTriple(root) {
  let out = git(root, ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir']);
  if (out === null) out = git(root, ['rev-parse', '--show-toplevel', '--git-dir', '--git-common-dir']);
  if (out === null) return null;
  const lines = out.split('\n').filter(Boolean);
  if (lines.length < 3) return null;
  return lines.slice(0, 3).map(l => real(path.resolve(root, l)));
}

// Parses `git worktree list --porcelain` into [{ path, head, branch, detached, bare }].
function worktreeList(root) {
  const out = git(root, ['worktree', 'list', '--porcelain']);
  if (out === null) return null;
  const list = [];
  let cur = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) {
      cur = { path: line.slice('worktree '.length), head: null, branch: null, detached: false, bare: false };
      list.push(cur);
    } else if (!cur) {
      continue;
    } else if (line.startsWith('HEAD ')) cur.head = line.slice(5);
    else if (line.startsWith('branch ')) cur.branch = line.slice(7).replace(/^refs\/heads\//, '');
    else if (line === 'detached') cur.detached = true;
    else if (line === 'bare') cur.bare = true;
  }
  return list;
}

function fallbackContext(root) {
  const base = { isRepo: false, toplevel: null, gitDir: null, commonDir: null, linked: false, primary: null, branch: null, detached: false, head: null };
  // git failed: a .git above the root (monorepo subdir) still means a repo,
  // so the root's caller must keep its git guards on instead of going non-git.
  let top = root;
  let st;
  for (;;) {
    try { st = fs.statSync(path.join(top, '.git')); break; } catch { /* keep walking */ }
    const up = path.dirname(top);
    if (up === top) return base;
    top = up;
  }
  const dotGit = path.join(top, '.git');
  if (st.isDirectory()) {
    return { ...base, isRepo: true, toplevel: real(top), gitDir: real(dotGit), commonDir: real(dotGit), primary: real(top) };
  }
  let gitDir = null;
  try {
    const m = fs.readFileSync(dotGit, 'utf-8').match(/^gitdir:\s*(.+)$/m);
    if (m) gitDir = real(path.resolve(top, m[1].trim()));
  } catch { /* unreadable .git file */ }
  return { ...base, isRepo: true, linked: true, toplevel: real(top), gitDir };
}

function gitContext(root) {
  const triple = revParseTriple(root);
  if (!triple) return fallbackContext(root);
  const [toplevel, gitDir, commonDir] = triple;

  let primary = null;
  const wt = worktreeList(root);
  if (wt && wt.length) primary = real(wt[0].path);
  else if (path.basename(commonDir) === '.git') primary = path.dirname(commonDir);

  const branchOut = git(root, ['symbolic-ref', '--short', '-q', 'HEAD']);
  const branch = branchOut ? branchOut.trim() || null : null;
  const headOut = git(root, ['rev-parse', '--short', 'HEAD']);
  const head = headOut ? headOut.trim() || null : null;

  return {
    isRepo: true,
    toplevel,
    gitDir,
    commonDir,
    linked: gitDir !== commonDir,
    primary,
    branch,
    detached: branch === null,
    head
  };
}

function localBranchExists(root, name) {
  return git(root, ['rev-parse', '--verify', '-q', `refs/heads/${name}`]) !== null;
}

// origin/HEAD target, else the first existing local branch among
// init.defaultBranch, main, master; null when none exists.
function defaultBranch(root) {
  const head = git(root, ['symbolic-ref', '--short', '-q', 'refs/remotes/origin/HEAD']);
  if (head && head.trim()) return head.trim().replace(/^origin\//, '');
  const configured = git(root, ['config', 'init.defaultBranch']);
  const candidates = [configured && configured.trim(), 'main', 'master'].filter(Boolean);
  for (const name of candidates) {
    if (localBranchExists(root, name)) return name;
  }
  return null;
}

// Absolute paths of every tracked file in the repository that contains `root`
// (listed from the toplevel, so a project in a monorepo subdirectory still sees
// tracked files elsewhere in the repo that a symlink could lead to; paths are
// resolved through the real toplevel, so symlinked checkouts compare equal). A submodule
// (gitlink) is tracked as one entry, so `has()` also answers true for any path
// inside one: a write there would change another repository's tracked files.
// An empty Set means a repo with nothing tracked; null means git failed
// (missing binary, "dubious ownership"), so the caller must not assume
// nothing is tracked.
class TrackedPaths extends Set {
  constructor() {
    super();
    this.gitlinks = [];
  }

  has(abs) {
    if (super.has(abs)) return true;
    return this.gitlinks.some(g => abs.startsWith(g + path.sep));
  }
}

function trackedSet(root) {
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (top === null || !top.trim()) return null;
  const toplevel = path.resolve(root, top.trim());
  const out = git(toplevel, ['ls-files', '-s', '-z', '--full-name'], { timeout: 15000 });
  if (out === null) return null;
  const base = real(toplevel);
  const set = new TrackedPaths();
  for (const entry of out.split('\0')) {
    const tab = entry.indexOf('\t');
    if (tab < 0) continue;
    const abs = path.resolve(base, entry.slice(tab + 1));
    set.add(abs);
    if (entry.startsWith('160000 ')) set.gitlinks.push(abs);
  }
  return set;
}

// Tracked files (paths relative to `root`) under the given pathspecs; empty
// when not a repo or git fails.
function trackedUnder(root, pathspecs) {
  if (!pathspecs || !pathspecs.length) return [];
  const out = git(root, ['ls-files', '-z', '--', ...pathspecs], { timeout: 15000 });
  return out ? out.split('\0').filter(Boolean) : [];
}

// Absolute paths of tracked files with uncommitted changes (staged or not),
// listed from the repository toplevel so a tracked symlinked output directory
// that leads elsewhere in the repo is covered too. Null when git fails.
function dirtyTrackedSet(root) {
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (top === null || !top.trim()) return null;
  const toplevel = real(path.resolve(root, top.trim()));
  const out = git(toplevel, ['status', '--porcelain', '-z', '--untracked-files=no'], { timeout: 15000 });
  if (out === null) return null;
  const set = new Set();
  const parts = out.split('\0');
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (entry.length < 4) continue;
    set.add(path.resolve(toplevel, entry.slice(3)));
    if (/[RC]/.test(entry.slice(0, 2))) i++; // a rename/copy carries its source as the next entry
  }
  return set;
}

function hasRemote(root, name = 'origin') {
  const out = git(root, ['remote']);
  return !!out && out.split('\n').map(s => s.trim()).includes(name);
}

// Lines of `git status --porcelain` (limited to `paths` when given); null when
// git is unavailable or fails.
function statusPorcelain(root, paths = []) {
  const out = git(root, ['status', '--porcelain', ...(paths.length ? ['--', ...paths] : [])], { timeout: 15000 });
  if (out === null) return null;
  return out.split('\n').filter(Boolean);
}

// `git config user.name` as seen from `root`; null when unset.
function configUserName(root) {
  const out = git(root, ['config', 'user.name']);
  return out && out.trim() ? out.trim() : null;
}

// Whether `ref` resolves to a commit.
function refExists(root, ref) {
  return git(root, ['rev-parse', '--verify', '-q', `${ref}^{commit}`]) !== null;
}

module.exports = {
  gitContext, defaultBranch, trackedSet, dirtyTrackedSet, trackedUnder, hasRemote, worktreeList, statusPorcelain, configUserName,
  localBranchExists, refExists
};
