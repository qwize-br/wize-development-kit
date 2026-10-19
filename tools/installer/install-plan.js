// Pure decisions behind `wize-dev-kit install` / `uninstall`: where the kit
// may be installed, what an existing project.toml means for a re-run, how the
// project and user names are derived and when the baseline runs. wize-cli.js
// runs main() at load time, so everything testable lives here.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { gitContext, configUserName } = require('./git-context.js');
const { findProjectRoot, findKitElsewhere } = require('./project-root.js');
const { loadProjectConfig } = require('./toml.js');
const { real, sameSet } = require('./util.js');

const hasProjectToml = (dir) => fs.existsSync(path.join(dir, '.wize', 'config', 'project.toml'));

// -> { status, ctx, installed, root?, toplevel?, message? }
//   installed  cwd already holds project.toml
//   nested     an ancestor (inside the git checkout) holds it
//   subdir     cwd is inside a git checkout but is not its top level
//   primary    linked worktree whose branch lacks project.toml while the
//              default-branch (or any other non-bare) worktree has it (merge the kit, or pass --here)
//   ok         fresh install at cwd
// `--here` skips the nested, subdir and primary checks.
function checkInstallRoot({ cwd, flags = {} }) {
  const here = real(cwd);
  const ctx = gitContext(here);
  if (hasProjectToml(here)) return { status: 'installed', installed: true, ctx, root: here };
  if (flags.here) return { status: 'ok', installed: false, ctx };

  const found = findProjectRoot(here);
  if (found && found !== here) {
    return { status: 'nested', installed: false, ctx, root: found, message: `kit already installed at ${found}; run from there` };
  }
  const primary = findKitElsewhere(here, ctx);
  if (primary) {
    return {
      status: 'primary', installed: false, ctx, root: primary,
      message: `kit is installed on ${primary}'s branch; merge it into this branch, or pass --here to install here`
    };
  }
  if (ctx.isRepo && ctx.toplevel && real(ctx.toplevel) !== here) {
    return {
      status: 'subdir', installed: false, ctx, toplevel: real(ctx.toplevel),
      message: `run install from the repo root ${real(ctx.toplevel)} (or pass --here)`
    };
  }
  return { status: 'ok', installed: false, ctx };
}

const csv = (v) => (typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : []);

// Flags that would change what an installed project is configured for.
// Returns the list of conflicting flag names (empty = nothing to reject).
function conflictingFlags({ flags = {}, root }) {
  let cfg;
  try { cfg = loadProjectConfig(root); } catch { cfg = {}; }
  const install = (cfg && cfg.install) || {};
  const out = [];
  if (typeof flags.profiles === 'string') {
    const want = [...csv(flags.profiles), 'core'];
    if (!sameSet(want, [...(install.profiles || ['core']), 'core'])) out.push('--profiles');
  }
  if (typeof flags.targets === 'string') {
    if (!sameSet(csv(flags.targets), install.ide_targets || [])) out.push('--targets');
  }
  if (typeof flags.lang === 'string') {
    const lang = cfg && cfg.language && cfg.language.communication;
    if (flags.lang.trim() !== lang) out.push('--lang');
  }
  return out;
}

function installedPin(root) {
  try {
    const cfg = loadProjectConfig(root);
    return (cfg.project && cfg.project.kit_version) || 'unknown';
  } catch { return 'unknown'; }
}

// Default project name: the primary checkout's name in a linked worktree (the
// worktree directory is a throwaway), else the directory being installed.
function defaultProjectName({ cwd, ctx }) {
  const c = ctx || gitContext(cwd);
  if (c.isRepo && c.linked && c.primary) return path.basename(c.primary);
  return path.basename(real(cwd));
}

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// specific flag > legacy --name > derived
function resolveProjectName({ flags = {}, cwd, ctx }) {
  return clean(flags['project-name']) || clean(flags.name) || defaultProjectName({ cwd, ctx });
}

// specific flag > legacy --name > git user.name > $USER > Developer. Without
// --yes and without a flag the caller prompts, so this returns null.
function resolveUserName({ flags = {}, cwd, env = process.env, nonInteractive = false }) {
  const given = clean(flags['user-name']) || clean(flags.name);
  if (given) return given;
  if (!nonInteractive) return null;
  return configUserName(cwd) || env.USER || env.USERNAME || 'Developer';
}

function baselineDocsExist(root) {
  try {
    return fs.readdirSync(path.join(root, '.wize', 'knowledge', 'document-project')).some(f => f.endsWith('.md'));
  } catch { return false; }
}

// -> { run, reason }. WIZE_SKIP_BASELINE=1 always wins; an existing baseline
// blocks the run unless --baseline forces it; otherwise brownfield only.
function baselineDecision({ root, flags = {}, env = process.env, brownfield }) {
  if (env.WIZE_SKIP_BASELINE === '1') return { run: false, reason: 'env' };
  if (flags.baseline) return { run: true, reason: 'forced' };
  if (!brownfield) return { run: false, reason: 'greenfield' };
  if (baselineDocsExist(root)) return { run: false, reason: 'exists' };
  return { run: true, reason: 'brownfield' };
}

// Uninstall target: an explicit --root / WIZE_PROJECT_ROOT, else the project
// root found from cwd (cwd itself when none). `refused` when cwd is not the
// root and nothing explicit was given.
function resolveUninstallRoot({ cwd, flags = {}, env = process.env }) {
  const here = real(cwd);
  const explicit = clean(flags.root) || clean(env.WIZE_PROJECT_ROOT);
  if (explicit) return { root: real(path.resolve(here, explicit)), explicit: true, refused: false };
  const found = findProjectRoot(here);
  const root = found || here;
  return { root, explicit: false, refused: root !== here };
}

module.exports = {
  checkInstallRoot, conflictingFlags, installedPin, defaultProjectName,
  resolveProjectName, resolveUserName, baselineDecision, resolveUninstallRoot
};
