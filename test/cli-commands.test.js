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

// ---------- sync: skew, marker, stable output (0.27.0) ----------

const KIT_PKG_VERSION = require(path.join(KIT, 'package.json')).version;
const { readMarker } = require(path.join(KIT, 'tools/installer/marker.js'));

function runSync(root, extra = {}) {
  const out = []; const err = [];
  const r = cmdSync({ kitRoot: KIT, projectRoot: root, opts: { log: m => out.push(m), warn: m => err.push(m), ...extra } });
  return { r, out, err };
}

function kitVersionLine(root) {
  return fs.readFileSync(path.join(root, '.wize/config/project.toml'), 'utf-8').match(/^kit_version = "(.*)"$/m)[1];
}

test('sync with a pin behind the kit warns on stderr and leaves kit_version alone', () => {
  const root = tmpProject('wize-sync-behind-');
  seedInstalledProject(root, { kitVersion: '0.0.1', ideTargets: ['claude-code', 'generic'] });
  const tomlBefore = fs.readFileSync(path.join(root, '.wize/config/project.toml'), 'utf-8');
  const { r, out, err } = runSync(root);
  assert.strictEqual(r.skew, 'project-behind');
  assert.strictEqual(err[0], `wize: project pinned 0.0.1, running ${KIT_PKG_VERSION}; for an exact render run: npx --yes wize-dev-kit@0.0.1 sync (or update the pin: npx wize-dev-kit@latest update)`);
  assert.ok(!err.some(l => /prefer:/.test(l)), 'no hydrate hint for a pin that predates hydrate');
  assert.ok(!out.some(l => /pinned/.test(l)), 'the skew line is stderr only');
  assert.strictEqual(fs.readFileSync(path.join(root, '.wize/config/project.toml'), 'utf-8'), tomlBefore);
  assert.strictEqual(kitVersionLine(root), '0.0.1');
  fs.rmSync(root, { recursive: true, force: true });
});

test('sync with a pin above the kit uses the use-pin wording', () => {
  const root = tmpProject('wize-sync-ahead-');
  seedInstalledProject(root, { kitVersion: '99.0.0', ideTargets: ['generic'] });
  const { r, err } = runSync(root);
  assert.strictEqual(r.skew, 'project-ahead');
  assert.strictEqual(err[0], `wize: project pinned 99.0.0 is newer than this kit ${KIT_PKG_VERSION}; run: npx --yes wize-dev-kit@99.0.0 sync`);
  assert.ok(!err.some(l => /update the pin/.test(l)));
  assert.ok(err.includes('prefer: npx wize-dev-kit hydrate'), 'pin >= 0.27.0 gets the hydrate hint');
  assert.strictEqual(kitVersionLine(root), '99.0.0');
  fs.rmSync(root, { recursive: true, force: true });
});

test('sync with a pin equal to the kit is silent about skew', () => {
  const root = tmpProject('wize-sync-equal-');
  seedInstalledProject(root, { kitVersion: KIT_PKG_VERSION, ideTargets: ['generic'] });
  const { r, err } = runSync(root);
  assert.strictEqual(r.skew, 'none');
  assert.ok(!err.some(l => /pinned/.test(l)));
  fs.rmSync(root, { recursive: true, force: true });
});

test('sync writes the hydration marker with the running kit version and keeps today\'s stdout lines', () => {
  const root = tmpProject('wize-sync-marker-');
  seedInstalledProject(root, { kitVersion: '0.0.1', ideTargets: ['claude-code', 'generic'] });
  const { out } = runSync(root);
  assert.strictEqual(out[0], 'Syncing 2 adapter(s) for profile(s) core:');
  assert.ok(out.some(l => /^  ✓ claude-code: \d+ file\(s\) emitted$/.test(l)), out.join('\n'));
  assert.ok(out.some(l => /^  ✓ generic: \d+ file\(s\) emitted$/.test(l)));
  assert.ok(out.some(l => l.includes('Done. Restart your IDE')));
  const m = readMarker(root);
  assert.strictEqual(m.kit_version, KIT_PKG_VERSION);
  assert.deepStrictEqual(m.targets, ['claude-code', 'generic']);
  assert.deepStrictEqual(m.profiles, ['core']);
  assert.strictEqual(m.rendered_with, KIT_PKG_VERSION);
  fs.rmSync(root, { recursive: true, force: true });
});

test('sync never writes user.toml, .gitignore or kit_version', () => {
  const root = tmpProject('wize-sync-nowrite-');
  seedInstalledProject(root, { kitVersion: '0.0.1', ideTargets: ['generic'] });
  fs.rmSync(path.join(root, '.wize/config/user.toml'));
  runSync(root);
  assert.ok(!fs.existsSync(path.join(root, '.wize/config/user.toml')));
  assert.ok(!fs.existsSync(path.join(root, '.gitignore')));
  assert.strictEqual(kitVersionLine(root), '0.0.1');
  fs.rmSync(root, { recursive: true, force: true });
});

