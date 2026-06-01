#!/usr/bin/env node
/*
 * wize-dev-kit — CLI entry point
 * Subcommands: install, update, uninstall, list, sync, agent, workflow, help
 *
 * This is a v0.1 scaffold. The interactive prompt logic and adapter rendering
 * are stubs; the dispatcher and basic install/uninstall create the .wize/
 * folder layout so downstream agents can be activated.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const prompts = require('prompts');
const { applyGitignore, generateUserToml } = require('./setup-helpers.js');

const INTERACTIVE = process.stdout.isTTY && process.stdin.isTTY;

const KIT_ROOT = path.resolve(__dirname, '..', '..');
const KIT_VERSION = require(path.join(KIT_ROOT, 'package.json')).version;

const TARGETS = [
  { code: 'claude-code', label: 'Claude Code (.claude/skills/)', default: true },
  { code: 'cursor', label: 'Cursor (.cursor/rules/)', default: false },
  { code: 'windsurf', label: 'Windsurf', default: false },
  { code: 'codex', label: 'Codex', default: false },
  { code: 'continue', label: 'Continue', default: false },
  { code: 'kimi-code', label: 'Kimi Code', default: false },
  { code: 'opencode', label: 'OpenCode', default: false },
  { code: 'antigravity', label: 'Antigravity (CLI + IDE)', default: false },
  { code: 'generic', label: 'Generic fallback (.wize/agents/)', default: true }
];

const PROFILES = [
  { code: 'core', label: 'Wize Dev Core', required: true },
  { code: 'web-overlay', label: 'Wize Web Dev (overlay)', required: false },
  { code: 'app-overlay', label: 'Wize App Development (overlay)', required: false }
];

// Common BCP-47 short codes. Users can type any other value freely.
const LANGUAGES = [
  { code: 'en',    label: 'English' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'pt-PT', label: 'Português (Portugal)' },
  { code: 'es',    label: 'Español' },
  { code: 'fr',    label: 'Français' },
  { code: 'de',    label: 'Deutsch' },
  { code: 'it',    label: 'Italiano' },
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'ja',    label: '日本語' },
  { code: 'vi',    label: 'Tiếng Việt' }
];

const HELP = `wize-dev-kit v${KIT_VERSION}

Usage:
  wize-dev-kit <command> [options]

Commands:
  install                 Install the kit into the current repo (interactive).
  update                  Apply upstream diff while preserving customizations.
  uninstall               Remove the kit from the current repo (preserves code).
  list                    List installed agents, skills and workflows.
  sync                    Regenerate IDE adapters for active targets.
  agent <create|list>     Manage agents (built-in or custom).
  workflow <create|list>  Manage workflows.
  validate                Run schema + lint + dry-run validators.
  help                    Show this message.

Documentation:
  ${KIT_ROOT}/README.md
  ${KIT_ROOT}/ARCH.md
  ${KIT_ROOT}/ROSTER.md
`;

function logo() {
  return [
    '',
    '  ╭─────────────────────────────────────────────╮',
    '  │           Wize Development Kit              │',
    `  │                  v${KIT_VERSION.padEnd(8)}                   │`,
    '  ╰─────────────────────────────────────────────╯',
    ''
  ].join('\n');
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function confirm(question, defaultYes = true) {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const ans = (await prompt(`${question} ${hint} `)).toLowerCase();
  if (!ans) return defaultYes;
  return ans.startsWith('y');
}

async function selectLanguage(label, defaultCode = 'en') {
  if (INTERACTIVE) {
    const choices = LANGUAGES.map(l => ({
      title: `${l.code.padEnd(6)} — ${l.label}`,
      value: l.code,
      description: l.code === defaultCode ? 'default' : undefined
    }));
    choices.push({ title: 'Other (type a custom BCP-47 code)…', value: '__custom' });
    const initial = LANGUAGES.findIndex(l => l.code === defaultCode);
    const { picked } = await prompts({
      type: 'select',
      name: 'picked',
      message: label,
      choices,
      initial: initial === -1 ? 0 : initial
    });
    if (picked === undefined) process.exit(130);
    if (picked === '__custom') {
      const { custom } = await prompts({
        type: 'text',
        name: 'custom',
        message: 'Type a BCP-47 language code (e.g. ko, ar, nl, ru)',
        initial: defaultCode,
        validate: v => /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(v) || 'use a valid code like "en" or "pt-BR"'
      });
      return custom || defaultCode;
    }
    return picked;
  }
  // Non-TTY fallback: number-driven.
  console.log(`\n${label}:`);
  LANGUAGES.forEach((l, i) => {
    const def = l.code === defaultCode ? '(default)' : '';
    console.log(`  ${String(i + 1).padStart(2)}. ${l.code.padEnd(6)} — ${l.label} ${def}`);
  });
  const ans = (await prompt(`Pick a number, type a code, or ENTER for ${defaultCode}: `)).trim();
  if (!ans) return defaultCode;
  const asNum = parseInt(ans, 10);
  if (!isNaN(asNum) && asNum >= 1 && asNum <= LANGUAGES.length) return LANGUAGES[asNum - 1].code;
  return ans;
}

async function multiSelect(label, items, isSelected = i => i.default) {
  if (INTERACTIVE) {
    const { picked } = await prompts({
      type: 'multiselect',
      name: 'picked',
      message: label,
      hint: '↑/↓ navigate · space toggle · enter confirm',
      instructions: false,
      choices: items.map(it => ({
        title: it.label + (it.required ? ' (required)' : ''),
        value: it.code,
        selected: it.required || isSelected(it),
        disabled: it.required
      }))
    });
    if (picked === undefined) process.exit(130);
    const codes = new Set(picked);
    for (const req of items.filter(i => i.required)) codes.add(req.code);
    return items.filter(it => codes.has(it.code));
  }
  // Non-TTY fallback.
  console.log(`\n${label}:`);
  items.forEach((it, i) => {
    const star = it.required ? '★ ' : '  ';
    const def = isSelected(it) ? '(default on)' : '';
    console.log(`  ${i + 1}. ${star}${it.label} ${def}`);
  });
  const ans = await prompt('Pick numbers (comma-separated) or ENTER for defaults: ');
  if (!ans) return items.filter(it => it.required || isSelected(it));
  const indices = ans.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(i => !isNaN(i));
  const picked = indices.map(i => items[i]).filter(Boolean);
  for (const req of items.filter(i => i.required)) {
    if (!picked.includes(req)) picked.push(req);
  }
  return picked;
}

function isGitRepo(dir) {
  return fs.existsSync(path.join(dir, '.git'));
}

function detectBrownfield(dir) {
  const signals = [];
  if (fs.existsSync(path.join(dir, 'package.json'))) signals.push('package.json');
  if (fs.existsSync(path.join(dir, 'pubspec.yaml'))) signals.push('pubspec.yaml');
  if (fs.existsSync(path.join(dir, 'Cargo.toml'))) signals.push('Cargo.toml');
  if (fs.existsSync(path.join(dir, 'go.mod'))) signals.push('go.mod');
  if (fs.existsSync(path.join(dir, 'src'))) signals.push('src/');
  return { brownfield: signals.length > 0, signals };
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeIfMissing(file, content) {
  if (fs.existsSync(file)) return false;
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, content, 'utf-8');
  return true;
}

const WIZE_DIRS = [
  '.wize',
  '.wize/config',
  '.wize/planning',
  '.wize/planning/ux',
  '.wize/planning/ux/ux-design',
  '.wize/planning/ux/design-system',
  '.wize/solutioning',
  '.wize/solutioning/adrs',
  '.wize/solutioning/epics',
  '.wize/solutioning/stories',
  '.wize/solutioning/design-system',
  '.wize/implementation',
  '.wize/implementation/tea',
  '.wize/implementation/tea/nfr',
  '.wize/knowledge',
  '.wize/knowledge/document-project',
  '.wize/knowledge/decisions',
  '.wize/custom',
  '.wize/custom/agents',
  '.wize/custom/skills',
  '.wize/custom/workflows'
];

function projectToml({ profiles, targets, communication_language, document_output_language, project_name }) {
  const profileLine = profiles.map(p => `"${p.code}"`).join(', ');
  const targetLine = targets.map(t => `"${t.code}"`).join(', ');
  return `# Wize Development Kit — project config
# Generated at install. Commit this file. Personal preferences live in user.toml.

[project]
name = "${project_name}"
kit_version = "${KIT_VERSION}"

[install]
profiles = [${profileLine}]
ide_targets = [${targetLine}]

[language]
# Language used when agents talk to the team in chat.
communication = "${communication_language}"
# Language used when agents write artifacts to disk
# (brief.md, prd.md, architecture.md, gate.md, etc.).
document_output = "${document_output_language}"

[paths]
output_root    = ".wize"
planning       = ".wize/planning"
solutioning    = ".wize/solutioning"
implementation = ".wize/implementation"
knowledge      = ".wize/knowledge"
`;
}

function teaToml() {
  return `# Wize TEA (Hawkeye) — policy config
# Edit to flip to enforcing mode for CI gating.

[policy]
mode = "advisory"   # "advisory" | "enforcing"

[gates]
risk    = { granularity = "once-after-architecture" }
design  = { granularity = "per-story" }
trace   = { granularity = "per-story" }
nfr     = { granularity = "per-epic" }
review  = { granularity = "per-story" }
gate    = { granularity = "per-story" }
`;
}

function renderAdapters({ kitRoot, projectRoot, targets, profiles }) {
  const results = [];
  const profileCodes = profiles.map(p => p.code);
  for (const target of targets) {
    const adapterDir = path.join(kitRoot, 'adapters', target.code);
    const renderPath = path.join(adapterDir, 'render.js');
    if (!fs.existsSync(renderPath)) {
      results.push({ code: target.code, skipped: true, reason: 'adapter missing' });
      continue;
    }
    try {
      const mod = require(renderPath);
      if (typeof mod.render !== 'function') {
        results.push({ code: target.code, skipped: true, reason: 'no render() export' });
        continue;
      }
      const out = mod.render(kitRoot, projectRoot, { profiles: profileCodes });
      if (out && typeof out === 'object' && Array.isArray(out.written)) {
        results.push({ code: target.code, written: out.written.length });
      } else {
        results.push({ code: target.code, skipped: true, reason: 'stub (no skills emitted)' });
      }
    } catch (err) {
      results.push({ code: target.code, error: err.message });
    }
  }
  return results;
}

async function cmdInstall(args) {
  const cwd = process.cwd();
  console.log(logo());
  console.log('Installing Wize Development Kit into:', cwd);
  if (!isGitRepo(cwd)) {
    console.log('\n⚠ not a git repo. Initialize git first or proceed at your own risk.');
    const ok = await confirm('Continue anyway?', false);
    if (!ok) process.exit(1);
  }

  const detection = detectBrownfield(cwd);
  if (detection.brownfield) {
    console.log(`\nBrownfield signals detected: ${detection.signals.join(', ')}`);
  } else {
    console.log('\nGreenfield repo detected.');
  }

  const project_name = (await prompt(`Project name [${path.basename(cwd)}]: `)) || path.basename(cwd);
  const profiles = await multiSelect('Select profile(s) to install', PROFILES);
  const targets = await multiSelect('Select IDE target(s)', TARGETS);

  const communication_language = await selectLanguage(
    'Communication language (how agents will talk to you in chat)',
    'en'
  );
  const document_output_language = await selectLanguage(
    `Document output language (language used in generated files; ENTER for "${communication_language}")`,
    communication_language
  );

  // Personal touch — the user_name lands in .wize/config/user.toml (per-developer).
  const defaultName = (os.userInfo().username || '').trim();
  const user_name = (await prompt(
    `How should the agents call you? [${defaultName || 'leave blank'}]: `
  )).trim() || defaultName;

  // Gitignore — opt-in, idempotent.
  const wantsGitignore = await confirm(
    'Add the suggested entries to .gitignore (user.toml + scratch + generated adapter outputs)?',
    true
  );

  console.log('\nCreating .wize/ skeleton...');
  for (const dir of WIZE_DIRS) mkdirp(path.join(cwd, dir));

  writeIfMissing(path.join(cwd, '.wize/config/project.toml'), projectToml({
    profiles, targets, communication_language, document_output_language, project_name
  }));
  writeIfMissing(path.join(cwd, '.wize/config/user.toml'), generateUserToml({ name: user_name }));
  writeIfMissing(path.join(cwd, '.wize/config/tea.toml'), teaToml());

  console.log('✓ .wize/ created');
  console.log(`✓ profiles: ${profiles.map(p => p.code).join(', ')}`);
  console.log(`✓ ide targets: ${targets.map(t => t.code).join(', ')}`);
  if (user_name) console.log(`✓ user.toml: agents will call you "${user_name}"`);

  if (wantsGitignore) {
    const r = applyGitignore(cwd);
    if (r.changed) console.log(`✓ .gitignore ${r.mode} with the wize-dev-kit block`);
    else           console.log(`= .gitignore already up to date`);
  } else {
    console.log('= .gitignore untouched (you opted out of suggested entries)');
  }

  console.log('\nGenerating IDE adapters...');
  const renderResults = renderAdapters({
    kitRoot: KIT_ROOT,
    projectRoot: cwd,
    targets,
    profiles
  });
  for (const r of renderResults) {
    if (r.skipped) console.log(`  - ${r.code}: skipped (${r.reason})`);
    else if (r.written) console.log(`  ✓ ${r.code}: ${r.written} skill(s) emitted`);
    else if (r.error) console.log(`  ✖ ${r.code}: ${r.error}`);
  }

  if (detection.brownfield) {
    const baseline = await confirm('\nRun `wize-document-project` to baseline the existing repo now?', true);
    if (baseline) {
      console.log('(stub) Pepper + Peggy would now produce the baseline docs in .wize/knowledge/document-project/.');
    }
  }

  console.log('\nDone. Activate Wizer in your IDE and say: "Brief me on this project."');
}

async function cmdUninstall() {
  const cwd = process.cwd();
  const dir = path.join(cwd, '.wize');
  if (!fs.existsSync(dir)) {
    console.log('No .wize/ folder found here.');
    return;
  }
  const ok = await confirm(`Remove ${dir}? Your project source code is not touched.`, false);
  if (!ok) return;
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('Removed .wize/.');
  console.log('(stub) IDE adapter files (.claude/skills/wize-*, .cursor/rules/wize-*) would be cleaned here.');
}

function cmdList() {
  console.log(logo());
  console.log('Agents:');
  const list = [
    ['wize-orchestrator', 'Wizer'],
    ['wize-agent-analyst', 'Pepper Potts'],
    ['wize-agent-tech-writer', 'Peggy Carter'],
    ['wize-agent-pm', 'Maria Hill'],
    ['wize-agent-ux-designer', 'Mantis'],
    ['wize-agent-solution-strategist', 'Nick Fury'],
    ['wize-agent-architect', 'Tony Stark'],
    ['wize-agent-test-architect', 'Hawkeye'],
    ['wize-agent-dev', 'Shuri']
  ];
  for (const [code, name] of list) console.log(`  ${code.padEnd(36)} ${name}`);

  console.log('\nWorkflows directories:');
  const phases = ['1-analysis', '2-plan-workflows', '3-solutioning', '4-implementation'];
  for (const phase of phases) {
    const dir = path.join(KIT_ROOT, 'src/method-skills', phase);
    if (!fs.existsSync(dir)) continue;
    console.log(`  ${phase}:`);
    for (const entry of fs.readdirSync(dir)) {
      if (entry.startsWith('wize-')) console.log(`    - ${entry}`);
    }
  }
}

function cmdSync() {
  console.log('(stub) Sync would regenerate IDE adapter files for active targets in .wize/config/project.toml.');
}

function cmdAgent(args) {
  const sub = args[0] || 'list';
  if (sub === 'list') return cmdList();
  if (sub === 'create') {
    console.log('(stub) Interactive agent creation. See src/builder-skills/wize-create-agent/workflow.md.');
    return;
  }
  console.log(`Unknown agent subcommand: ${sub}`);
}

function cmdWorkflow(args) {
  const sub = args[0] || 'list';
  if (sub === 'list') return cmdList();
  if (sub === 'create') {
    console.log('(stub) Interactive workflow creation. See src/builder-skills/wize-create-workflow/workflow.md.');
    return;
  }
  console.log(`Unknown workflow subcommand: ${sub}`);
}

function cmdValidate() {
  require('./validators/run-all.js')(KIT_ROOT);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(HELP);
    return;
  }
  switch (cmd) {
    case 'install':   return cmdInstall(rest);
    case 'update':    console.log('(stub) Update: diff + preserve customizations. Not yet implemented.'); return;
    case 'uninstall': return cmdUninstall();
    case 'list':      return cmdList();
    case 'sync':      return cmdSync();
    case 'agent':     return cmdAgent(rest);
    case 'workflow':  return cmdWorkflow(rest);
    case 'validate':  return cmdValidate();
    case 'version':
    case '--version':
    case '-v':
      console.log(`wize-dev-kit v${KIT_VERSION}`);
      return;
    default:
      console.log(`Unknown command: ${cmd}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch(err => {
  console.error('\n✖ wize-dev-kit failed:', err && err.message ? err.message : err);
  process.exit(1);
});
