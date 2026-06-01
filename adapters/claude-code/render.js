// Claude Code adapter — emits .claude/skills/wize-{code}/SKILL.md per asset.
// Skill format is identical to the upstream Anthropic spec, so we delegate
// to the shared renderer.

'use strict';

const path = require('node:path');
const { renderAnthropicSkills } = require('../../tools/installer/render-shared.js');

function render(kitRoot, projectRoot, opts = {}) {
  const targetDir = path.join(projectRoot, '.claude', 'skills');
  return renderAnthropicSkills(kitRoot, targetDir, opts);
}

module.exports = { render };
