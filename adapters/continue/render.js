// Continue.dev adapter — emits .continue/prompts/wize-{code}.prompt per asset.
// Prompt files are markdown with YAML frontmatter: name, description, invokable.
// `invokable: true` registers the prompt as a slash command.
// Reference: https://docs.continue.dev/customize/deep-dives/prompts

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { collectAssets, escapeYamlDouble, clipOneLine, ensureDir } = require('../../tools/installer/render-shared.js');

function render(kitRoot, projectRoot, opts = {}) {
  const targetDir = path.join(projectRoot, '.continue', 'prompts');
  const assets = collectAssets(kitRoot, opts);
  const written = [];
  if (!opts.dryRun) ensureDir(targetDir);

  for (const a of assets) {
    const desc = clipOneLine(a.description, 180);
    const content = [
      '---',
      `name: ${a.code}`,
      `description: "${escapeYamlDouble(desc)}"`,
      `invokable: true`,
      '---',
      '',
      a.kind === 'agent' ? `# ${a.name} — ${a.title}` : `# ${a.name}`,
      '',
      a.body.trim(),
      ''
    ].join('\n');

    if (opts.dryRun) {
      written.push(`[dry-run] ${a.code}.prompt`);
    } else {
      fs.writeFileSync(path.join(targetDir, `${a.code}.prompt`), content, 'utf-8');
      written.push(`${a.code}.prompt`);
    }
  }
  return { written, skipped: [] };
}

module.exports = { render };
