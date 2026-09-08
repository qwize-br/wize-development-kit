// Kiro (AWS) adapter — emits .kiro/skills/wize-{code}/SKILL.md per asset.
// Kiro follows the open Agent Skills standard (agentskills.io): a skill is a
// folder containing a SKILL.md with YAML frontmatter (name, description) —
// the same Anthropic-compatible format used by Claude Code, Codex, Kimi Code,
// and Hermes. Workspace skills live at <repo-root>/.kiro/skills/ and take
// precedence over ~/.kiro/skills/ global skills on name collision. Kiro uses
// progressive disclosure: at session start only name + description load, and
// the full SKILL.md activates when the request matches the description (or
// via the skill's slash command).

'use strict';

const path = require('node:path');
const { renderAnthropicSkills } = require('../../tools/installer/render-shared.js');

function render(kitRoot, projectRoot, opts = {}) {
  const targetDir = path.join(projectRoot, '.kiro', 'skills');
  return renderAnthropicSkills(kitRoot, targetDir, opts);
}

module.exports = { render };
