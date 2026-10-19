// `wize-dev-kit sync` — regenerate adapter outputs for the IDE targets the
// project opted into. Useful after editing .wize/config/project.toml,
// running `agent create`, or pulling kit changes that don't bump version.
//
// sync is the explicit "regenerate everything" command, so it renders
// unguarded. It never writes user.toml, .gitignore or kit_version. For a
// fresh checkout `hydrate` is the safe command; sync stays for old hook
// scripts and for pins that predate hydrate.

'use strict';

const { loadProjectConfig } = require('../toml.js');
const { renderTargets } = require('../render-targets.js');
const { writeMarker } = require('../marker.js');
const { compareVersions, parse, safePin } = require('../semver.js');
const { loadInstalledKitVersion } = require('./update.js');
const { supportsHydrate } = require('../project-status.js');

// -> 'none' | 'project-behind' | 'project-ahead'
function skewOf(pin, binary) {
  if (!pin || !binary || !parse(pin) || !parse(binary)) return 'none';
  const cmp = compareVersions(pin, binary);
  return cmp < 0 ? 'project-behind' : cmp > 0 ? 'project-ahead' : 'none';
}

function cmdSync({ kitRoot, projectRoot, opts = {} } = {}) {
  const log = opts.log || console.log;
  const warn = opts.warn || console.error;
  const cfg = loadProjectConfig(projectRoot);
  if (!cfg.project) {
    log('No .wize/config/project.toml found here. Run `wize-dev-kit install` first.');
    return { changed: false, adapters: [], skew: 'none' };
  }
  const ideTargets = (cfg.install && cfg.install.ide_targets) || ['claude-code', 'generic'];
  const profiles = (cfg.install && cfg.install.profiles) || ['core'];
  const pin = (typeof cfg.project.kit_version === 'string' && cfg.project.kit_version) || null;
  const binary = loadInstalledKitVersion(kitRoot);

  const skew = skewOf(pin, binary);
  if (skew === 'project-behind') {
    warn(`wize: project pinned ${pin}, running ${binary}; for an exact render run: npx --yes wize-dev-kit@${safePin(pin) || 'latest'} sync (or update the pin: npx wize-dev-kit@latest update)`);
  } else if (skew === 'project-ahead') {
    warn(`wize: project pinned ${pin} is newer than this kit ${binary}; run: npx --yes wize-dev-kit@${safePin(pin) || 'latest'} sync`);
  }
  if (supportsHydrate(pin)) warn('prefer: npx wize-dev-kit hydrate');

  log(`Syncing ${ideTargets.length} adapter(s) for profile(s) ${profiles.join(' + ')}:`);

  const { adapters: results } = renderTargets({ kitRoot, projectRoot, targets: ideTargets, profiles });
  for (const a of results) {
    if (a.skipped) log(`  - ${a.code}: skipped (${a.reason === 'adapter missing' ? 'adapter missing in installed kit' : a.reason})`);
    else if (a.error) log(`  ✖ ${a.code}: ${a.error}`);
    else log(`  ✓ ${a.code}: ${a.written + a.unchanged} file(s) emitted`);
  }

  const written = results.reduce((n, a) => n + (a.written || 0), 0);
  if (!results.some(a => a.error)) {
    writeMarker(projectRoot, {
      kit_version: binary,
      targets: ideTargets,
      profiles,
      counts: { written, unchanged: results.reduce((n, a) => n + (a.unchanged || 0), 0), skipped_tracked: 0 },
      delegated: false,
      rendered_with: binary
    });
  }

  log('\nDone. Restart your IDE if it caches skills at startup.');
  return { changed: written > 0, adapters: results, skew };
}

module.exports = { cmdSync };
