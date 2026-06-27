// Setup helpers used by `wize-dev-kit install`:
//   - generateUserToml({ name, role }) → .wize/config/user.toml template
//   - applyGitignore(projectRoot) → idempotent gitignore block injection
//
// Both are pure functions where possible; only applyGitignore writes to disk.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const GITIGNORE_BEGIN = '# >>> wize-dev-kit (managed) >>>';
const GITIGNORE_END = '# <<< wize-dev-kit (managed) <<<';

const GITIGNORE_BODY = [
  '# Personal / per-developer (do NOT commit)',
  '.wize/config/user.toml',
  '.wize/scratch/',
  '.wize/.local/',
  '.wize/implementation/quick-dev-log.md',
  '',
  '# Generated IDE adapter outputs (regenerate with `npx wize-dev-kit install`)',
  '.claude/skills/wize-*',
  '.agent/skills/wize-*',
  '.codex/skills/wize-*',
  '.kimi/skills/wize-*',
  '.cursor/rules/wize-*.mdc',
  '.windsurf/rules/wize-*.md',
  '.continue/prompts/wize-*.prompt',
  '.opencode/agents/wize-*.md',
  '.opencode/commands/wize-*.md',
  '.wize/agents/wize-*.md'
].join('\n');

function buildGitignoreBlock() {
  return [
    GITIGNORE_BEGIN,
    '# Managed by `npx wize-dev-kit install`. Re-running install will update',
    '# the lines between the markers below; lines outside are untouched.',
    '',
    GITIGNORE_BODY,
    GITIGNORE_END
  ].join('\n');
}

// Idempotent: if the block exists, replace it; otherwise append.
// Returns { changed: boolean, mode: 'created'|'replaced'|'appended'|'unchanged' }.
function applyGitignore(projectRoot, { dryRun = false } = {}) {
  const file = path.join(projectRoot, '.gitignore');
  const block = buildGitignoreBlock();
  let current = '';
  let exists = fs.existsSync(file);
  if (exists) current = fs.readFileSync(file, 'utf-8');

  const startIdx = current.indexOf(GITIGNORE_BEGIN);
  const endIdx = current.indexOf(GITIGNORE_END);
  let next;
  let mode;

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = current.slice(0, startIdx).replace(/\n+$/, '');
    const after = current.slice(endIdx + GITIGNORE_END.length).replace(/^\n+/, '');
    next = [before, block, after].filter(Boolean).join('\n\n');
    if (!next.endsWith('\n')) next += '\n';
    mode = current.includes(block) ? 'unchanged' : 'replaced';
  } else if (exists) {
    next = current.replace(/\n+$/, '') + '\n\n' + block + '\n';
    mode = 'appended';
  } else {
    next = block + '\n';
    mode = 'created';
  }

  const changed = next !== current;
  if (changed && !dryRun) fs.writeFileSync(file, next, 'utf-8');
  return { changed, mode };
}

function generateUserToml({ name = '', role = '' } = {}) {
  const escapedName = String(name).replace(/"/g, '\\"');
  const roleLine = role
    ? `role = "${String(role).replace(/"/g, '\\"')}"`
    : `# role = "developer"          # optional — "developer", "PM", "designer", etc.`;
  return `# Wize Development Kit — user-level customizations.
# This file is per-developer; the kit places it in .gitignore so each member
# of the team gets their own copy. Do NOT commit.

[user]
name = "${escapedName}"
${roleLine}

[preferences]
# Override project-level language if you prefer another locally:
# communication   = "pt-BR"
# document_output = "en"
`;
}

module.exports = {
  GITIGNORE_BEGIN,
  GITIGNORE_END,
  buildGitignoreBlock,
  applyGitignore,
  generateUserToml
};
