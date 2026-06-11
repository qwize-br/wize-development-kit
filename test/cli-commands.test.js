// Tests for the new CLI commands shipped in 0.2.0:
//   - `wize-dev-kit update`
//   - `wize-dev-kit sync`
//   - `wize-dev-kit agent list | create | edit`
//
// We exercise the underlying functions directly (rather than spawning the
// CLI) to keep the suite fast and assertable. Stdin/stdout interactions
// are bypassed via the `fromSpec` opt-in path on cmdAgentCreate.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const { cmdUpdate, loadProjectConfig, changelogBetween } = require(path.join(KIT, 'tools/installer/commands/update.js'));
const { cmdSync } = require(path.join(KIT, 'tools/installer/commands/sync.js'));
const { cmdAgentList, cmdAgentCreate, cmdAgentEdit, validateAgent } = require(path.join(KIT, 'tools/installer/commands/agent.js'));

function tmpProject(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function seedInstalledProject(root, { kitVersion = '0.0.1', profiles = ['core'], ideTargets = ['claude-code', 'generic'] } = {}) {
  fs.mkdirSync(path.join(root, '.wize/config'), { recursive: true });
  fs.mkdirSync(path.join(root, '.wize/custom/agents'), { recursive: true });
  const profileLine = profiles.map(p => `"${p}"`).join(', ');
  const targetLine = ideTargets.map(t => `"${t}"`).join(', ');
  fs.writeFileSync(path.join(root, '.wize/config/project.toml'), `[project]
name = "${path.basename(root)}"
kit_version = "${kitVersion}"

[install]
profiles = [${profileLine}]
ide_targets = [${targetLine}]

[language]
communication = "en"
document_output = "en"
`, 'utf-8');
  fs.writeFileSync(path.join(root, '.wize/config/user.toml'), `[user]\nname = "Test"\n`, 'utf-8');
}

function silentLog() { return () => {}; }

// ---------- update ----------

test('cmdUpdate refuses when there is no installed kit at the project', async () => {
  const root = tmpProject('wize-upd-no-');
  const r = await cmdUpdate({ kitRoot: KIT, projectRoot: root, opts: { log: silentLog() } });
  assert.strictEqual(r.changed, false);
  fs.rmSync(root, { recursive: true, force: true });
});

test('cmdUpdate rewrites kit_version and re-renders adapters', async () => {
  const root = tmpProject('wize-upd-ok-');
  seedInstalledProject(root, { kitVersion: '0.0.1' });
  const before = fs.readFileSync(path.join(root, '.wize/config/project.toml'), 'utf-8');
  assert.match(before, /^kit_version = "0\.0\.1"$/m);

  const r = await cmdUpdate({ kitRoot: KIT, projectRoot: root, opts: { log: silentLog() } });
  assert.strictEqual(r.changed, true);

  const after = fs.readFileSync(path.join(root, '.wize/config/project.toml'), 'utf-8');
  const installedVersion = require(path.join(KIT, 'package.json')).version;
  assert.match(after, new RegExp(`^kit_version = "${installedVersion.replace(/\./g, '\\.')}"$`, 'm'));

  // Adapter outputs landed somewhere (claude + generic are in the seed).
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md')),
    'claude-code adapter should have re-rendered SKILL.md files');

  fs.rmSync(root, { recursive: true, force: true });
});

test('changelogBetween returns entries strictly above the from version', () => {
  const entries = changelogBetween(KIT, '0.1.2', '0.1.5');
  assert.ok(entries.length >= 1, 'expected at least one CHANGELOG entry between 0.1.2 and 0.1.5');
  for (const e of entries) {
    assert.ok(/^## \[(0\.1\.3|0\.1\.4|0\.1\.5)\]/.test(e), `unexpected entry header: ${e.slice(0, 40)}`);
  }
});

// ---------- sync ----------

test('cmdSync regenerates adapters declared in project.toml', () => {
  const root = tmpProject('wize-sync-');
  seedInstalledProject(root, { ideTargets: ['claude-code', 'cursor'] });

  const r = cmdSync({ kitRoot: KIT, projectRoot: root, opts: { log: silentLog() } });
  assert.strictEqual(r.changed, true);
  assert.ok(r.adapters.length === 2, 'should report two adapters');
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md')));
  assert.ok(fs.existsSync(path.join(root, '.cursor/rules/wize-orchestrator.mdc')));
  fs.rmSync(root, { recursive: true, force: true });
});

// ---------- agent ----------

test('cmdAgentList returns every built-in agent + any custom present', () => {
  const root = tmpProject('wize-agent-list-');
  seedInstalledProject(root);
  const { builtIn, custom } = cmdAgentList({ kitRoot: KIT, projectRoot: root, log: silentLog() });
  assert.ok(builtIn.length >= 9, `expected ≥ 9 built-in agents, got ${builtIn.length}`);
  assert.ok(builtIn.some(a => a.code === 'wize-orchestrator'));
  assert.ok(builtIn.some(a => a.code === 'wize-agent-architect'));
  assert.deepStrictEqual(custom, []);
  fs.rmSync(root, { recursive: true, force: true });
});

test('cmdAgentCreate validates code shape', () => {
  const errs = validateAgent({
    code: 'invalid-code',
    name: 'X', title: 'Y', module: 'custom', description: 'short description here'
  }, KIT);
  assert.ok(errs.some(e => /must match/.test(e)), 'should reject bad code');
});

test('cmdAgentCreate rejects collisions with built-in agents', () => {
  const errs = validateAgent({
    code: 'wize-agent-architect',
    name: 'X', title: 'Y', module: 'custom', description: 'a description long enough'
  }, KIT);
  assert.ok(errs.some(e => /already exists as a built-in/.test(e)),
            'should reject when colliding with built-in without allowOverride');
});

test('cmdAgentCreate persists a valid custom agent (fromSpec, non-TTY)', async () => {
  const root = tmpProject('wize-agent-create-');
  seedInstalledProject(root);
  const spec = {
    code: 'wize-agent-runbooks',
    name: 'Riri Williams',
    title: 'Runbooks Engineer',
    icon: '📒',
    team: 'software-development',
    module: 'custom',
    description: 'Owns operational runbooks across services. Pairs with Hawkeye on incident review.',
    persona: '# Riri\nI keep the runbooks honest.'
  };
  await cmdAgentCreate({ kitRoot: KIT, projectRoot: root, opts: { fromSpec: spec } });
  assert.ok(fs.existsSync(path.join(root, '.wize/custom/agents/wize-agent-runbooks/agent.yaml')));
  assert.ok(fs.existsSync(path.join(root, '.wize/custom/agents/wize-agent-runbooks/persona.md')));

  // listing reflects it
  const { custom } = cmdAgentList({ kitRoot: KIT, projectRoot: root, log: silentLog() });
  assert.ok(custom.some(a => a.code === 'wize-agent-runbooks'));
  fs.rmSync(root, { recursive: true, force: true });
});

test('cmdAgentEdit writes a customize.toml stub for a built-in', async () => {
  const root = tmpProject('wize-agent-edit-');
  seedInstalledProject(root);
  await cmdAgentEdit({ kitRoot: KIT, projectRoot: root, code: 'wize-agent-pm' });
  const f = path.join(root, '.wize/custom/agents/wize-agent-pm/customize.toml');
  assert.ok(fs.existsSync(f), 'customize.toml should be created for built-in override');
  const content = fs.readFileSync(f, 'utf-8');
  assert.match(content, /\[persona\]/);
  fs.rmSync(root, { recursive: true, force: true });
});