test('a second sync reports changed:false', () => {
  const root = tmpProject('wize-sync-twice-');
  seedInstalledProject(root, { ideTargets: ['claude-code', 'generic'] });
  assert.strictEqual(runSync(root).r.changed, true);
  const second = runSync(root);
  assert.strictEqual(second.r.changed, false);
  assert.ok(second.r.adapters.every(a => a.written === 0));
  fs.rmSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md'));
  assert.strictEqual(runSync(root).r.changed, true, 'a deleted file is regenerated');
  fs.rmSync(root, { recursive: true, force: true });
});

test('sync without a project.toml returns the empty shape', () => {
  const root = tmpProject('wize-sync-none-');
  const { r, out } = runSync(root);
  assert.deepStrictEqual(r, { changed: false, adapters: [], skew: 'none' });
  assert.match(out[0], /No \.wize\/config\/project\.toml/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('`sync` via the CLI exits 0, keeps stdout lines and puts the skew line on stderr', () => {
  const root = tmpProject('wize-sync-cli-');
  seedInstalledProject(root, { kitVersion: '0.0.1', ideTargets: ['generic'] });
  const { spawnSync } = require('node:child_process');
  const r = spawnSync(process.execPath, [path.join(KIT, 'tools/installer/wize-cli.js'), 'sync'], {
    cwd: root, encoding: 'utf-8', timeout: 30000,
    env: { ...process.env, WIZE_DISABLE_UPDATE_CHECK: '1' }
  });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /Syncing 1 adapter\(s\)/);
  assert.match(r.stdout, /✓ generic: \d+ file\(s\) emitted/);
  assert.match(r.stderr, /wize: project pinned 0\.0\.1, running /);
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

// ---------- version-check ----------

const { cmdVersionCheck } = require(path.join(KIT, 'tools/installer/commands/version-check.js'));
const { writeCache } = require(path.join(KIT, 'tools/installer/version-check.js'));

async function withTempCacheHomeSync(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-vc-cli-'));
  const hadOrig = Object.hasOwn(process.env, 'XDG_CACHE_HOME');
  const orig = process.env.XDG_CACHE_HOME;
  process.env.XDG_CACHE_HOME = dir;
  try {
    await fn(dir);
  } finally {
    if (hadOrig) process.env.XDG_CACHE_HOME = orig;
    else delete process.env.XDG_CACHE_HOME;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('cmdVersionCheck --json reports the update and never throws', async () => {
  await withTempCacheHomeSync(async () => {
    writeCache({ version: '9.9.9', fetched_at: Date.now() });
    let out = '';
    const r = await cmdVersionCheck({ currentVersion: '1.0.0', json: true, log: (s) => { out += s + '\n'; } });
    assert.strictEqual(r.updateAvailable, true);
    assert.match(out, /"latest":"9\.9\.9"/);
  });
});

test('cmdVersionCheck (human) prints an up-to-date message when versions match', async () => {
  await withTempCacheHomeSync(async () => {
    writeCache({ version: '1.0.0', fetched_at: Date.now() });
    let out = '';
    await cmdVersionCheck({ currentVersion: '1.0.0', log: (s) => { out += s + '\n'; } });
    assert.match(out, /up to date/);
  });
});

test('cmdVersionCheck (human) points at npx wize-dev-kit@latest update when behind', async () => {
  await withTempCacheHomeSync(async () => {
    writeCache({ version: '2.0.0', fetched_at: Date.now() });
    let out = '';
    await cmdVersionCheck({ currentVersion: '1.0.0', log: (s) => { out += s + '\n'; } });
    assert.match(out, /Update available/);
    assert.match(out, /npx wize-dev-kit@latest update/);
  });
});

// ---------- hints never await the network ----------

test('`sync` returns quickly even when fetch hangs forever', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-hang-'));
  const stub = path.join(dir, 'hang-fetch.js');
  fs.writeFileSync(stub, 'global.fetch = () => new Promise(() => {});\n');
  const proj = path.join(dir, 'proj');
  fs.mkdirSync(path.join(proj, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.wize/config/project.toml'),
    '[project]\nname = "x"\n\n[install]\nide_targets = ["generic"]\nprofiles = ["core"]\n');
  const { spawnSync } = require('node:child_process');
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['--require', stub, path.join(KIT, 'tools/installer/wize-cli.js'), 'sync'], {
    cwd: proj,
    encoding: 'utf-8',
    timeout: 20000,
    env: { ...process.env, WIZE_DISABLE_UPDATE_CHECK: '', XDG_CACHE_HOME: path.join(dir, 'cache'), CI: '' }
  });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(Date.now() - t0 < 10000, 'not blocked on the registry');
  fs.rmSync(dir, { recursive: true, force: true });
});
