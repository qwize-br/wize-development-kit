// `wize-dev-kit hydrate` — render this checkout from .wize/config/project.toml.
//
// Built for fresh worktrees (Orca, Claude Code, Codex, Cursor): no prompts,
// never reads stdin, never runs the baseline, never writes tracked files
// (project.toml, .gitignore, AGENTS.md, tea.toml, .wize/custom, artifacts,
// knowledge) and never runs a mutating git command. Always exits 0 so a
// failure cannot block worktree creation; --strict turns ok:false into 1.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadProjectConfig } = require('../toml.js');
const { compareVersions, semverGreater, parse, safePin } = require('../semver.js');
const { gitContext, trackedSet, statusPorcelain } = require('../git-context.js');
const { renderTargets, missingTargets } = require('../render-targets.js');
const { readMarker, writeMarker, markerPin, fallbackExpired } = require('../marker.js');
const { deriveUserToml } = require('../setup-helpers.js');
const { getLatestNoWait, isCI } = require('../version-check.js');
const { HYDRATE_MIN, supportsHydrate } = require('../project-status.js');
const { real, sameSet } = require('../util.js');

const DELEGATE_ATTEMPTS = 2;
// Per attempt. A dropped network never fails fast (npm's fetch timeout does not
// cap the TCP connect), so a killed attempt is not retried; the cold-cache race
// that the second attempt absorbs fails quickly. Two cold attempts stay well
// under the 180 s SessionStart budget.
const DELEGATE_TIMEOUT_MS = 45000;
const DELEGATE_BACKOFF_MS = 2000;

const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const lexists = (p) => { try { fs.lstatSync(p); return true; } catch { return false; } };

function sleepSync(ms) {
  if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// user.toml is per-developer and git-ignored, so each checkout needs its own.
// Never overwrites. Sources in order: $ORCA_ROOT_PATH (only when it belongs to
// this repository), the primary checkout, then a file derived from git/$USER.
// -> 'present' | 'copied:<src>' | 'generated' | 'failed'
function ensureUserToml({ root, ctx, env }) {
  const dest = path.join(root, '.wize', 'config', 'user.toml');
  if (fs.existsSync(dest)) return 'present';

  const candidates = [];
  if (env.ORCA_ROOT_PATH && ctx.commonDir) {
    const orcaRoot = real(env.ORCA_ROOT_PATH);
    const theirs = gitContext(orcaRoot);
    if (theirs.isRepo && theirs.commonDir && real(theirs.commonDir) === real(ctx.commonDir)) candidates.push(orcaRoot);
  }
  if (ctx.primary && real(ctx.primary) !== real(root)) candidates.push(ctx.primary);

  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    for (const dir of candidates) {
      const src = path.join(dir, '.wize', 'config', 'user.toml');
      if (!isFile(src) || real(src) === real(dest)) continue;
      try {
        fs.copyFileSync(src, dest, fs.constants.COPYFILE_EXCL);
        return `copied:${src}`;
      } catch (err) {
        if (err.code === 'EEXIST') return 'present';
      }
    }
    fs.writeFileSync(dest, deriveUserToml(root, env), { encoding: 'utf-8', flag: 'wx' });
    return 'generated';
  } catch (err) {
    return err.code === 'EEXIST' ? 'present' : 'failed';
  }
}

// No --root: the child runs with cwd = root, and a path with spaces or shell
// metacharacters would be split by cmd.exe on Windows (shell: true). --strict
// is always on, so a child that rendered nothing is not counted as success.
function forwardedFlags(flags) {
  const out = ['--strict'];
  for (const f of ['json', 'quiet', 'if-needed', 'no-notice']) if (flags[f]) out.push(`--${f}`);
  return out;
}

// Runs `npx wize-dev-kit@<pin> hydrate` so the checkout renders exactly the
// pinned kit. Two attempts absorb the cold-cache ENOTEMPTY race. An exact
// version is immutable, so a cached copy is used without revalidating the
// packument (offline, revalidation alone costs about 70 s), and npm's own fetch
// retries are off because the loop retries.
function delegate({ pin, root, flags, env, spawn, backoffMs, warn }) {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['--yes', '--prefer-offline', `wize-dev-kit@${pin}`, 'hydrate', ...forwardedFlags(flags)];
  for (let attempt = 1; attempt <= DELEGATE_ATTEMPTS; attempt++) {
    const r = spawn(npx, args, {
      cwd: root,
      env: {
        npm_config_fetch_retries: '0',
        npm_config_fetch_timeout: '20000',
        ...env,
        // The child must render this root, not whatever ORCA_WORKTREE_PATH names.
        WIZE_PROJECT_ROOT: root,
        WIZE_HYDRATE_DELEGATED: '1', WIZE_SKIP_BASELINE: '1', WIZE_DISABLE_UPDATE_CHECK: '1'
      },
      timeout: DELEGATE_TIMEOUT_MS,
      // --json needs exactly one object on stdout, so keep the child's output
      // until it is known to have succeeded. stderr is held back too: a failed
      // attempt would print npm's raw ETARGET/ENOTFOUND block once per attempt,
      // and the caller prints one line instead (WIZE_VERBOSE=1 shows it all).
      stdio: ['ignore', flags.json ? 'pipe' : 'inherit', env.WIZE_VERBOSE === '1' ? 'inherit' : 'pipe'],
      encoding: 'utf-8',
      shell: process.platform === 'win32'
    });
    if (r && !r.error && r.status === 0) {
      if (typeof r.stderr === 'string' && r.stderr) warn(r.stderr.trimEnd());
      return { ok: true, stdout: typeof r.stdout === 'string' ? r.stdout : '' };
    }
    const timedOut = !!(r && ((r.error && r.error.code === 'ETIMEDOUT') || (r.signal && !r.error)));
    if (timedOut) break;
    if (attempt < DELEGATE_ATTEMPTS) sleepSync(backoffMs);
  }
  return { ok: false };
}

