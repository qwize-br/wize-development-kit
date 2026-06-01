// Generic fallback adapter — emits plain markdown under .wize/agents/ and
// writes a root AGENTS.md as a baseline pointer (read by Codex, Cursor,
// Windsurf and Antigravity even without their dedicated adapter installed).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { collectAssets, renderAgentsMd, clipOneLine, ensureDir } = require('../../tools/installer/render-shared.js');

function render(kitRoot, projectRoot, opts = {}) {
  const targetDir = path.join(projectRoot, '.wize', 'agents');
  const assets = collectAssets(kitRoot, opts);
  const written = [];
  if (!opts.dryRun) ensureDir(targetDir);

  for (const a of assets) {
    const summary = clipOneLine(a.description, 180);
    const header = a.kind === 'agent' ? `# ${a.name} — ${a.title}` : `# ${a.name}`;
    const content = [header, '', `> ${summary}`, '', a.body.trim(), ''].join('\n');
    if (opts.dryRun) {
      written.push(`[dry-run] ${a.code}.md`);
    } else {
      fs.writeFileSync(path.join(targetDir, `${a.code}.md`), content, 'utf-8');
      written.push(`${a.code}.md`);
    }
  }

  // Baseline AGENTS.md (not overwritten if user already has one).
  const agentsMd = renderAgentsMd(kitRoot, projectRoot, opts);
  written.push(...agentsMd.written);
  return { written, skipped: agentsMd.skipped };
}

module.exports = { render };
