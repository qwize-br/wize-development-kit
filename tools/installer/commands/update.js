// `wize-dev-kit update` — converge a project to the kit binary that is running.
//
// The tracked changes an update needs are small: the `kit_version` pin in
// .wize/config/project.toml, the managed .gitignore block, the bootstrap block
// in a kit-generated AGENTS.md, the managed .wize/hooks/hydrate.sh when one is
// installed, and the removal of generated `wize` alias files from the index. In a git repo the default mode
// prepares them as one commit on `chore/wize-kit-<version>` inside a throwaway
// worktree, so the user's checkout, branch, index and dirty files are never
// touched and nothing is ever committed on the default branch. `--pr` pushes
// that branch and opens a pull request. `--in-place` (and any non-git
// directory) edits the working tree directly, re-renders the adapters and
// never commits.
//
// Never touched: user.toml, tea.toml, .wize/custom/, artifacts, knowledge.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ALIAS_PATHS, computeGitignore } = require('../setup-helpers.js');
const { readToml, parseToml, loadProjectConfig, rewriteTomlValue } = require('../toml.js');
const { compareVersions } = require('../semver.js');
const { renderTargets, outputSpecs } = require('../render-targets.js');
const { writeMarker } = require('../marker.js');
const { kitVersionOf } = require('../project-status.js');
const {
  gitContext, defaultBranch, hasRemote, worktreeList, statusPorcelain, dirtyTrackedSet, localBranchExists, refExists
} = require('../git-context.js');
const ops = require('../git-ops.js');
const { isKitAgentsMd, upsertBootstrapBlock } = require('../render-shared.js');
const { refreshedHook, HOOK_REL } = require('./hooks.js');

const PROJECT_TOML = '.wize/config/project.toml';

const loadInstalledKitVersion = kitVersionOf;

// Returns a list of CHANGELOG entries (markdown blocks) for versions strictly
// between `from` and `to`. Best-effort — if CHANGELOG layout is unusual,
// returns an empty list and falls back to a generic note.
function changelogBetween(kitRoot, fromVersion, toVersion) {
  const file = path.join(kitRoot, 'CHANGELOG.md');
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf-8');
  const versionRe = /^## \[(\d+\.\d+\.\d+)\][^\n]*\n/gm;
  const matches = [];
  let m;
  while ((m = versionRe.exec(content)) !== null) {
    matches.push({ v: m[1], start: m.index, headerEnd: versionRe.lastIndex });
  }
  for (let i = 0; i < matches.length; i++) {
    matches[i].end = i + 1 < matches.length ? matches[i + 1].start : content.length;
  }
  return matches
    .filter(x => compareVersions(x.v, fromVersion) > 0 && compareVersions(x.v, toVersion) <= 0)
    .map(x => content.slice(x.start, x.end).trim());
}

const excerpt = (entry) => entry.split('\n').slice(0, 4).join('\n');

// ---- plan ------------------------------------------------------------------

// A plan source answers two questions about one tree: what does a file say,
// and which files under these paths are tracked. Paths are relative to the
// project root.
function fsSource(root) {
  return {
    read(rel) {
      try {
        const file = path.join(root, rel);
        if (!fs.lstatSync(file).isFile()) return null;
        return fs.readFileSync(file, 'utf-8');
      } catch { return null; }
    },
    special(rel) {
      try { const st = fs.lstatSync(path.join(root, rel)); return !st.isFile(); } catch { return false; }
    },
    tracked: (paths) => ops.lsFiles(root, paths)
  };
}

function refSource(root, ref) {
  return {
    read: (rel) => ops.showFile(root, ref, rel),
    special: (rel) => ops.isSpecialAt(root, ref, rel),
    tracked: (paths) => ops.lsTree(root, ref, paths)
  };
}

