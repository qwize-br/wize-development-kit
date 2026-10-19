// `wize-dev-kit hooks` — opt-in automation that hydrates a checkout on its own.
//
//   hooks install [--claude] [--cursor] [--github-action]
//   hooks print <orca|claude|cursor|codex|github-action>
//
// `install` always writes the tracked, managed .wize/hooks/hydrate.sh and then
// only the config files whose flag was passed. `print` writes nothing. Nothing
// here runs without an explicit flag, because every file it writes is tracked.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const HOOK_REL = '.wize/hooks/hydrate.sh';
const HOOK_HEADER = '# wize-dev-kit managed hook v1';
const TEMPLATES = path.resolve(__dirname, '..', 'templates');
const PRINT_TARGETS = ['orca', 'claude', 'cursor', 'codex', 'github-action'];

const readTemplate = (name) => fs.readFileSync(path.join(TEMPLATES, name), 'utf-8');

const CLAUDE_ENTRY = {
  matcher: 'startup',
  hooks: [{ type: 'command', command: 'sh "$CLAUDE_PROJECT_DIR"/.wize/hooks/hydrate.sh', timeout: 180 }]
};
const CURSOR_CONFIG = { 'setup-worktree': ['sh .wize/hooks/hydrate.sh'] };

// A hydrate.sh this kit wrote carries the header within its first lines. Any
// other file at that path belongs to the user.
function isManagedHook(content) {
  return typeof content === 'string' && content.split('\n', 6).some(l => l.trim() === HOOK_HEADER);
}

// The new content for an installed hook, or null when it is absent, not
// managed, or already current. Used by `update` to refresh the script.
function refreshedHook(current) {
  if (!isManagedHook(current)) return null;
  const next = readTemplate('hydrate.sh');
  return next === current ? null : next;
}

// Pure. `text` is the current .claude/settings.json (null when absent).
// -> { ok: true, changed, next } | { ok: false, error }. Every other key and
// hook is kept; an entry that already runs the managed script is not duplicated.
function mergeClaudeSettings(text) {
  let settings = {};
  if (text !== null && text.trim() !== '') {
    try { settings = JSON.parse(text); }
    catch (err) { return { ok: false, error: `.claude/settings.json is not valid JSON (${err.message})` }; }
  }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return { ok: false, error: '.claude/settings.json must hold a JSON object' };
  }
  if (settings.hooks === undefined) settings.hooks = {};
  if (!settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks)) {
    return { ok: false, error: '.claude/settings.json: "hooks" must be an object' };
  }
  if (settings.hooks.SessionStart === undefined) settings.hooks.SessionStart = [];
  if (!Array.isArray(settings.hooks.SessionStart)) {
    return { ok: false, error: '.claude/settings.json: hooks.SessionStart must be an array' };
  }
  if (JSON.stringify(settings.hooks.SessionStart).includes(HOOK_REL)) return { ok: true, changed: false, next: text };
  settings.hooks.SessionStart.push(CLAUDE_ENTRY);
  return { ok: true, changed: true, next: JSON.stringify(settings, null, 2) + '\n' };
}

const cursorJson = () => JSON.stringify(CURSOR_CONFIG, null, 2) + '\n';

function printSnippet(target) {
  const claude = JSON.stringify({ hooks: { SessionStart: [CLAUDE_ENTRY] } }, null, 2);
  const snippets = {
    orca: [
      '# orca.yaml (commit it at the repo root)',
      'scripts:',
      `  setup: sh ${HOOK_REL}`,
      'setupAgentStartupPolicy: wait-for-setup',
      '',
      '# A non-empty setup hook saved locally in Orca overrides orca.yaml. Clear it in the',
      '# repository settings, or the line above never runs.',
      '',
      '# .worktreeinclude (gitignored files Orca copies into each new worktree)',
      '.wize/config/user.toml'
    ].join('\n'),
    claude: [`# .claude/settings.json (or run: wize-dev-kit hooks install --claude)`, claude].join('\n'),
    cursor: ['# .cursor/worktrees.json (or run: wize-dev-kit hooks install --cursor)', cursorJson().trimEnd()].join('\n'),
    codex: [
      'Codex local environment: set the setup script for this project to',
      '',
      `  sh ${HOOK_REL}`,
      '',
      'Codex stores it in its own local-environment config, so the kit does not write it.'
    ].join('\n'),
    'github-action': [`# .github/workflows/wize-kit-update.yml (or run: wize-dev-kit hooks install --github-action)`, readTemplate('wize-kit-update.yml').trimEnd()].join('\n')
  };
  return snippets[target];
}

