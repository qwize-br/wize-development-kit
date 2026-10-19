// Mutating and network git/gh operations used by `update`. Every wrapper uses
// execFileSync (no shell), never throws, and returns { ok, out, err } so the
// caller decides what a failure means. Read-only facts live in git-context.js.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { defaultBranch, gitContext } = require('./git-context.js');
const { real } = require('./util.js');

function run(cmd, cwd, args, { timeout = 60000, env = null } = {}) {
  try {
    const out = execFileSync(cmd, args, {
      cwd,
      timeout,
      encoding: 'utf-8',
      maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, ...(env || {}) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { ok: true, out, err: '' };
  } catch (e) {
    const out = e && e.stdout ? String(e.stdout) : '';
    const err = [e && e.stderr ? String(e.stderr) : '', out].join('').trim() || (e && e.message) || 'failed';
    return { ok: false, out, err };
  }
}

const git = (cwd, args, opts) => run('git', cwd, args, opts);
const NO_PROMPT = { GIT_TERMINAL_PROMPT: '0' };

// ---- reads against a ref -------------------------------------------------

// Content of `rel` (relative to cwd) at `ref`; null when absent or not a
// regular file. A symlink blob would read back as its target text and a
// gitlink is a submodule, so neither is ever treated as file content.
function treeMode(cwd, ref, rel) {
  const t = git(cwd, ['ls-tree', '-z', ref, '--', rel]);
  if (!t.ok) return null;
  const entry = t.out.split('\0').filter(Boolean)[0];
  return entry ? entry.split(' ')[0] : null;
}

// True when `rel` exists at `ref` but is not a regular file (symlink, gitlink).
function isSpecialAt(cwd, ref, rel) {
  const mode = treeMode(cwd, ref, rel);
  return mode !== null && mode !== '100644' && mode !== '100755';
}

function showFile(cwd, ref, rel) {
  if (treeMode(cwd, ref, rel) === null || isSpecialAt(cwd, ref, rel)) return null;
  const r = git(cwd, ['show', `${ref}:./${rel}`]);
  return r.ok ? r.out : null;
}

// Files tracked at `ref` under `paths` (relative to cwd, no leading `./`).
function lsTree(cwd, ref, paths) {
  const r = git(cwd, ['ls-tree', '-r', '--name-only', '-z', ref, '--', ...paths]);
  return r.ok ? r.out.split('\0').filter(Boolean) : [];
}

// Files in the index under `paths`.
function lsFiles(cwd, paths) {
  const r = git(cwd, ['ls-files', '-z', '--', ...paths]);
  return r.ok ? r.out.split('\0').filter(Boolean) : [];
}

// Paths (relative to the repository top level) that differ between two commits.
// null when git fails.
function diffNames(cwd, from, to) {
  const r = git(cwd, ['diff', '--name-only', '--no-renames', '-z', from, to]);
  return r.ok ? r.out.split('\0').filter(Boolean) : null;
}

function headSha(cwd) {
  const r = git(cwd, ['rev-parse', 'HEAD']);
  return r.ok ? r.out.trim() : null;
}

// ---- guards --------------------------------------------------------------

// Hard guard: throws when `cwd` is checked out on the default branch.
function assertNotDefaultBranch(cwd) {
  const ctx = gitContext(cwd);
  if (!ctx.isRepo) return;
  const def = defaultBranch(cwd);
  if (ctx.branch && (ctx.branch === def || ctx.branch === 'main' || ctx.branch === 'master')) {
    throw new Error(`refusing to commit on ${ctx.branch}`);
  }
}

// ---- worktrees -----------------------------------------------------------

// A detached, fully checked-out worktree of `ref`. Commit hooks assume a
// working tree that matches the index (`git add -u` would stage the deletion of
// every file a sparse checkout left out, and tools such as the pre-commit
// framework read their config from disk), so the tree is complete. LFS
// objects are not downloaded (pointer files are checked out) and hooks are
// disabled for the checkout itself, since post-checkout can run arbitrary
// project code; the commit still runs the project's hooks.
function worktreeAdd(cwd, dir, ref) {
  const env = { GIT_LFS_SKIP_SMUDGE: '1' };
  return git(cwd, ['-c', 'core.hooksPath=/dev/null', 'worktree', 'add', '--detach', '-q', dir, ref], { timeout: 300000, env });
}

function worktreeRemove(cwd, dir) {
  return git(cwd, ['worktree', 'remove', '--force', dir]);
}

// Drops the admin data of the worktree at `dir` only, when `worktree remove`
// could not. A repo-wide `git worktree prune` would also delete the entries of
// unrelated worktrees whose directory is momentarily missing (an unmounted
// volume, a directory moved by hand).
function worktreeForget(cwd, dir) {
  const common = git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (!common.ok) return;
  const admin = path.join(common.out.trim(), 'worktrees');
  const wanted = real(path.join(dir, '.git'));
  let names;
  try { names = fs.readdirSync(admin); } catch { return; }
  for (const name of names) {
    try {
      const recorded = fs.readFileSync(path.join(admin, name, 'gitdir'), 'utf-8').trim();
      if (real(recorded) === wanted) fs.rmSync(path.join(admin, name), { recursive: true, force: true });
    } catch { /* not ours or unreadable: leave it */ }
  }
}

// ---- index and history ---------------------------------------------------

function add(cwd, paths) {
  return git(cwd, ['add', '--', ...paths]);
}

function rmCached(cwd, paths) {
  return git(cwd, ['rm', '--cached', '-q', '--', ...paths]);
}

// Never passes --no-verify: the project's hooks decide.
function commit(cwd, subject, body) {
  assertNotDefaultBranch(cwd);
  return git(cwd, ['commit', '-q', '-m', subject, ...(body ? ['-m', body] : [])], { timeout: 300000 });
}

function branchCreate(cwd, name, sha) {
  return git(cwd, ['branch', name, sha]);
}

// Compare-and-swap: fails unless the branch still points at `oldSha`.
function updateRef(cwd, branch, newSha, oldSha) {
  return git(cwd, ['update-ref', `refs/heads/${branch}`, newSha, oldSha]);
}

// ---- remote --------------------------------------------------------------

function fetch(cwd, remote, branch) {
  return git(cwd, ['fetch', '--quiet', remote, branch], { timeout: 30000, env: NO_PROMPT });
}

// Never forces.
function push(cwd, remote, branch) {
  return git(cwd, ['push', '-u', remote, `refs/heads/${branch}:refs/heads/${branch}`], { timeout: 120000, env: NO_PROMPT });
}

// https://github.com/<owner>/<repo> for a GitHub origin (ssh or https); else null.
function originWebUrl(cwd) {
  const r = git(cwd, ['remote', 'get-url', 'origin']);
  if (!r.ok) return null;
  const url = r.out.trim();
  const m = url.match(/^(?:git@|ssh:\/\/git@|https?:\/\/(?:[^@/]+@)?)github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/);
  return m ? `https://github.com/${m[1]}/${m[2]}` : null;
}

// ---- gh ------------------------------------------------------------------

function ghAvailable() {
  return run('gh', process.cwd(), ['--version'], { timeout: 10000 }).ok;
}

// { url, state } of the PR for `branch`, or null.
function ghPrView(cwd, branch) {
  const r = run('gh', cwd, ['pr', 'view', branch, '--json', 'url,state'], { timeout: 30000, env: NO_PROMPT });
  if (!r.ok) return null;
  try {
    const data = JSON.parse(r.out);
    return data && data.url ? { url: data.url, state: data.state || null } : null;
  } catch {
    return null;
  }
}

// Returns { ok, url, err }.
function ghPrCreate(cwd, { base, head, title, body }) {
  const r = run('gh', cwd, ['pr', 'create', '--base', base, '--head', head, '--title', title, '--body', body], { timeout: 60000, env: NO_PROMPT });
  if (!r.ok) return { ok: false, url: null, err: r.err };
  const url = r.out.split('\n').map(s => s.trim()).filter(Boolean).pop() || null;
  return { ok: true, url, err: '' };
}

// Best-effort removal of a temp directory a failed `worktree remove` left behind.
function rmDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

module.exports = {
  run, showFile, isSpecialAt, lsTree, lsFiles, diffNames, headSha, assertNotDefaultBranch,
  worktreeAdd, worktreeRemove, worktreeForget, add, rmCached, commit, branchCreate, updateRef,
  fetch, push, originWebUrl, ghAvailable, ghPrView, ghPrCreate, rmDir
};
