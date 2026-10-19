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

// The 12 entrypoints for the `wize` alias skill/command each adapter emits,
// per adapter target. `wize-*` globs do not match them (no hyphen), so each gets
// an explicit line. Never widen to `wize*`: that would swallow user files such
// as wizebar.
const ALIAS_BY_TARGET = {
  'claude-code': ['.claude/skills/wize/'],
  copilot: ['.github/skills/wize/'],
  antigravity: ['.agent/skills/wize/'],
  codex: ['.agents/skills/wize/'],
  'kimi-code': ['.kimi/skills/wize/'],
  hermes: ['.hermes/skills/wize/'],
  kiro: ['.kiro/skills/wize/'],
  cursor: ['.cursor/rules/wize.mdc'],
  windsurf: ['.windsurf/rules/wize.md'],
  continue: ['.continue/prompts/wize.prompt'],
  opencode: ['.opencode/commands/wize.md'],
  generic: ['.wize/agents/wize.md']
};

const ALIAS_PATHS = Object.values(ALIAS_BY_TARGET).flat();

// Generated outputs: the `wize-*` glob per location plus its explicit alias line.
const GENERATED_PATHS = [
  { dir: '.claude/skills/', glob: 'wize-*', alias: 'wize/' },
  { dir: '.github/skills/', glob: 'wize-*', alias: 'wize/' },
  { dir: '.github/agents/', glob: 'wize-*.agent.md', alias: null },
  { dir: '.agent/skills/', glob: 'wize-*', alias: 'wize/' },
  { dir: '.agents/skills/', glob: 'wize-*', alias: 'wize/' },
  { dir: '.kimi/skills/', glob: 'wize-*', alias: 'wize/' },
  { dir: '.hermes/skills/', glob: 'wize-*', alias: 'wize/' },
  { dir: '.kiro/skills/', glob: 'wize-*', alias: 'wize/' },
  { dir: '.cursor/rules/', glob: 'wize-*.mdc', alias: 'wize.mdc' },
  { dir: '.windsurf/rules/', glob: 'wize-*.md', alias: 'wize.md' },
  { dir: '.continue/prompts/', glob: 'wize-*.prompt', alias: 'wize.prompt' },
  { dir: '.opencode/agents/', glob: 'wize-*.md', alias: null },
  { dir: '.opencode/commands/', glob: 'wize-*.md', alias: 'wize.md' },
  { dir: '.wize/agents/', glob: 'wize-*.md', alias: 'wize.md' }
];

const GITIGNORE_BODY = [
  '# Personal / per-developer (do NOT commit)',
  '.wize/config/user.toml',
  '.wize/scratch/',
  '.wize/.local/',
  '.wize/implementation/quick-dev-log.md',
  '',
  '# Generated IDE adapter outputs (regenerate with `npx wize-dev-kit hydrate`)',
  ...GENERATED_PATHS.flatMap(g => [g.dir + g.glob, ...(g.alias ? [g.dir + g.alias] : [])]),
  '',
  '# Worktrees created inside the repo (Claude Code)',
  '.claude/worktrees/'
].join('\n');

function buildGitignoreBlock() {
  return [
    GITIGNORE_BEGIN,
    '# Managed by wize-dev-kit (install/update). Re-running either updates',
    '# the lines between the markers below; lines outside are untouched.',
    '',
    GITIGNORE_BODY,
    GITIGNORE_END
  ].join('\n');
}

// Pure: the .gitignore text after the managed block is applied to `current`
// (null/'' for no file). Returns { next, changed, mode } with mode
// 'created'|'replaced'|'appended'|'unchanged'.
function computeGitignore(current) {
  const exists = current !== null && current !== undefined;
  const text = exists ? current : '';
  const block = buildGitignoreBlock();
  const startIdx = text.indexOf(GITIGNORE_BEGIN);
  const endIdx = text.indexOf(GITIGNORE_END);
  let next;
  let mode;

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = text.slice(0, startIdx).replace(/\n+$/, '');
    const after = text.slice(endIdx + GITIGNORE_END.length).replace(/^\n+/, '');
    next = [before, block, after].filter(Boolean).join('\n\n');
    if (!next.endsWith('\n')) next += '\n';
    mode = text.includes(block) ? 'unchanged' : 'replaced';
  } else if (exists) {
    next = text.replace(/\n+$/, '') + '\n\n' + block + '\n';
    mode = 'appended';
  } else {
    next = block + '\n';
    mode = 'created';
  }
  return { next, changed: next !== text, mode };
}

// 'ok' | 'drift' | 'missing': whether the managed block in `current` (null
// for no file) is byte-for-byte what this kit would write.
function gitignoreBlockStatus(current) {
  if (current === null || current === undefined) return 'missing';
  const text = String(current).replace(/\r\n/g, '\n');
  const startIdx = text.indexOf(GITIGNORE_BEGIN);
  const endIdx = text.indexOf(GITIGNORE_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return 'missing';
  return text.slice(startIdx, endIdx + GITIGNORE_END.length) === buildGitignoreBlock() ? 'ok' : 'drift';
}

// Idempotent: if the block exists, replace it; otherwise append.
// Returns { changed: boolean, mode: 'created'|'replaced'|'appended'|'unchanged' }.
function applyGitignore(projectRoot, { dryRun = false } = {}) {
  const file = path.join(projectRoot, '.gitignore');
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : null;
  const { next, changed, mode } = computeGitignore(current);
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

// user.toml content for a checkout that has no copy to inherit: the name comes
// from `git config user.name`, then $USER, then "Developer".
function deriveUserToml(root, env = process.env) {
  const { configUserName } = require('./git-context.js');
  const name = configUserName(root) || env.USER || env.USERNAME || 'Developer';
  return generateUserToml({ name });
}

module.exports = {
  deriveUserToml,
  GITIGNORE_BEGIN,
  GITIGNORE_END,
  ALIAS_PATHS,
  ALIAS_BY_TARGET,
  buildGitignoreBlock,
  computeGitignore,
  gitignoreBlockStatus,
  applyGitignore,
  generateUserToml
};
