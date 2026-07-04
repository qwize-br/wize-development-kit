// Moonshot Kimi Code adapter — emits .kimi/skills/wize-{code}/SKILL.md per asset.
// Kimi Code consumes the Anthropic SKILL.md format verbatim and additionally
// auto-detects .claude/skills/ and .agents/skills/ (Codex), so installing
// alongside those adapters is harmless.

'use strict';

const path = require('node:path');
const { renderAnthropicSkills } = require('../../tools/installer/render-shared.js');

function render(kitRoot, projectRoot, opts = {}) {
  const targetDir = path.join(projectRoot, '.kimi', 'skills');
  return renderAnthropicSkills(kitRoot, targetDir, opts);
}

module.exports = { render };
