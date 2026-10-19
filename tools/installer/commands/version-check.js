// `wize-dev-kit version-check` — explicit, agent-friendly version check.
//
// The other CLI commands print an opportunistic hint (version-check.js's
// printUpdateHintIfAny) that stays silent on a non-TTY stdout so it never
// spams a pipe. This command is the opposite: it was asked for by name —
// by a human, or by an AI agent shelling out from a skill instruction where
// stdout is never a TTY — so it always answers, in `--json` when a caller
// needs to parse it.
//
// The answer carries the project's state and one `action` with the exact
// command to run, so a caller never compares versions itself.

'use strict';

const path = require('node:path');
const { getVersionCheckDetailed } = require('../version-check.js');
const { getProjectStatus, ACTION_EXIT_CODES } = require('../project-status.js');

const DEFAULT_KIT_ROOT = path.resolve(__dirname, '..', '..', '..');

const ACTION_TEXT = {
  hydrate: (s) => `This checkout is not hydrated (${s.reason}): run \`${s.commands.hydrate}\``,
  'use-pin': (s) => `Project pinned ${s.pin} is newer than this kit (${s.installed}): run \`${s.commands.hydrate}\``,
  install: (s) => `No .wize/config/project.toml here: run \`${s.commands.install}\``,
  update: (s) => `Project pinned ${s.pin || 'none'} (${s.reason}): run \`${s.commands.update}\``
};

const KIT_NOT_ON_BRANCH_TEXT = (s) => `The kit is installed on ${s.kit_at}'s branch but not on this one (kit-not-on-branch): merge the kit into this branch, or pass --here to install here (\`${s.commands.install} --here\`)`;

async function cmdVersionCheck({
  currentVersion,
  kitRoot = DEFAULT_KIT_ROOT,
  projectRoot = null,
  cwd = process.cwd(),
  json = false,
  refresh = false,
  quiet = false,
  exitCode = false,
  log = console.log
} = {}) {
  const { published_versions: published, ...base } = await getVersionCheckDetailed(currentVersion, { skipCache: refresh });

  // The background refresher: fetch, write the cache, say nothing.
  if (refresh && quiet) return { ...base, exitCode: 0 };

  const status = getProjectStatus({ kitRoot, cwd: projectRoot || cwd, latest: base.latest, latestSource: base.latest_source, published });
  const hasProject = !!status.root;
  const result = {
    ...base,
    schema: 2,
    project: hasProject ? {
      root: status.root,
      pin: status.pin,
      pin_status: status.pin_status,
      hydrated: status.hydrated,
      missing_targets: status.missing_targets,
      marker_version: status.marker_version,
      user_toml: status.user_toml
    } : null,
    git: status.git,
    ...(status.kit_at ? { kit_at: status.kit_at } : {}),
    skew: status.skew,
    action: status.action,
    reason: status.reason,
    commands: status.commands
  };
  result.exitCode = exitCode ? (ACTION_EXIT_CODES[status.action] ?? 0) : 0;

  if (json) {
    const { exitCode: _omit, ...printable } = result;
    log(JSON.stringify(printable));
    return result;
  }

  if (result.disabled) {
    log('Update check disabled (WIZE_DISABLE_UPDATE_CHECK=1).');
  } else if (!result.latest) {
    log(`wize-dev-kit ${result.installed} (could not reach the registry — offline or timed out).`);
  } else if (result.updateAvailable) {
    log(`↑ Update available: wize-dev-kit ${result.installed} → ${result.latest}`);
    log('  Run `npx wize-dev-kit@latest update` in your project to refresh adapters — or `/wize-update` from inside your AI harness.');
  } else {
    log(`wize-dev-kit ${result.installed} is up to date.`);
  }

  if (status.reason === 'kit-not-on-branch') {
    log(`→ ${KIT_NOT_ON_BRANCH_TEXT(status)}`);
    return result;
  }

  const covered = status.action === 'update' && result.updateAvailable;
  if (status.action !== 'none' && !covered && ACTION_TEXT[status.action]) {
    log(`→ ${ACTION_TEXT[status.action](status)}`);
  }
  return result;
}

module.exports = { cmdVersionCheck };
