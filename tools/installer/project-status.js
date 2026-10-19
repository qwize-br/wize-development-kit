// Local project status for `version-check` and the CLI hints: what this
// checkout is pinned to, whether it is hydrated, how that compares with the
// running kit and the registry, and the one action to take next. Reads files
// and git only; the registry answer comes in as `latest`.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadProjectConfig } = require('./toml.js');
const { compareVersions, parse, isSafePin } = require('./semver.js');
const { findProjectRoot, findKitElsewhere } = require('./project-root.js');
const { real } = require('./util.js');
const { gitContext, defaultBranch } = require('./git-context.js');
const { missingTargets } = require('./render-targets.js');
const { readMarker, markerPin, fallbackExpired } = require('./marker.js');

// First kit version that ships `hydrate`; older pins only know `sync`.
const HYDRATE_MIN = '0.27.0';

const ACTION_EXIT_CODES = { none: 0, hydrate: 10, update: 11, 'use-pin': 12, install: 13 };

function kitVersionOf(kitRoot) {
  try { return require(path.join(kitRoot, 'package.json')).version; }
  catch { return null; }
}

function supportsHydrate(pin) {
  return isSafePin(pin) && !!parse(pin) && compareVersions(pin, HYDRATE_MIN) >= 0;
}

function hydrateCommand(pin) {
  if (!isSafePin(pin)) return 'npx --yes wize-dev-kit hydrate';
  return supportsHydrate(pin)
    ? `npx --yes wize-dev-kit@${pin} hydrate`
    : `npx --yes wize-dev-kit@${pin} sync`;
}

function gitFacts(root) {
  const ctx = gitContext(root);
  return {
    repo: ctx.isRepo,
    linked: ctx.linked,
    primary: ctx.primary,
    branch: ctx.branch,
    detached: ctx.isRepo ? ctx.detached : false,
    default_branch: ctx.isRepo ? defaultBranch(root) : null
  };
}

// `latestSource` says where `latest` came from. Only a registry answer fetched
// just now (`'network'`) can prove a pin is unpublished: a cached answer may be
// an hour old, or older offline, and a newer release would read as a downgrade.
// `published` is the packument's list of every published version; a pin above
// `latest` is unpublished only when that list is known and lacks it (a
// prerelease published under another dist-tag is ahead of `latest` too).
function getProjectStatus({ kitRoot, cwd = process.cwd(), latest = null, latestSource = null, published = null, env = process.env } = {}) {
  const installed = kitVersionOf(kitRoot);
  const root = findProjectRoot(cwd);
  const commands = {
    hydrate: hydrateCommand(null),
    update: 'npx --yes wize-dev-kit@latest update',
    pr: 'npx --yes wize-dev-kit@latest update --pr',
    install: 'npx --yes wize-dev-kit@latest install'
  };
  const base = {
    root,
    pin: null,
    installed,
    latest: latest || null,
    pin_status: 'missing',
    hydrated: 'ok',
    missing_targets: [],
    marker_version: null,
    user_toml: 'missing',
    git: gitFacts(root || cwd),
    skew: 'none',
    action: 'none',
    reason: '',
    commands
  };

  if (!root) {
    // A linked worktree whose branch predates the kit install: installing would
    // fork the pin, so the answer is to merge, not to install.
    const kitAt = findKitElsewhere(real(cwd), gitContext(real(cwd)));
    if (kitAt) return { ...base, action: 'none', reason: 'kit-not-on-branch', kit_at: kitAt, commands: { ...commands, install: `${commands.install} --here` } };
    return { ...base, action: 'install', reason: 'no-project', pin_status: 'missing', user_toml: 'missing' };
  }

  const cfg = loadProjectConfig(root);
  const pin = (cfg.project && typeof cfg.project.kit_version === 'string' && cfg.project.kit_version) || null;
  const targets = (cfg.install && cfg.install.ide_targets) || ['claude-code', 'generic'];
  const marker = readMarker(root);
  const missing = missingTargets(root, targets);
  const userToml = fs.existsSync(path.join(root, '.wize', 'config', 'user.toml')) ? 'present' : 'missing';
  const known = !!latest;

  let pinStatus = 'ok';
  if (!pin) pinStatus = 'missing';
  else if (!isSafePin(pin)) pinStatus = 'invalid';
  else if (installed && compareVersions(pin, installed) > 0) {
    const proven = known && latestSource === 'network' && compareVersions(pin, latest) > 0
      && Array.isArray(published) && !published.includes(pin);
    pinStatus = proven ? 'unpublished' : 'ahead-of-binary';
  }

  let hydrated = 'ok';
  if (missing.length) hydrated = 'missing';
  else if (supportsHydrate(pin) && marker && (markerPin(marker) !== pin || fallbackExpired(marker))) hydrated = 'stale';

  let skew = 'none';
  if (pin && installed) {
    const cmp = compareVersions(pin, installed);
    if (cmp < 0) skew = 'project-behind';
    else if (cmp > 0) skew = 'project-ahead';
    else if (known && compareVersions(latest, pin) > 0) skew = 'registry-ahead';
  }

  commands.hydrate = hydrateCommand(pin);

  let action = 'none';
  let reason = 'up-to-date';
  if (hydrated !== 'ok') {
    action = 'hydrate';
    reason = hydrated === 'missing' ? 'unhydrated' : 'stale-marker';
  } else if (userToml === 'missing' && supportsHydrate(pin)) {
    action = 'hydrate';
    reason = 'user-toml-missing';
  } else if (pinStatus === 'unpublished') {
    action = 'update';
    reason = 'pin-unpublished';
    commands.update = 'npx --yes wize-dev-kit@latest update --allow-downgrade';
  } else if (pinStatus === 'ahead-of-binary') {
    action = 'use-pin';
    reason = 'pin-ahead-of-binary';
  } else if (pinStatus === 'missing' || pinStatus === 'invalid') {
    action = 'update';
    reason = pinStatus === 'missing' ? 'pin-missing' : 'pin-invalid';
  } else if (skew === 'project-behind') {
    action = 'update';
    reason = 'project-behind';
  } else if (skew === 'registry-ahead') {
    action = 'update';
    reason = 'registry-ahead';
  }

  // WIZE_DISABLE_UPDATE_CHECK=1 is the opt-out of auto-update: the skew stays
  // visible, the update action does not.
  if (env.WIZE_DISABLE_UPDATE_CHECK === '1' && action === 'update') {
    action = 'none';
    reason = 'update-disabled';
  }

  return {
    ...base,
    root,
    pin,
    pin_status: pinStatus,
    hydrated,
    missing_targets: missing,
    marker_version: marker ? marker.kit_version ?? null : null,
    user_toml: userToml,
    skew,
    action,
    reason,
    commands
  };
}

module.exports = { getProjectStatus, kitVersionOf, hydrateCommand, supportsHydrate, ACTION_EXIT_CODES, HYDRATE_MIN };
