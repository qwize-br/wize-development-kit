// Hermes Agent adapter — emits .hermes/skills/wize-{code}/SKILL.md per asset.
// Hermes consumes the Anthropic SKILL.md format verbatim (same as Claude Code,
// Codex, Kimi Code). Project-local skills live at <repo-root>/.hermes/skills/
// and are only loaded when the repo root is trusted (`hermes skills trust`),
// mirroring the OpenCode/Codex `.agents/skills/` convention.

'use strict';

const path = require('node:path');
const { renderAnthropicSkills } = require('../../tools/installer/render-shared.js');

function render(kitRoot, projectRoot, opts = {}) {
  const targetDir = path.join(projectRoot, '.hermes', 'skills');
  return renderAnthropicSkills(kitRoot, targetDir, opts);
}

module.exports = { render };