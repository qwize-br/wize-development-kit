// Google Antigravity adapter — emits .agent/skills/wize-{code}/SKILL.md per asset.
// Note: directory is SINGULAR `.agent`. The `.antigravitycli/` directory is
// Antigravity's own CLI state and must not be touched. Antigravity also reads
// the root AGENTS.md.

'use strict';

const path = require('node:path');
const { renderAnthropicSkills } = require('../../tools/installer/render-shared.js');

function render(kitRoot, projectRoot, opts = {}) {
  const targetDir = path.join(projectRoot, '.agent', 'skills');
  return renderAnthropicSkills(kitRoot, targetDir, opts);
}

module.exports = { render };
