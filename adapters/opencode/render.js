// OpenCode (sst/opencode) adapter — emits two trees:
//   - .opencode/agents/wize-{code}.md     (personas → system prompts)
//   - .opencode/commands/wize-{code}.md   (workflows/skills → slash commands)
// Frontmatter (agents): description, mode (primary|subagent|all)
// Frontmatter (commands): description, agent (derived from the source's
//   `owner:` field, when it resolves to a known persona), subtask (from the
//   source's `subtask: true`, for skills meant to run isolated regardless of
//   which agent invokes them — e.g. the wize-code-review fan-out workers)
// Reference: https://opencode.ai/docs/agents/ + /docs/commands/

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { collectAssets, escapeYamlDouble, clipOneLine, ensureDir } = require('../../tools/installer/render-shared.js');

// `owner:` in workflow/skill frontmatter is written for humans (agent code,
// display name, "X + Y" pairings, trailing "# comment"). Resolve it to a
// single known agent code, or null if it doesn't clearly name one (e.g.
// builder-skills' `owner: builder`, which isn't a persona).
function resolveOwnerAgentCode(ownerRaw, agents) {
  if (!ownerRaw) return null;
  const withoutComment = ownerRaw.split('#')[0].trim();
  const primary = withoutComment.split(/\s*\+\s*|,/)[0].trim();
  if (!primary) return null;
  const byCode = agents.find(a => a.code === primary);
  if (byCode) return byCode.code;
  const lower = primary.toLowerCase();
  const byName = agents.find(a => {
    const name = a.name.toLowerCase();
    return name === lower || name.includes(lower) || lower.includes(name.split(' ')[0]);
  });
  return byName ? byName.code : null;
}

function render(kitRoot, projectRoot, opts = {}) {
  const agentsDir = path.join(projectRoot, '.opencode', 'agents');
  const commandsDir = path.join(projectRoot, '.opencode', 'commands');
  const assets = collectAssets(kitRoot, opts);
  const agents = assets.filter(a => a.kind === 'agent');
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
      const agentCode = resolveOwnerAgentCode(a.owner, agents);
      const content = [
        '---',
        `description: "${escapeYamlDouble(desc)}"`,
        ...(agentCode ? [`agent: ${agentCode}`] : []),
        ...(a.subtask ? ['subtask: true'] : []),
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