const USAGE = [
  'Usage:',
  '  wize-dev-kit hooks install [--claude] [--cursor] [--github-action]',
  '  wize-dev-kit hooks print <orca|claude|cursor|codex|github-action>',
  '',
  'install always writes .wize/hooks/hydrate.sh; each flag adds one config file.'
].join('\n');

function writeText(file, content, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, mode ? { encoding: 'utf-8', mode } : 'utf-8');
}

function readOrNull(file) {
  try { return fs.readFileSync(file, 'utf-8'); } catch { return null; }
}

function install({ projectRoot, flags, log, errlog }) {
  const want = { claude: !!flags.claude, cursor: !!flags.cursor, action: !!(flags['github-action'] || flags.githubAction) };
  if (!want.claude && !want.cursor && !want.action) {
    errlog('✖ hooks install needs at least one of --claude, --cursor, --github-action');
    errlog(USAGE);
    return { exitCode: 1, written: [], unchanged: [] };
  }

  const written = [];
  const unchanged = [];
  const note = (rel, changed) => {
    (changed ? written : unchanged).push(rel);
    log(`${changed ? '✓ wrote' : '· unchanged'} ${rel}`);
  };
  const abs = (rel) => path.join(projectRoot, rel);
  const fail = (message) => {
    errlog(`✖ ${message}`);
    return { exitCode: 1, written, unchanged };
  };

  // Validate everything that can refuse before writing anything.
  const hookFile = abs(HOOK_REL);
  const hookCurrent = readOrNull(hookFile);
  if (hookCurrent !== null && !isManagedHook(hookCurrent)) {
    return fail(`${HOOK_REL} exists and is not managed by wize-dev-kit; move it aside or merge by hand`);
  }
  let claudeMerge = null;
  if (want.claude) {
    claudeMerge = mergeClaudeSettings(readOrNull(abs('.claude/settings.json')));
    if (!claudeMerge.ok) return fail(claudeMerge.error);
  }
  if (!fs.existsSync(abs('.wize/config/project.toml'))) {
    errlog('warning: no .wize/config/project.toml here; the hook skips until the kit is installed');
  }

  const script = readTemplate('hydrate.sh');
  if (hookCurrent !== script) writeText(hookFile, script);
  fs.chmodSync(hookFile, 0o755);
  note(HOOK_REL, hookCurrent !== script);

  if (want.claude) {
    if (claudeMerge.changed) writeText(abs('.claude/settings.json'), claudeMerge.next);
    note('.claude/settings.json', claudeMerge.changed);
  }

  if (want.cursor) {
    const rel = '.cursor/worktrees.json';
    const current = readOrNull(abs(rel));
    if (current === null) {
      writeText(abs(rel), cursorJson());
      note(rel, true);
    } else if (current.includes(HOOK_REL)) {
      note(rel, false);
    } else {
      unchanged.push(rel);
      log(`· ${rel} exists; add this line to its "setup-worktree" array:`);
      log(`    "sh ${HOOK_REL}"`);
    }
  }

  if (want.action) {
    const rel = '.github/workflows/wize-kit-update.yml';
    if (fs.existsSync(abs(rel))) note(rel, false);
    else {
      writeText(abs(rel), readTemplate('wize-kit-update.yml'));
      note(rel, true);
      log('  enable "Allow GitHub Actions to create and approve pull requests" in the repository settings');
    }
  }

  return { exitCode: 0, written, unchanged };
}

function cmdHooks({ projectRoot, args = [], flags = {}, opts = {} } = {}) {
  const log = opts.log || console.log;
  const errlog = opts.errlog || console.error;
  const [sub, target] = args;

  if (sub === 'install') return install({ projectRoot, flags, log, errlog });
  if (sub === 'print') {
    if (!PRINT_TARGETS.includes(target)) {
      errlog(`✖ ${target ? `unknown target "${target}"` : 'hooks print needs a target'}; available: ${PRINT_TARGETS.join(', ')}`);
      return { exitCode: 1 };
    }
    log(printSnippet(target));
    return { exitCode: 0 };
  }
  errlog(sub ? `✖ unknown hooks subcommand "${sub}"` : '✖ hooks needs a subcommand');
  errlog(USAGE);
  return { exitCode: 1 };
}

module.exports = {
  cmdHooks,
  mergeClaudeSettings,
  isManagedHook,
  refreshedHook,
  HOOK_REL,
  PRINT_TARGETS,
  readTemplate
};