// The tracked changes needed to converge a tree to kit version `to`. Pure:
// reads through `source` (a directory or a fs/ref source) and writes nothing.
// Returns { ok, from, to, files: [{ path, content, mode }], untrack, converged },
// or { ok: false, error: 'no-project' | 'toml-write' }.
//
// `untrack` is limited to tracked files under the exact ALIAS_PATHS: the
// managed block ignores those by construction, and other tracked-but-ignored
// files (repos that deliberately commit wize-* outputs) stay as they are.
function planTrackedChanges(treeRootOrSource, to, { refreshGitignore = true } = {}) {
  const source = typeof treeRootOrSource === 'string' ? fsSource(treeRootOrSource) : treeRootOrSource;
  const toml = source.read(PROJECT_TOML);
  const cfg = toml === null ? {} : parseToml(toml);
  if (!cfg.project) return { ok: false, error: 'no-project' };
  const from = cfg.project.kit_version || '0.0.0';

  const files = [];
  const nextToml = rewriteTomlValue(toml, 'project', 'kit_version', to);
  if (nextToml === null) return { ok: false, error: 'toml-write', from };
  if (nextToml !== toml) files.push({ path: PROJECT_TOML, content: nextToml, mode: 'pin' });

  let untrack = [];
  if (refreshGitignore) {
    // A symlinked .gitignore is the user's own arrangement: left alone.
    const gi = source.special('.gitignore') ? { changed: false } : computeGitignore(source.read('.gitignore'));
    if (gi.changed) files.push({ path: '.gitignore', content: gi.next, mode: gi.mode });
    untrack = source.tracked(ALIAS_PATHS);
  }

  // Only an AGENTS.md this kit generated gets the block; a foreign one is never edited.
  const agents = source.read('AGENTS.md');
  if (isKitAgentsMd(agents)) {
    const next = upsertBootstrapBlock(agents);
    if (next !== agents) files.push({ path: 'AGENTS.md', content: next, mode: 'bootstrap block' });
  }
  const hook = source.read(HOOK_REL);
  const hookNext = hook === null ? null : refreshedHook(hook);
  if (hookNext !== null) files.push({ path: HOOK_REL, content: hookNext, mode: 'managed hook', exec: true });
  return { ok: true, from, to, files, untrack, converged: files.length === 0 && untrack.length === 0 };
}

// Writes the plan into `treeRoot`. Refuses (returns { error }) before writing
// anything when a target, or a directory above it, is a symlink: a write
// would land outside the tree. A throwing caller never sees partial writes.
function unsafeTarget(treeRoot, rel) {
  const parts = rel.split('/');
  let cur = treeRoot;
  for (const part of parts) {
    cur = path.join(cur, part);
    let st;
    try { st = fs.lstatSync(cur); } catch { return false; }
    if (st.isSymbolicLink()) return true;
  }
  return false;
}

function writePlan(treeRoot, plan) {
  const bad = plan.files.filter(f => unsafeTarget(treeRoot, f.path)).map(f => f.path);
  if (bad.length) return { error: `refusing to write through a symlink: ${bad.join(', ')}; replace it with a regular file` };
  for (const f of plan.files) {
    const file = path.join(treeRoot, f.path);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, f.content, 'utf-8');
    if (f.exec) fs.chmodSync(file, 0o755);
  }
  return {};
}

// ---- options and output ------------------------------------------------------

function readOpts(opts) {
  const flag = (kebab, camel) => !!(opts[kebab] ?? opts[camel]);
  return {
    pr: !!opts.pr,
    inPlace: flag('in-place', 'inPlace'),
    check: !!opts.check,
    dryRun: flag('dry-run', 'dryRun'),
    json: !!opts.json,
    base: opts.base,
    allowDowngrade: flag('allow-downgrade', 'allowDowngrade'),
    noRender: flag('no-render', 'noRender'),
    refreshGitignore: opts.refreshGitignore !== false
  };
}

function printChangelog(log, kitRoot, entries) {
  if (!entries.length) return;
  log('\nWhat changed (excerpt from CHANGELOG):');
  for (const e of entries) {
    log(excerpt(e).split('\n').map(l => '  ' + l).join('\n'));
    log('  …');
  }
  log(`\nFull details: ${path.join(kitRoot, 'CHANGELOG.md')}`);
}

// ---- base resolution (isolated mode) -----------------------------------------

