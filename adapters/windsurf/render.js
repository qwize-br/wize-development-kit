// Windsurf (Codeium) adapter — emits .windsurf/rules/wize-{code}.md per asset.
// Windsurf rules are plain markdown; activation mode is configured inside the
// IDE Rules panel, not in frontmatter. Cascade picks them up on session start.
// Reference: https://docs.windsurf.com/windsurf/cascade/memories#rules

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { collectAssets, clipOneLine, ensureDir } = require('../../tools/installer/render-shared.js');

function render(kitRoot, projectRoot, opts = {}) {
  const targetDir = path.join(projectRoot, '.windsurf', 'rules');
  const assets = collectAssets(kitRoot, opts);
  const written = [];
  if (!opts.dryRun) ensureDir(targetDir);

  for (const a of assets) {
    const summary = clipOneLine(a.description, 180);
    const header = a.kind === 'agent' ? `# ${a.name} — ${a.title}` : `# ${a.name}`;
    const content = [
      header,
      '',
      `> ${summary}`,
      '',
      a.body.trim(),
      ''
    ].join('\n');

    if (opts.dryRun) {
      written.push(`[dry-run] ${a.code}.md`);
    } else {
      fs.writeFileSync(path.join(targetDir, `${a.code}.md`), content, 'utf-8');
      written.push(`${a.code}.md`);
    }
  }
  return { written, skipped: [] };
}

module.exports = { render };
