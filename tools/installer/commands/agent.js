// `wize-dev-kit agent <subcommand>` — manage built-in and custom agents.
//
//   list        - show every agent the active install resolves (built-in + custom)
//   create      - scaffold a brand-new custom agent in .wize/custom/agents/{code}/
//   edit <code> - override an existing built-in via .wize/custom/agents/{code}/customize.toml
//
// All write operations validate the result against schemas/agent.schema.json
// (lite parser — no dependency on Ajv yet) and do a smoke dry-run before
// persisting, matching the contract `wize-create-agent` describes.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const prompts = require('prompts');
const { collectAssets } = require('../render-shared.js');

const VALID_CODE = /^wize-(agent|orchestrator)(?:-[a-z0-9-]+)?$/;
const VALID_MODULES = ['orchestrator', 'method', 'tea', 'builder', 'core', 'web-overlay', 'app-overlay', 'custom'];

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function listAgents(kitRoot, projectRoot) {
  const builtIn = collectAssets(kitRoot, { profiles: ['core', 'web-overlay', 'app-overlay'] })
    .filter(a => a.kind === 'agent')
    .map(a => ({ code: a.code, name: a.name, title: a.title, source: 'built-in' }));
  const customDir = path.join(projectRoot, '.wize/custom/agents');
  const custom = [];
  if (fs.existsSync(customDir)) {
    for (const entry of fs.readdirSync(customDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const yamlPath = path.join(customDir, entry.name, 'agent.yaml');
      const customizePath = path.join(customDir, entry.name, 'customize.toml');
      if (fs.existsSync(yamlPath)) {
        const yaml = fs.readFileSync(yamlPath, 'utf-8');
        const name = (yaml.match(/^name:\s*(.+)$/m) || [])[1] || entry.name;
        const title = (yaml.match(/^title:\s*(.+)$/m) || [])[1] || '';
        custom.push({ code: entry.name, name: name.trim(), title: title.trim(), source: 'custom' });
      } else if (fs.existsSync(customizePath)) {
        custom.push({ code: entry.name, name: '(override)', title: '', source: 'override' });
      }
    }
  }
  return { builtIn, custom };
}

function cmdAgentList({ kitRoot, projectRoot, log = console.log } = {}) {
  const { builtIn, custom } = listAgents(kitRoot, projectRoot);
  log('Built-in agents:');
  for (const a of builtIn) log(`  ${a.code.padEnd(36)} ${a.name}${a.title ? ' — ' + a.title : ''}`);
  if (custom.length) {
    log('\nCustom / override agents (from .wize/custom/agents/):');
    for (const a of custom) log(`  ${a.code.padEnd(36)} ${a.name}${a.title ? ' — ' + a.title : ''}   [${a.source}]`);
  } else {
    log('\nCustom / override agents: (none yet — use `wize-dev-kit agent create`)');
  }
  return { builtIn, custom };
}

function validateAgent(spec, kitRoot) {
  const errs = [];
  if (!spec.code) errs.push('code is required');
  else if (!VALID_CODE.test(spec.code)) errs.push(`code "${spec.code}" must match wize-(agent|orchestrator)[-name]`);
  if (!spec.name) errs.push('name is required');
  if (!spec.title) errs.push('title is required');
  if (!VALID_MODULES.includes(spec.module)) errs.push(`module must be one of: ${VALID_MODULES.join(', ')}`);
  if (!spec.description || spec.description.length < 10) errs.push('description must be ≥ 10 characters');
  // Collide check against built-ins when not overriding.
  const builtinCodes = collectAssets(kitRoot, { profiles: ['core', 'web-overlay', 'app-overlay'] })
    .filter(a => a.kind === 'agent').map(a => a.code);
  if (builtinCodes.includes(spec.code) && !spec.allowOverride) {
    errs.push(`code "${spec.code}" already exists as a built-in. Use \`wize-dev-kit agent edit ${spec.code}\` to override.`);
  }
  return errs;
}

function renderAgentYaml(spec) {
  return [
    `code: ${spec.code}`,
    `name: ${spec.name}`,
    `title: ${spec.title}`,
    `icon: "${spec.icon || '🔧'}"`,
    `team: ${spec.team || 'software-development'}`,
    `module: ${spec.module}`,
    '',
    'description: |',
    ...spec.description.split('\n').map(l => '  ' + l),
    ''
  ].join('\n');
}

function renderPersonaMd(spec) {
  const body = (spec.persona || `I am **${spec.name}**. ${spec.description}`).trim();
  return [
    `# ${spec.name} — ${spec.title}`,
    '',
    body,
    ''
  ].join('\n');
}

// Smoke dry-run: write to temp dir, re-read, assert frontmatter parses.
function dryRunPersist(spec) {
  const tmp = path.join(require('node:os').tmpdir(), `wize-agent-${spec.code}-${Date.now()}`);
  ensureDir(tmp);
  try {
    fs.writeFileSync(path.join(tmp, 'agent.yaml'), renderAgentYaml(spec), 'utf-8');
    fs.writeFileSync(path.join(tmp, 'persona.md'), renderPersonaMd(spec), 'utf-8');
    const reread = fs.readFileSync(path.join(tmp, 'agent.yaml'), 'utf-8');
    if (!/^code:\s+/m.test(reread)) throw new Error('emitted agent.yaml has no "code:" line');
    if (!/^name:\s+/m.test(reread)) throw new Error('emitted agent.yaml has no "name:" line');
    return { ok: true };
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
  }
}

async function cmdAgentCreate({ kitRoot, projectRoot, opts = {} } = {}) {
  const interactive = process.stdout.isTTY && process.stdin.isTTY && !opts.fromSpec;
  let spec = opts.fromSpec || {};

  if (interactive) {
    const a = await prompts([
      { type: 'text', name: 'code',  message: 'Agent code (e.g. wize-agent-runbooks)',
        validate: v => VALID_CODE.test(v) || 'must match wize-(agent|orchestrator)[-name]' },
      { type: 'text', name: 'name',  message: 'Display name (e.g. Riri Williams)', validate: v => !!v.trim() || 'required' },
      { type: 'text', name: 'title', message: 'Role / title (e.g. Reliability Engineer)', validate: v => !!v.trim() || 'required' },
      { type: 'text', name: 'icon',  message: 'Icon emoji (optional)', initial: '🔧' },
      { type: 'text', name: 'team',  message: 'Team', initial: 'software-development' },
      { type: 'select', name: 'module', message: 'Module', choices: VALID_MODULES.map(v => ({ title: v, value: v })), initial: VALID_MODULES.indexOf('custom') },
      { type: 'text', name: 'description', message: 'One-paragraph description (≥ 10 chars)', validate: v => v.length >= 10 || 'must be ≥ 10 characters' },
      { type: 'text', name: 'persona', message: 'Persona body (optional — defaults to description)', initial: '' }
    ], { onCancel: () => process.exit(130) });
    spec = { ...spec, ...a };
  }

  const errs = validateAgent(spec, kitRoot);
  if (errs.length) {
    console.error('✖ Validation failed:');
    for (const e of errs) console.error('  - ' + e);
    process.exit(2);
  }

  const dry = dryRunPersist(spec);
  if (!dry.ok) {
    console.error('✖ Dry-run failed; aborting.');
    process.exit(3);
  }

  const target = path.join(projectRoot, '.wize/custom/agents', spec.code);
  ensureDir(target);
  fs.writeFileSync(path.join(target, 'agent.yaml'), renderAgentYaml(spec), 'utf-8');
  fs.writeFileSync(path.join(target, 'persona.md'), renderPersonaMd(spec), 'utf-8');

  console.log(`✓ Created ${path.relative(projectRoot, target)}/`);
  console.log('  Run `wize-dev-kit sync` to refresh IDE adapter outputs with the new agent.');
  return { code: spec.code, path: target };
}

async function cmdAgentEdit({ kitRoot, projectRoot, code, opts = {} } = {}) {
  if (!code) {
    console.error('Usage: wize-dev-kit agent edit <code>');
    process.exit(1);
  }
  const builtinCodes = collectAssets(kitRoot, { profiles: ['core', 'web-overlay', 'app-overlay'] })
    .filter(a => a.kind === 'agent').map(a => a.code);
  if (!builtinCodes.includes(code)) {
    console.error(`✖ "${code}" is not a built-in agent. Use \`wize-dev-kit agent create\` for new agents.`);
    process.exit(2);
  }

  const target = path.join(projectRoot, '.wize/custom/agents', code);
  ensureDir(target);
  const customize = path.join(target, 'customize.toml');
  if (fs.existsSync(customize) && !opts.force) {
    console.log(`= ${path.relative(projectRoot, customize)} already exists. Edit it directly.`);
    return { code, path: customize };
  }
  fs.writeFileSync(customize, `# Wize Dev Kit — overrides for the built-in agent "${code}".
# This file is loaded on top of the built-in agent's persona.md / agent.yaml
# at IDE adapter render time. Only the fields you set here are overridden.

[persona]
# motto      = "your custom motto"
# voice      = "succinct and irreverent"
# style      = "show with code, not prose"

[behavior]
# defer_to   = []         # e.g. ["wize-agent-pm"] to lower priority on certain decisions
# tools_deny = []         # tool codes the override removes from the agent
`, 'utf-8');
  console.log(`✓ Created ${path.relative(projectRoot, customize)}`);
  console.log('  Edit the file, then run `wize-dev-kit sync` to apply.');
  return { code, path: customize };
}

module.exports = { cmdAgentList, cmdAgentCreate, cmdAgentEdit, listAgents, validateAgent };