function cmdHydrate({ kitRoot, binary, projectRoot, flags = {}, env = process.env, log = console.log, warn = console.error, deps = {} } = {}) {
  const spawn = deps.spawnSync || spawnSync;
  const latestNoWait = deps.getLatestNoWait || getLatestNoWait;
  const backoffMs = Number.isFinite(Number(env.WIZE_HYDRATE_BACKOFF_MS)) && env.WIZE_HYDRATE_BACKOFF_MS !== undefined
    ? Number(env.WIZE_HYDRATE_BACKOFF_MS) : DELEGATE_BACKOFF_MS;
  const root = projectRoot;
  const result = {
    ok: true, root, linked: false, primary: null, pin: null, binary,
    delegated: false, user_toml: null, adapters: [], warnings: [], notice: null
  };
  const say = (line) => { if (!flags.json) log(line); };
  const chatter = (line) => { if (!flags.json && !flags.quiet) log(line); };
  const warning = (line) => { result.warnings.push(line); warn(line); };
  const emit = () => {
    if (flags.json) log(JSON.stringify(result));
    result.exitCode = flags.strict && !result.ok ? 1 : 0;
    return result;
  };

  try {
    if (!isFile(path.join(root, '.wize', 'config', 'project.toml'))) {
      const bare = gitContext(root);
      result.linked = bare.linked;
      result.primary = bare.primary;
      say('wize: no .wize/config/project.toml here, skipping');
      // A delegated child that finds nothing to render must not read as success.
      if (env.WIZE_HYDRATE_DELEGATED) result.ok = false;
      return emit();
    }

    const cfg = loadProjectConfig(root);
    const targets = (cfg.install && cfg.install.ide_targets) || ['claude-code', 'generic'];
    const profiles = (cfg.install && cfg.install.profiles) || ['core'];
    const pin = (cfg.project && typeof cfg.project.kit_version === 'string' && cfg.project.kit_version) || null;
    result.pin = pin;

    const ctx = gitContext(root);
    result.linked = ctx.linked;
    result.primary = ctx.primary;

    if (flags['if-needed']) {
      const marker = readMarker(root);
      const userToml = fs.existsSync(path.join(root, '.wize', 'config', 'user.toml'));
      if (pin && marker && markerPin(marker) === pin && !fallbackExpired(marker)
        && sameSet(marker.targets || [], targets) && sameSet(marker.profiles || [], profiles)
        && userToml && missingTargets(root, targets).length === 0) {
        result.user_toml = 'present';
        result.adapters = [];
        if (!flags.quiet) say(`wize: already hydrated (${pin})`);
        return emit();
      }
    }

    const before = statusPorcelain(root);

    result.user_toml = ensureUserToml({ root, ctx, env });
    if (result.user_toml === 'failed') warning('wize: could not create .wize/config/user.toml; copy it from your primary checkout');

    const canDelegate = supportsHydrate(pin) && pin !== binary
      && !flags['no-delegate'] && !env.WIZE_HYDRATE_DELEGATED;
    if (pin && !parse(pin)) {
      warning(`wize: kit_version "${pin}" is not a version; rendering with ${binary}`);
    } else if (pin && compareVersions(pin, HYDRATE_MIN) < 0) {
      warning(`wize: pin ${pin} predates hydrate; adopt it with: npx wize-dev-kit@latest update`);
    } else if (!pin) {
      warning('wize: kit_version missing in project.toml; run: npx wize-dev-kit@latest update');
    }

    let delegated = false;
    if (canDelegate) {
      const d = delegate({ pin, root, flags, env, spawn, backoffMs, warn });
      if (d.ok) {
        delegated = true;
        result.delegated = true;
        if (flags.json) {
          try {
            const child = JSON.parse(d.stdout.trim());
            if (Array.isArray(child.adapters)) result.adapters = child.adapters;
            if (child.ok === false) result.ok = false;
            if (Array.isArray(child.warnings)) result.warnings.push(...child.warnings);
          } catch {
            result.warnings.push('wize: delegated hydrate finished but its JSON output was unreadable');
          }
        }
      } else {
        warning(`wize: could not run kit ${pin} (offline or unpublished); rendering with ${binary}`);
      }
    }

    if (!delegated) {
      // Fail closed: when git cannot say what is tracked (missing binary,
      // "dubious ownership"), no existing file is overwritten.
      const tracked = ctx.isRepo ? trackedSet(root) : new Set();
      const failClosed = tracked === null;
      // A write that lands outside the project (a symlinked directory leading
      // into another directory or repository) is never allowed.
      const rootReal = real(root);
      const inside = (p) => [root, rootReal].some(r => p === r || p.startsWith(r + path.sep));
      const guard = (abs) => !inside(abs) || (failClosed ? lexists(abs) : tracked.has(abs));
      if (failClosed) warning('wize: git could not list tracked files (git missing or unsafe repository); existing files are left untouched');
      const render = renderTargets({
        kitRoot, projectRoot: root, targets, profiles,
        guard,
        skipAgentsMd: true
      });
      result.adapters = render.adapters;
      for (const a of render.adapters) {
        if (a.skipped) chatter(`  - ${a.code}: skipped (${a.reason})`);
        else if (a.error) chatter(`  ✖ ${a.code}: ${a.error}`);
        else chatter(`  ✓ ${a.code}: ${a.written} written, ${a.unchanged} unchanged${a.skippedTracked.length ? `, ${a.skippedTracked.length} tracked skipped` : ''}`);
      }
      const failed = render.adapters.filter(a => a.error);
      if (failed.length) {
        result.ok = false;
        for (const a of failed) result.warnings.push(`wize: adapter ${a.code} failed: ${a.error}`);
        warn(`wize: hydrate: adapter ${failed.map(a => a.code).join(', ')} failed; run: npx --yes wize-dev-kit@${safePin(pin) || 'latest'} hydrate`);
      }
      const trackedSkipped = render.adapters.reduce((n, a) => n + a.skippedTracked.length, 0);
      if (trackedSkipped && !failClosed) {
        warning(`wize: ${trackedSkipped} generated file(s) are tracked by git or resolve outside the project and were left untouched; untrack them with: npx wize-dev-kit@latest update`);
      }
      if (!failed.length && !(failClosed && trackedSkipped)) {
        writeMarker(root, {
          kit_version: binary,
          pin,
          targets,
          profiles,
          counts: {
            written: render.adapters.reduce((n, a) => n + a.written, 0),
            unchanged: render.adapters.reduce((n, a) => n + a.unchanged, 0),
            skipped_tracked: trackedSkipped
          },
          delegated: false,
          rendered_with: binary,
          fallback: canDelegate
        });
      }
    }

    // Safety net: whatever shows up in `git status` that was not there before
    // means the .gitignore block is out of date. Nothing is reverted.
    const after = statusPorcelain(root);
    if (before && after) {
      const known = new Set(before);
      const fresh = after.filter(l => !known.has(l));
      if (fresh.length) {
        warning(`wize: hydrate left new or changed entries in git status: ${fresh.map(l => l.trim()).join(', ')}; your .gitignore block is outdated; run: npx wize-dev-kit@latest update`);
      }
    }

    // Notice: cache only, never blocks.
    const quietNotice = flags['no-notice'] || flags.quiet || env.WIZE_DISABLE_UPDATE_CHECK === '1' || isCI(env);
    if (!quietNotice && pin) {
      // Without a terminal (an agent, an Orca setup script) no background refresh is started.
      const isTTY = deps.isTTY !== undefined ? deps.isTTY : process.stdout.isTTY;
      const latest = latestNoWait({ env: isTTY ? env : { ...env, WIZE_NO_BG_REFRESH: '1' } });
      if (latest && semverGreater(latest, pin)) {
        result.notice = `wize: kit ${pin} -> ${latest} available; run: npx wize-dev-kit@latest update`;
        say(result.notice);
      }
    }

    if (!delegated) {
      const via = pin && pin !== binary ? `, rendered with ${binary}` : '';
      say(`wize: hydrated ${root} (kit_version ${pin || 'none'}${via}, ${result.adapters.length} adapters, user.toml: ${result.user_toml})`);
    }
    return emit();
  } catch (err) {
    result.ok = false;
    const pin = result.pin;
    warn(`wize: hydrate: ${err && err.message ? err.message : err}; run: npx --yes wize-dev-kit@${safePin(pin) || 'latest'} hydrate`);
    result.warnings.push(`wize: hydrate: ${err && err.message ? err.message : err}`);
    return emit();
  }
}

module.exports = { cmdHydrate };
