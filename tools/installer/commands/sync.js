// `wize-dev-kit sync` — regenerate adapter outputs for the IDE targets the
// project opted into. Useful after editing .wize/config/project.toml,
// running `agent create`, or pulling kit changes that don't bump version.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadProjectConfig } = require('./update.js');

function cmdSync({ kitRoot, projectRoot, opts = {} } = {}) {
  const log = opts.log || console.log;
  const cfg = loadProjectConfig(projectRoot);
  if (!cfg.project) {
    log('No .wize/config/project.toml found here. Run `wize-dev-kit install` first.');
    return { changed: false };
  }
  const ideTargets = (cfg.install && cfg.install.ide_targets) || ['claude-code', 'generic'];
  const profiles = (cfg.install && cfg.install.profiles) || ['core'];
  log(`Syncing ${ideTargets.length} adapter(s) for profile(s) ${profiles.join(' + ')}:`);

  const results = [];
  for (const code of ideTargets) {
    const renderPath = path.join(kitRoot, 'adapters', code, 'render.js');
    if (!fs.existsSync(renderPath)) {
      log(`  - ${code}: skipped (adapter missing in installed kit)`);
      results.push({ code, skipped: true });
      continue;
    }
    delete require.cache[require.resolve(renderPath)];
    try {
      const out = require(renderPath).render(kitRoot, projectRoot, { profiles });
      const n = out && Array.isArray(out.written) ? out.written.length : 0;
      log(`  ✓ ${code}: ${n} file(s) emitted`);
      results.push({ code, written: n });
    } catch (err) {
      log(`  ✖ ${code}: ${err.message}`);
      results.push({ code, error: err.message });
    }
  }
  log('\nDone. Restart your IDE if it caches skills at startup.');
  return { changed: true, adapters: results };
}

module.exports = { cmdSync };