// { base, def, warning } or { error }. With `fetch` false (check/dry-run) the
// remote is not contacted and origin/<default> is used if it exists.
function resolveBase(projectRoot, baseFlag, { fetch }) {
  if (baseFlag !== undefined && baseFlag !== null) {
    if (typeof baseFlag !== 'string' || !baseFlag.trim()) return { error: '--base needs a ref' };
    const base = baseFlag.trim();
    if (!refExists(projectRoot, base)) return { error: `base ${base} not found` };
    return { base, def: defaultBranch(projectRoot) || base.replace(/^origin\//, ''), warning: null };
  }
  const def = defaultBranch(projectRoot);
  if (!def) return { error: 'cannot determine default branch; pass --base <ref> or --in-place' };
  const remoteRef = `origin/${def}`;
  if (!fetch) {
    if (refExists(projectRoot, remoteRef)) return { base: remoteRef, def, warning: null };
    if (refExists(projectRoot, def)) return { base: def, def, warning: null };
    return { error: `cannot find ${def}; pass --base <ref> or --in-place` };
  }
  const fetched = hasRemote(projectRoot) && ops.fetch(projectRoot, 'origin', def).ok;
  if (fetched && refExists(projectRoot, remoteRef)) return { base: remoteRef, def, warning: null };
  if (refExists(projectRoot, def)) return { base: def, def, warning: `using local ${def}; fetch failed` };
  if (refExists(projectRoot, remoteRef)) return { base: remoteRef, def, warning: `using ${remoteRef}; fetch failed` };
  return { error: `cannot find ${def}; pass --base <ref> or --in-place` };
}

// ---- temp worktree -------------------------------------------------------------

// Runs fn(treeRoot) inside a detached worktree of `ref`, removing it on every
// exit path including SIGINT/SIGTERM.
function withTempWorktree(projectRoot, toplevel, ref, fn) {
  const rel = path.relative(toplevel, projectRoot);
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wize-update-')));
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    ops.worktreeRemove(projectRoot, tmp);
    ops.rmDir(tmp);
    ops.worktreeForget(projectRoot, tmp);
  };
  const onInt = () => { cleanup(); process.exit(130); };
  const onTerm = () => { cleanup(); process.exit(143); };
  process.once('SIGINT', onInt);
  process.once('SIGTERM', onTerm);
  try {
    const added = ops.worktreeAdd(projectRoot, tmp, ref);
    if (!added.ok) return { error: `could not create a temp worktree: ${added.err}` };
    return fn(path.join(tmp, rel), tmp);
  } finally {
    process.removeListener('SIGINT', onInt);
    process.removeListener('SIGTERM', onTerm);
    cleanup();
  }
}

// 'converge' | 'downgrade' | 'bump': one verb for the commit and the PR.
function updateVerb(from, to) {
  if (from === to) return 'converge';
  return compareVersions(to, from) < 0 ? 'downgrade' : 'bump';
}

function updateSubject(from, to) {
  const verb = updateVerb(from, to);
  return verb === 'converge' ? `chore(wize): converge kit ${to}` : `chore(wize): ${verb} kit ${from} -> ${to}`;
}

function commitMessage(from, to, plan) {
  const subject = updateSubject(from, to);
  const lines = [`Converge this project to wize-dev-kit ${to}.`, ''];
  if (plan.files.length) {
    lines.push('Updated:');
    for (const f of plan.files) lines.push(`- ${f.path}`);
  }
  if (plan.untrack.length) {
    if (plan.files.length) lines.push('');
    lines.push('Untracked (generated, now git-ignored; still on disk and rebuilt by hydrate):');
    for (const p of plan.untrack) lines.push(`- ${p}`);
  }
  return { subject, body: lines.join('\n') };
}

// ---- command ---------------------------------------------------------------------

async function cmdUpdate({ kitRoot, projectRoot: rawRoot, opts = {} } = {}) {
  const o = readOpts(opts);
  const log = o.json ? () => {} : (opts.log || console.log);
  const errlog = opts.errlog || console.error;
  const emit = (r) => { if (o.json) (opts.write || console.log)(JSON.stringify(r)); return r; };

  let projectRoot;
  try { projectRoot = fs.realpathSync(rawRoot); } catch { projectRoot = path.resolve(rawRoot); }

  const to = loadInstalledKitVersion(kitRoot);
  let from = null;
  let mode = null;
  let base = null;
  let branch = null;
  const result = (extra) => ({
    changed: false, from, to, mode, base, branch, branch_exists: false, pr_url: null, adapters: [], converged: false, exitCode: 0, ...extra
  });
  const fail = (message, extra = {}) => {
    errlog(`✖ ${message}`);
    return emit(result({ exitCode: 1, error: message, ...extra }));
  };

  if (!to) return fail(`could not read the kit version from ${path.join(kitRoot, 'package.json')}`);
  const cfg = loadProjectConfig(projectRoot);
  if (!cfg.project) return fail('no .wize/config/project.toml here; run install first (npx wize-dev-kit install)');
  if (o.pr && o.inPlace) return fail('--pr and --in-place cannot be combined');

  const ctx = gitContext(projectRoot);
  mode = !ctx.isRepo || o.inPlace ? 'in-place' : 'isolated';
  if (o.pr && !ctx.isRepo) return fail('--pr needs a git repository');
  const planOpts = { refreshGitignore: o.refreshGitignore };
  const readOnly = o.check || o.dryRun;

  if (mode === 'in-place') {
    const plan = planTrackedChanges(fsSource(projectRoot), to, planOpts);
    if (!plan.ok) return fail(planError(plan, null));
    from = plan.from;
    const pinAhead = compareVersions(to, from) < 0 && !o.allowDowngrade;
    const changelog = changelogBetween(kitRoot, from, to);
    if (readOnly) return reportCheck({ o, plan, mode, base: null, branch: null, branchExists: false, pinAhead, changelog, kitRoot, log, emit, result });
    if (pinAhead) return fail(downgradeMessage(from, to));
    return applyInPlace({ kitRoot, projectRoot, ctx, cfg, plan, o, to, from, changelog, log, fail, emit, result });
  }

  // isolated
  const resolved = resolveBase(projectRoot, o.base, { fetch: !readOnly });
  if (resolved.error) return fail(resolved.error);
  base = resolved.base;
  const def = resolved.def;
  if (resolved.warning) log(`warning: ${resolved.warning}`);

  const basePlan = planTrackedChanges(refSource(projectRoot, base), to, planOpts);
  if (!basePlan.ok) return fail(planError(basePlan, base));
  from = basePlan.from;
  branch = `chore/wize-kit-${to}`;
  const branchExists = localBranchExists(projectRoot, branch);
  const pinAhead = compareVersions(to, from) < 0 && !o.allowDowngrade;
  const changelog = changelogBetween(kitRoot, from, to);

  if (readOnly) {
    return reportCheck({ o, plan: basePlan, mode, base, branch, branchExists, pinAhead, changelog, kitRoot, log, emit, result });
  }
  if (pinAhead) return fail(downgradeMessage(from, to));
  const extra = { branch_exists: branchExists };

  log(`Wize Dev Kit update: ${from} → ${to} (isolated, base ${base})`);
  const localPin = cfg.project.kit_version;
  if (localPin && localPin !== from) {
    if (compareVersions(from, localPin) > 0) log(`note: this checkout pins ${localPin}, ${base} pins ${from}; merge ${base} to pick that up`);
    else log(`note: this checkout pins ${localPin}, ${base} pins ${from}; ${base} is behind this checkout, and the update branch builds on ${base}`);
  }
  if (basePlan.converged) {
    log(`already converged at ${to}`);
    return emit(result({ ...extra, converged: true }));
  }

  let plan = basePlan;
  let startRef = base;
  let prepared = false;
  let preparedAt = null;
  if (branchExists) {
    const branchPlan = planTrackedChanges(refSource(projectRoot, branch), to, planOpts);
    if (!branchPlan.ok) return fail(`${branch} has no usable project.toml; rename or delete that branch`, extra);
    const wt = (worktreeList(projectRoot) || []).find(w => w.branch === branch);
    if (branchPlan.converged) {
      prepared = true;
      preparedAt = wt ? wt.path : null;
    } else if (wt) {
      return fail(`${branch} is checked out at ${wt.path}; finish it there`, extra);
    } else {
      plan = branchPlan;
      startRef = branch;
    }
  }

  // A fresh CI checkout, or a second developer, has no local branch while the
  // remote one already carries this update (an open PR, or a closed one whose
  // branch was kept). Building another commit would only be rejected at push.
  const remoteConverged = () => {
    if (!hasRemote(projectRoot) || !ops.fetch(projectRoot, 'origin', branch).ok) return false;
    const remotePlan = planTrackedChanges(refSource(projectRoot, 'FETCH_HEAD'), to, planOpts);
    return remotePlan.ok && remotePlan.converged;
  };
  let remoteOnly = false;
  if (o.pr && !prepared && !branchExists && remoteConverged()) {
    prepared = true;
    remoteOnly = true;
  }

  let commit = null;
  if (remoteOnly) {
    log(`already prepared on origin/${branch}`);
  } else if (prepared) {
    log(`already prepared on ${branch}${preparedAt ? ` (${preparedAt})` : ''}`);
  } else {
    const made = withTempWorktree(projectRoot, ctx.toplevel, startRef, (treeRoot, tmp) => {
      const wrote = writePlan(treeRoot, plan);
      if (wrote.error) return { error: wrote.error };
      const staged = plan.files.map(f => f.path);
      if (staged.length) {
        const a = ops.add(treeRoot, staged);
        if (!a.ok) return { error: `git add failed: ${a.err}` };
      }
      if (plan.untrack.length) {
        const r = ops.rmCached(treeRoot, plan.untrack);
        if (!r.ok) return { error: `git rm --cached failed: ${r.err}` };
      }
      const parent = ops.headSha(tmp);
      const { subject, body } = commitMessage(from, to, plan);
      let c;
      try { c = ops.commit(treeRoot, subject, body); }
      catch (err) { c = { ok: false, err: err.message }; }
      if (!c.ok) return { error: `${c.err}\nthe commit hook rejected the update; nothing was created. Fix the hook, or run \`update --in-place\` on a feature branch yourself.` };
      const sha = ops.headSha(tmp);
      // A project hook may have staged more than the plan (git add -u / -A).
      // The branch only ever carries the planned files.
      const prefix = path.relative(tmp, treeRoot).split(path.sep).filter(Boolean).join('/');
      const allowed = new Set([...plan.files.map(f => f.path), ...plan.untrack].map(p => (prefix ? `${prefix}/${p}` : p)));
      const changed = ops.diffNames(tmp, parent, sha);
      if (!changed) return { error: 'could not verify the update commit; nothing was created' };
      const stray = changed.filter(p => !allowed.has(p));
      if (stray.length) {
        const shown = stray.slice(0, 5).join(', ') + (stray.length > 5 ? `, and ${stray.length - 5} more` : '');
        return { error: `a commit hook changed files outside the update (${shown}); nothing was created. Fix the hook, or run \`update --in-place\` on a feature branch yourself.` };
      }
      const ref = branchExists ? ops.updateRef(projectRoot, branch, sha, parent) : ops.branchCreate(projectRoot, branch, sha);
      if (!ref.ok) return { error: `could not move ${branch} to the new commit: ${ref.err}` };
      return { sha };
    });
    if (made.error) return fail(made.error, extra);
    commit = made.sha;
    log(`✓ prepared ${branch} (${commit.slice(0, 7)}): ${plan.files.length} file(s) updated, ${plan.untrack.length} untracked`);
    for (const f of plan.files) log(`  ${f.path}`);
    for (const p of plan.untrack) log(`  untracked: ${p}`);
    log(`  review: git diff ${base}...${branch}`);
    if (!o.pr) log('  open a PR: npx wize-dev-kit update --pr');
  }

  let prUrl = null;
  if (o.pr) {
    const pr = openPr({ projectRoot, branch, def, from, to, entries: changelog, log, skipPush: remoteOnly, remoteConverged });
    if (pr.error) return fail(pr.error, { ...extra, branch_exists: true, commit });
    prUrl = pr.url;
  }

  if (!prepared || o.pr) {
    printChangelog(log, kitRoot, changelog);
    log('\nRestart your harness after the change reaches this checkout.');
  }
  return emit(result({ ...extra, branch_exists: true, changed: !prepared, commit, pr_url: prUrl }));
}

function planError(plan, base) {
  if (plan.error === 'toml-write') return 'could not write kit_version in project.toml';
  return base
    ? `.wize/config/project.toml not found on ${base}; merge the kit install first or pass --base <ref>`
    : 'no .wize/config/project.toml here; run install first (npx wize-dev-kit install)';
}

function downgradeMessage(from, to) {
  return `project pinned to ${from}, this kit is ${to}; run: npx wize-dev-kit@latest update, or pass --allow-downgrade if that pin is not published`;
}

// ---- --check / --dry-run ----------------------------------------------------------

function reportCheck({ o, plan, mode, base, branch, branchExists, pinAhead, changelog, kitRoot, log, emit, result }) {
  const report = {
    from: plan.from,
    to: plan.to,
    mode,
    base,
    branch,
    branch_exists: branchExists,
    files: plan.files.map(f => f.path),
    untrack: plan.untrack,
    changelog: changelog.map(excerpt),
    converged: plan.converged
  };
  const exitCode = o.dryRun ? 0 : pinAhead ? 12 : plan.converged ? 0 : 11;
  if (o.json) {
    emit(report);
    return result({ ...report, exitCode, converged: plan.converged });
  }
  log(`Wize Dev Kit update --${o.dryRun ? 'dry-run' : 'check'}: ${plan.from} → ${plan.to} (${mode}${base ? `, base ${base}` : ''})`);
  if (pinAhead) {
    log(downgradeMessage(plan.from, plan.to));
  } else if (plan.converged) {
    log(`already converged at ${plan.to}`);
  } else {
    log('pending changes:');
    for (const f of plan.files) log(`  ${f.path}`);
    for (const p of plan.untrack) log(`  untrack: ${p}`);
    if (branch) log(`  branch: ${branch}${branchExists ? ' (exists)' : ''}`);
  }
  if (!plan.converged && !pinAhead) printChangelog(log, kitRoot, changelog);
  return result({ ...report, exitCode, converged: plan.converged });
}

// ---- in-place -------------------------------------------------------------------

function applyInPlace({ kitRoot, projectRoot, ctx, cfg, plan, o, to, from, changelog, log, fail, emit, result }) {
  const gitFailed = (what, bypass = false) => fail(`git could not report the status of ${what} (git failed, timed out or reports a dubious ownership); cannot verify that nothing uncommitted would be overwritten. Fix git (for example safe.directory) and retry${bypass ? ', or rerun with --no-render' : ''}`);

  if (ctx.isRepo && plan.files.length) {
    const dirty = statusPorcelain(projectRoot, plan.files.map(f => f.path));
    if (dirty === null) return gitFailed('the files update must edit');
    if (dirty.length) {
      return fail(`uncommitted changes in files update must edit: ${dirty.map(l => l.slice(3)).join(', ')}; commit or stash them, or rerun without --in-place`);
    }
  }

  if (ctx.isRepo && !o.noRender) {
    const targets = ((cfg.install && cfg.install.ide_targets) || ['claude-code', 'generic']).map(t => (typeof t === 'string' ? t : t && t.code)).filter(Boolean);
    const specs = [...new Set(targets.flatMap(outputSpecs))];
    const dirtyOut = specs.length ? statusPorcelain(projectRoot, specs) : [];
    if (dirtyOut === null) return gitFailed('the generated files', true);
    const tracked = dirtyOut.filter(l => !l.startsWith('??') && !l.startsWith('!!'));
    if (tracked.length) {
      return fail(`uncommitted changes in tracked generated files the re-render would overwrite: ${tracked.map(l => l.slice(3)).join(', ')}; commit or stash them, or rerun with --no-render`);
    }
    // Git pathspecs stop at a symlinked output directory, so also ask the
    // renderer, in probe mode, which absolute landing paths it would write and
    // veto the ones that are tracked with uncommitted changes.
    const dirtyAbs = dirtyTrackedSet(projectRoot);
    if (dirtyAbs === null) return gitFailed('the tracked files', true);
    if (dirtyAbs.size) {
      const probe = renderTargets({
        kitRoot, projectRoot, targets: (cfg.install && cfg.install.ide_targets) || ['claude-code', 'generic'],
        profiles: (cfg.install && cfg.install.profiles) || ['core'],
        guard: (abs) => dirtyAbs.has(abs), probe: true
      });
      const vetoed = [...new Set(probe.adapters.flatMap(a => a.skippedTracked))].map(abs => path.relative(projectRoot, abs));
      if (vetoed.length) {
        const shown = vetoed.slice(0, 5).join(', ') + (vetoed.length > 5 ? `, and ${vetoed.length - 5} more` : '');
        return fail(`uncommitted changes in tracked generated files the re-render would overwrite (through a symlinked directory or not): ${shown}; commit or stash them, or rerun with --no-render`);
      }
    }
  }

  log(`Wize Dev Kit update: ${from} → ${to} (in-place)`);
  if (plan.converged) log('Already converged. Re-rendering adapters anyway (idempotent).');

  const wrote = writePlan(projectRoot, plan);
  if (wrote.error) return fail(wrote.error);
  const pinned = readToml(path.join(projectRoot, PROJECT_TOML));
  if (!pinned.project || pinned.project.kit_version !== to) return fail('could not write kit_version in project.toml');
  for (const f of plan.files) {
    if (f.mode === 'pin') log(`✓ project.toml kit_version → ${to}`);
    else if (f.path === '.gitignore') log(`✓ .gitignore ${f.mode}`);
    else log(`✓ ${f.path} ${f.mode} refreshed`);
  }

  if (plan.untrack.length) {
    const r = ops.rmCached(projectRoot, plan.untrack);
    if (r.ok) log(`✓ untracked ${plan.untrack.length} generated alias file(s) (kept on disk)`);
    else return fail(`git rm --cached failed: ${r.err}`);
  }

  let adapters = [];
  let renderOk = true;
  if (!o.noRender) {
    const targets = (cfg.install && cfg.install.ide_targets) || ['claude-code', 'generic'];
    const profiles = (cfg.install && cfg.install.profiles) || ['core'];
    log('\nRe-rendering active IDE adapters:');
    const rendered = renderTargets({ kitRoot, projectRoot, targets, profiles, log });
    adapters = rendered.adapters;
    renderOk = rendered.ok;
    if (renderOk) {
      writeMarker(projectRoot, {
        kit_version: to,
        pin: to,
        targets,
        profiles,
        counts: {
          written: adapters.reduce((n, a) => n + a.written, 0),
          unchanged: adapters.reduce((n, a) => n + a.unchanged, 0)
        },
        delegated: false,
        rendered_with: to
      });
    }
  }

  if (ctx.isRepo) {
    const def = defaultBranch(projectRoot);
    if (ctx.detached || ctx.branch === def) {
      log(`\ndo not commit this on ${ctx.detached ? 'a detached HEAD' : def}: create a branch first (or rerun without --in-place)`);
    } else if (ctx.linked) {
      log('\nwarning: pin bump on a feature branch conflicts at merge; prefer the default (isolated) mode');
    }
  }

  printChangelog(log, kitRoot, changelog);
  log('\nRestart your harness after the change reaches this checkout.');
  return emit(result({ changed: true, adapters, converged: plan.converged, exitCode: renderOk ? 0 : 1 }));
}

// ---- --pr -------------------------------------------------------------------------

// Push (never forced) and open or find the PR. { url } or { error }. With
// `skipPush` the remote branch already carries the update. A push the remote
// rejects is fine too when the remote branch carries the same update, which
// happens when two checkouts built the same commit content separately.
function openPr({ projectRoot, branch, def, from, to, entries, log, skipPush = false, remoteConverged = () => false }) {
  if (!hasRemote(projectRoot)) return { error: `no origin remote; branch ${branch} kept locally` };
  if (!skipPush) {
    const pushed = ops.push(projectRoot, 'origin', branch);
    if (!pushed.ok) {
      if (!/rejected|non-fast-forward|fetch first/i.test(pushed.err)) return { error: `git push failed: ${pushed.err}` };
      if (!remoteConverged()) return { error: `remote ${branch} diverged; resolve manually` };
      log(`origin/${branch} already carries this update`);
    } else {
      log(`✓ pushed ${branch} to origin`);
    }
  }

  const title = updateSubject(from, to);
  if (ops.ghAvailable()) {
    const existing = ops.ghPrView(projectRoot, branch);
    if (existing && String(existing.state).toUpperCase() === 'OPEN') {
      log(`PR already open: ${existing.url}`);
      return { url: existing.url };
    }
    const body = [
      { converge: `Converges the wize-dev-kit pin at ${to}.`, downgrade: `Downgrades the wize-dev-kit pin from ${from} to ${to}.`, bump: `Bumps the wize-dev-kit pin from ${from} to ${to}.` }[updateVerb(from, to)],
      ...(entries.length ? ['', entries.map(excerpt).join('\n\n')] : []),
      '',
      'After merge every worktree self-hydrates on its next session (`hydrate`).'
    ].join('\n');
    const created = ops.ghPrCreate(projectRoot, { base: def, head: branch, title, body });
    if (created.ok) {
      log(`✓ PR opened: ${created.url}`);
      return { url: created.url };
    }
    log(`warning: gh pr create failed: ${created.err.split('\n')[0]}`);
  }
  const web = ops.originWebUrl(projectRoot);
  if (web) {
    const url = `${web}/compare/${def}...${branch}?expand=1`;
    log(`Open the PR: ${url}`);
    return { url };
  }
  log(`open a PR for ${branch}`);
  return { url: null };
}

module.exports = {
  cmdUpdate,
  planTrackedChanges,
  readToml,
  loadProjectConfig,
  loadInstalledKitVersion,
  changelogBetween
};
