// Project-root discovery. A command run from a subdirectory or from a linked
// worktree must land on the directory that owns `.wize/config/project.toml`,
// without ever climbing out of the enclosing git checkout.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { real } = require('./util.js');
const { worktreeList, defaultBranch } = require('./git-context.js');

const PROJECT_TOML = path.join('.wize', 'config', 'project.toml');

function exists(p) {
  try { fs.statSync(p); return true; } catch { return false; }
}

// Walks up from `start` and returns the first directory holding
// .wize/config/project.toml. The walk ends at the first directory that
// contains `.git` (file or dir); with no `.git` anywhere above, only `start`
// is checked, so the walk never reaches $HOME.
function findProjectRoot(start) {
  const first = real(start);
  const chain = [];
  let boundary = null;
  for (let dir = first; ; dir = path.dirname(dir)) {
    chain.push(dir);
    if (exists(path.join(dir, '.git'))) { boundary = dir; break; }
    if (path.dirname(dir) === dir) break;
  }
  const candidates = boundary ? chain : [first];
  for (const dir of candidates) {
    if (exists(path.join(dir, PROJECT_TOML))) return dir;
  }
  return null;
}

// In a linked worktree whose branch lacks the kit, the other checkout that has
// it: the default-branch worktree first, else any non-bare worktree (a bare
// repository + worktrees layout has no primary checkout). `ctx` is the
// gitContext of `here`. Null when this is not a linked worktree or none has it.
function findKitElsewhere(here, ctx) {
  if (!ctx || !ctx.isRepo || !ctx.linked) return null;
  const self = real(ctx.toplevel || here);
  const list = worktreeList(here) || [];
  const def = defaultBranch(here);
  const others = list.filter(w => !w.bare && real(w.path) !== self && real(w.path) !== real(here));
  others.sort((a, b) => Number(b.branch === def) - Number(a.branch === def));
  for (const w of others) {
    if (exists(path.join(real(w.path), PROJECT_TOML))) return real(w.path);
  }
  if (!list.length && ctx.primary && real(ctx.primary) !== self && exists(path.join(real(ctx.primary), PROJECT_TOML))) return real(ctx.primary);
  return null;
}

// Precedence: --root > WIZE_PROJECT_ROOT > findProjectRoot(cwd) > (hydrate
// only) ORCA_WORKTREE_PATH > cwd. A project found from cwd beats an inherited
// ORCA_WORKTREE_PATH, so a shell in worktree B never renders worktree A.
function resolveRoot({ flags = {}, env = process.env, cwd = process.cwd(), forCommand = null } = {}) {
  const pick = (v) => (typeof v === 'string' && v.trim() ? real(path.resolve(cwd, v.trim())) : null);
  return pick(flags.root)
    || pick(env.WIZE_PROJECT_ROOT)
    || findProjectRoot(cwd)
    || (forCommand === 'hydrate' ? pick(env.ORCA_WORKTREE_PATH) : null)
    || real(cwd);
}

module.exports = { findProjectRoot, findKitElsewhere, resolveRoot };
