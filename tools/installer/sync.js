/*
 * Adapter sync — regenerates IDE adapter files for each active target.
 *
 * Stub: in v0.1 this iterates the adapters/ folder and prints what would
 * be generated. Actual file emission per IDE is a v0.2+ deliverable.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function syncAll(kitRoot, projectConfig) {
  const adaptersDir = path.join(kitRoot, 'adapters');
  if (!fs.existsSync(adaptersDir)) {
    console.log('(skip) adapters/ not found');
    return;
  }
  const active = projectConfig?.install?.ide_targets || ['claude-code', 'generic'];
  for (const target of active) {
    const dir = path.join(adaptersDir, target);
    if (!fs.existsSync(dir)) {
      console.log(`(warn) adapter "${target}" not found in adapters/`);
      continue;
    }
    console.log(`→ would sync ${target} adapter (stub)`);
  }
}

module.exports = { syncAll };
