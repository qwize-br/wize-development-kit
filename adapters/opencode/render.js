// OpenCode (sst/opencode) adapter — emits two trees:
//   - .opencode/agents/wize-{code}.md     (personas → system prompts)
//   - .opencode/commands/wize-{code}.md   (workflows/skills → slash commands)
// Frontmatter (agents): description, mode (primary|subagent|all)
// Frontmatter (commands): description, template (the prompt body)
// Reference: https://opencode.ai/docs/agents/ + /docs/commands/

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { collectAssets, escapeYamlDouble, clipOneLine, ensureDir } = require('../../tools/installer/render-shared.js');

function render(kitRoot, projectRoot, opts = {}) {
  const agentsDir = path.join(projectRoot, '.opencode', 'agents');
  const commandsDir = path.join(projectRoot, '.opencode', 'commands');
  const assets = collectAssets(kitRoot, opts);
  const written = [];

  if (!opts.dryRun) {
    ensureDir(agentsDir);
    ensureDir(commandsDir);
  }

  for (const a of assets) {
    if (a.kind === 'agent') {
      const desc = clipOneLine(`${a.name} (${a.title}) — ${a.description}`);
      const mode = a.code === 'wize-orchestrator' ? 'primary' : 'subagent';
      const content = [
        '---',
        `description: "${escapeYamlDouble(desc)}"`,
        `mode: ${mode}`,
        '---',
        '',
        `# ${a.name} — ${a.title}`,
        '',
        a.body.trim(),
        ''
      ].join('\n');
      if (opts.dryRun) {
        written.push(`[dry-run] agents/${a.code}.md`);
      } else {
        fs.writeFileSync(path.join(agentsDir, `${a.code}.md`), content, 'utf-8');
        written.push(`agents/${a.code}.md`);
      }
    } else {
      // workflow or skill → command
      const desc = clipOneLine(a.description, 180);
      const content = [
        '---',
        `description: "${escapeYamlDouble(desc)}"`,
        '---',
        '',
        `# ${a.name}`,
        '',
        a.body.trim(),
        ''
      ].join('\n');
      if (opts.dryRun) {
        written.push(`[dry-run] commands/${a.code}.md`);
      } else {
        fs.writeFileSync(path.join(commandsDir, `${a.code}.md`), content, 'utf-8');
        written.push(`commands/${a.code}.md`);
      }
    }
  }
  return { written, skipped: [] };
}

module.exports = { render };
