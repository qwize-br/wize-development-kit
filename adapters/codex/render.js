// OpenAI Codex adapter — emits .codex/skills/wize-{code}/SKILL.md per asset.
// Codex shares the Anthropic SKILL.md format and also reads the root AGENTS.md.

'use strict';

const path = require('node:path');
const { renderAnthropicSkills } = require('../../tools/installer/render-shared.js');

function render(kitRoot, projectRoot, opts = {}) {
  const targetDir = path.join(projectRoot, '.codex', 'skills');
  return renderAnthropicSkills(kitRoot, targetDir, opts);
}

module.exports = { render };
