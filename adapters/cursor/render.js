// Cursor adapter — emits .cursor/rules/wize-{code}.mdc per asset.
// Cursor rule frontmatter keys: description (required), globs (comma list),
// alwaysApply (boolean). Mode is inferred from combinations.
// Reference: https://cursor.com/docs/context/rules

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { collectAssets, escapeYamlDouble, clipOneLine, ensureDir } = require('../../tools/installer/render-shared.js');

function render(kitRoot, projectRoot, opts = {}) {
  const targetDir = path.join(projectRoot, '.cursor', 'rules');
  const assets = collectAssets(kitRoot, opts);
  const written = [];
  if (!opts.dryRun) ensureDir(targetDir);

  for (const a of assets) {
    const desc = clipOneLine(
      a.kind === 'agent'
        ? `${a.name} (${a.title}) — ${a.description}`
        : a.description
    );
    // Agents become alwaysApply=false rules attached on demand;
    // workflows/skills are Agent-attachable via description.
    const content = [
      '---',
      `description: "${escapeYamlDouble(desc)}"`,
      `globs:`,
      `alwaysApply: false`,
      '---',
      '',
      a.kind === 'agent' ? `# ${a.name} — ${a.title}` : `# ${a.name}`,
      '',
      a.body.trim(),
      ''
    ].join('\n');

    if (opts.dryRun) {
      written.push(`[dry-run] ${a.code}.mdc`);
    } else {
      fs.writeFileSync(path.join(targetDir, `${a.code}.mdc`), content, 'utf-8');
      written.push(`${a.code}.mdc`);
    }
  }
  return { written, skipped: [] };
}

module.exports = { render };
