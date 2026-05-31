/* Stub renderer for this adapter — emits a console preview of what would be written. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function render(kitRoot, projectRoot, opts = {}) {
  const adapterDir = __dirname;
  const cfg = require('node:fs').readFileSync(path.join(adapterDir, 'adapter.yaml'), 'utf-8');
  const targetPath = (cfg.match(/^target_path:\s*"(.+)"$/m) || [])[1] || '';
  const filePattern = (cfg.match(/^file_pattern:\s*"(.+)"$/m) || [])[1] || '';
  console.log(`[adapter:${path.basename(adapterDir)}] would emit ${filePattern} under ${path.join(projectRoot, targetPath)}`);
}

module.exports = { render };
