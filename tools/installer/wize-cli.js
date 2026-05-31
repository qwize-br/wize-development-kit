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
const path = require('node:path');
const readline = require('node:readline');

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

async function multiSelect(label, items, isSelected = i => i.default) {
  console.log(`\n${label}:`);
  items.forEach((it, i) => {
    const star = it.required ? '★ ' : '  ';
    const def = isSelected(it) ? '(default on)' : '';
    console.log(`  ${i + 1}. ${star}${it.label} ${def}`);
  });
  const ans = await prompt('Pick numbers (comma-separated) or ENTER for defaults: ');
  if (!ans) {
    return items.filter(it => it.required || isSelected(it));
  }
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

function projectToml({ profiles, targets, language, project_name }) {
  const profileLine = profiles.map(p => `"${p.code}"`).join(', ');
  const targetLine = targets.map(t => `"${t.code}"`).join(', ');
  return `# Wize Development Kit — project config
# Generated at install. Edit user-level customizations in user.toml.

[project]
name = "${project_name}"
kit_version = "${KIT_VERSION}"

[install]
profiles = [${profileLine}]
ide_targets = [${targetLine}]

[language]
communication = "${language}"
document_output = "${language}"

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

function userToml() {
  return `# Wize Development Kit — user-level customizations
# This file is preserved on update; project.toml may be rewritten.
`;
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
  const language = (await prompt('Communication language [en]: ')) || 'en';

  console.log('\nCreating .wize/ skeleton...');
  for (const dir of WIZE_DIRS) mkdirp(path.join(cwd, dir));

  writeIfMissing(path.join(cwd, '.wize/config/project.toml'), projectToml({ profiles, targets, language, project_name }));
  writeIfMissing(path.join(cwd, '.wize/config/user.toml'), userToml());
  writeIfMissing(path.join(cwd, '.wize/config/tea.toml'), teaToml());

  console.log('✓ .wize/ created');
  console.log(`✓ profiles: ${profiles.map(p => p.code).join(', ')}`);
  console.log(`✓ ide targets: ${targets.map(t => t.code).join(', ')}`);

  console.log('\n(stub) IDE adapter generation would run now for each target.');
  console.log('(stub) onboarding handoff to Wizer would start here.');

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
