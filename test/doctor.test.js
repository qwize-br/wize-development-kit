// Tests for tools/installer/commands/doctor.js — sub-functions exposed for
// targeted testing. cmdDoctor's full integration smoke is exercised via the
// CI smoke E2E.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const {
  cmdDoctor,
  detectPhase,
  gateStats,
  knowledgeStatus,
  gitInfo,
  adapterTargetPath,
  countAdapterFiles
} = require(path.join(KIT, 'tools/installer/commands/doctor.js'));

function tmpProject(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function seedMinimalInstall(root, { kitVersion = '0.2.5', profiles = ['core'], ideTargets = ['claude-code', 'generic'] } = {}) {
  fs.mkdirSync(path.join(root, '.wize/config'), { recursive: true });
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
  fs.writeFileSync(path.join(root, '.wize/config/user.toml'), `[user]\nname = "Smoke"\n`, 'utf-8');
}

function silentLog() { return () => {}; }

test('detectPhase reports no-install when .wize is missing', () => {
  const root = tmpProject('wize-doc-noi-');
  assert.strictEqual(detectPhase(root), 'no-install');
  fs.rmSync(root, { recursive: true, force: true });
});

test('detectPhase reports brief pending when .wize exists but planning empty', () => {
  const root = tmpProject('wize-doc-brief-');
  fs.mkdirSync(path.join(root, '.wize/planning'), { recursive: true });
  assert.match(detectPhase(root), /brief pending/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('detectPhase progresses past PRD when prd.md is present', () => {
  const root = tmpProject('wize-doc-prd-');
  fs.mkdirSync(path.join(root, '.wize/planning/ux'), { recursive: true });
  fs.writeFileSync(path.join(root, '.wize/planning/brief.md'), '# brief', 'utf-8');
  fs.writeFileSync(path.join(root, '.wize/planning/ux/trigger-map.md'), '# map', 'utf-8');
  fs.writeFileSync(path.join(root, '.wize/planning/prd.md'), '# prd', 'utf-8');
  assert.match(detectPhase(root), /(UX scenarios pending|2-plan)/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('gateStats counts PASS / CONCERNS / FAIL / WAIVED', () => {
  const root = tmpProject('wize-doc-gates-');
  const base = path.join(root, '.wize/implementation/tea/E01-S01');
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, 'gate.md'), '---\nstatus: PASS\n---\n', 'utf-8');
  fs.mkdirSync(path.join(root, '.wize/implementation/tea/E01-S02'), { recursive: true });
  fs.writeFileSync(path.join(root, '.wize/implementation/tea/E01-S02/gate.md'), '---\nstatus: CONCERNS\n---\n', 'utf-8');
  fs.mkdirSync(path.join(root, '.wize/implementation/tea/E01-S03'), { recursive: true });
  fs.writeFileSync(path.join(root, '.wize/implementation/tea/E01-S03/gate.md'), '---\nstatus: FAIL\n---\n', 'utf-8');
  const stats = gateStats(root);
  assert.deepStrictEqual(stats, { PASS: 1, CONCERNS: 1, FAIL: 1, WAIVED: 0, total: 3 });
  fs.rmSync(root, { recursive: true, force: true });
});

test('knowledgeStatus reports missing when document-project absent', () => {
  const root = tmpProject('wize-doc-knm-');
  const k = knowledgeStatus(root);
  assert.strictEqual(k.exists, false);
  fs.rmSync(root, { recursive: true, force: true });
});

test('knowledgeStatus parses last_refreshed and counts _pending lines', () => {
  const root = tmpProject('wize-doc-kn-');
  const dir = path.join(root, '.wize/knowledge/document-project');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'conventions.md'),
    '---\nstatus: baseline\nlast_refreshed: 2026-04-01\n---\n# Conventions\n', 'utf-8');
  fs.writeFileSync(path.join(dir, '_pending.md'),
    '# pending\n2026-06-10 | shuri | conventions | something\n2026-06-11 | shuri | risk | another\n', 'utf-8');
  const k = knowledgeStatus(root);
  assert.strictEqual(k.exists, true);
  assert.strictEqual(k.files.length, 1);
  assert.strictEqual(k.files[0].name, 'conventions.md');
  assert.ok(k.files[0].days >= 0, 'days should be a non-negative number');
  assert.strictEqual(k.pendingLines, 2);
  fs.rmSync(root, { recursive: true, force: true });
});

test('knowledgeStatus counts To be generated markers and scan report age', () => {
  const root = tmpProject('wize-doc-kn-markers-');
  const dir = path.join(root, '.wize/knowledge/document-project');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.md'),
    '# Index\n- [Architecture](./architecture.md) _(To be generated)_\n- [Guide](./guide.md) _(To be generated)_\n', 'utf-8');
  fs.writeFileSync(path.join(dir, 'project-scan-report.json'),
    JSON.stringify({ workflow_version: '0.3.1', timestamps: { last_updated: new Date().toISOString() } }), 'utf-8');
  const k = knowledgeStatus(root);
  assert.strictEqual(k.toBeGeneratedMarkers, 2);
  assert.strictEqual(k.stateExists, true);
  assert.strictEqual(k.stateAgeDays, 0);
  fs.rmSync(root, { recursive: true, force: true });
});

test('knowledgeStatus handles missing index and scan report', () => {
  const root = tmpProject('wize-doc-kn-empty-');
  const dir = path.join(root, '.wize/knowledge/document-project');
  fs.mkdirSync(dir, { recursive: true });
  const k = knowledgeStatus(root);
  assert.strictEqual(k.toBeGeneratedMarkers, 0);
  assert.strictEqual(k.stateExists, false);
  assert.strictEqual(k.stateAgeDays, null);
  fs.rmSync(root, { recursive: true, force: true });
});

test('gitInfo detects branch when .git/HEAD is a ref', () => {
  const root = tmpProject('wize-doc-git-');
  fs.mkdirSync(path.join(root, '.git'), { recursive: true });
  fs.writeFileSync(path.join(root, '.git/HEAD'), 'ref: refs/heads/main\n', 'utf-8');
  const info = gitInfo(root);
  assert.strictEqual(info.isRepo, true);
  assert.strictEqual(info.branch, 'main');
  fs.rmSync(root, { recursive: true, force: true });
});

test('adapterTargetPath returns expected paths for all known targets', () => {
  const root = '/tmp/x';
  const paths = {
    'claude-code': '.claude/skills',
    'copilot':     '.github/skills',
    'antigravity': '.agent/skills',
    'codex':       '.agents/skills',
    'kimi-code':   '.kimi/skills',
    'hermes':      '.hermes/skills',
    'kiro':        '.kiro/skills',
    'cursor':      '.cursor/rules',
    'windsurf':    '.windsurf/rules',
    'continue':    '.continue/prompts',
    'opencode':    '.opencode/agents',
    'generic':     '.wize/agents'
  };
  for (const [k, suffix] of Object.entries(paths)) {
    assert.strictEqual(adapterTargetPath(k, root), path.join(root, suffix));
  }
  assert.strictEqual(adapterTargetPath('unknown', root), null);
});

test('countAdapterFiles returns 0 when adapter dir absent', () => {
  const root = tmpProject('wize-doc-adcount-');
  assert.strictEqual(countAdapterFiles('claude-code', root), 0);
  fs.rmSync(root, { recursive: true, force: true });
});

test('countAdapterFiles walks the tree for SKILL.md folders', () => {
  const root = tmpProject('wize-doc-adcount2-');
  fs.mkdirSync(path.join(root, '.claude/skills/wize-orchestrator'), { recursive: true });
  fs.mkdirSync(path.join(root, '.claude/skills/wize-agent-pm'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md'), '...', 'utf-8');
  fs.writeFileSync(path.join(root, '.claude/skills/wize-agent-pm/SKILL.md'), '...', 'utf-8');
  assert.strictEqual(countAdapterFiles('claude-code', root), 2);
  fs.rmSync(root, { recursive: true, force: true });
});

test('cmdDoctor runs end-to-end on a minimally-installed project', async () => {
  const root = tmpProject('wize-doc-run-');
  seedMinimalInstall(root);
  let said = '';
  const out = await cmdDoctor({
    kitRoot: KIT,
    projectRoot: root,
    opts: { log: (m) => { said += m + '\n'; }, env: { WIZE_DISABLE_UPDATE_CHECK: '1' } }
  });
  assert.ok(said.includes('Wize Dev Kit — Doctor'), 'should print header');
  assert.ok(said.includes('Project'), 'should print Project section');
  assert.ok(said.includes('IDE Adapters'), 'should print adapters section');
  assert.ok(said.includes('Suggestions'), 'should print suggestions section');
  assert.ok(Array.isArray(out.suggestions), 'should return suggestions array');
  fs.rmSync(root, { recursive: true, force: true });
});

// ---------- worktree-aware doctor (0.27.0) ----------

const { spawnSync } = require('node:child_process');
const {
  GIT_ENV, applyGitEnv, git, CLI, KIT_VERSION, tmpDir, makeInstalledRepo, addWorktree
} = require('./_helpers-git.js');
const { cmdHydrate } = require(path.join(KIT, 'tools/installer/commands/hydrate.js'));
const { writeMarker } = require(path.join(KIT, 'tools/installer/marker.js'));

// In-process git calls (gitContext, ls-files) must not read the developer's config.
applyGitEnv();

const OFF = { WIZE_DISABLE_UPDATE_CHECK: '1' };

function fakeKit(version) {
  const dir = tmpDir('wize-doc-kit-');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'wize-dev-kit', version }));
  return dir;
}

async function doctor(root, { kit = KIT, env = OFF, ...rest } = {}) {
  let said = '';
  const r = await cmdDoctor({ kitRoot: kit, projectRoot: root, opts: { log: (m) => { said += m + '\n'; }, env, ...rest } });
  return { ...r, said };
}

function hydrateAs(root, version, targets = ['claude-code', 'generic']) {
  return cmdHydrate({
    kitRoot: KIT, binary: version, projectRoot: root,
    flags: { 'no-delegate': true, quiet: true, 'no-notice': true },
    env: { ...GIT_ENV, WIZE_DISABLE_UPDATE_CHECK: '1' }, log: () => {}, warn: () => {}
  });
}

function worktreeFixture(opts = {}) {
  const base = tmpDir('wize-doc-wt-');
  const primary = makeInstalledRepo(path.join(base, 'primary'), opts);
  const wt = addWorktree(primary, path.join(base, 'wt'), 'work');
  return { base, primary, wt };
}

function errors(r) { return r.suggestions.filter(s => s.level === 'error'); }

test('doctor in a real linked worktree reports linked, branch, head and no git init', async () => {
  const { primary, wt } = worktreeFixture();
  const r = await doctor(wt);
  assert.strictEqual(r.git.isRepo, true);
  assert.strictEqual(r.git.linked, true);
  assert.strictEqual(r.git.primary, primary);
  assert.strictEqual(r.git.branch, 'work');
  assert.match(r.git.head, /^[0-9a-f]{7,}$/);
  assert.strictEqual(r.git.defaultBranch, 'main');
  assert.ok(r.said.includes(`linked worktree of ${primary}`), r.said);
  assert.match(r.said, /branch:\s+work/);
  assert.ok(r.said.includes(`head:     ${r.git.head}`));
  assert.ok(r.said.includes('default branch: main'));
  assert.ok(!r.suggestions.some(s => /git init/.test(s.text)));

  const p = await doctor(primary);
  assert.ok(p.said.includes('primary checkout'));
  assert.strictEqual(p.git.linked, false);
});

test('doctor reports a detached HEAD with its sha', async () => {
  const { wt } = worktreeFixture();
  git(wt, 'checkout', '-q', '--detach');
  const r = await doctor(wt);
  assert.strictEqual(r.git.detached, true);
  assert.strictEqual(r.git.branch, null);
  assert.ok(r.said.includes(`detached @${r.git.head}`), r.said);
  assert.match(r.git.head, /^[0-9a-f]{7,}$/);
});

test('gitInfo accepts a .git file and never reports a non-repo for it', () => {
  const root = tmpDir('wize-doc-gitfile-');
  fs.mkdirSync(path.join(root, 'real-gitdir'));
  fs.writeFileSync(path.join(root, 'real-gitdir/HEAD'), 'ref: refs/heads/feature\n');
  fs.writeFileSync(path.join(root, '.git'), 'gitdir: ./real-gitdir\n');
  const info = gitInfo(root);
  assert.strictEqual(info.isRepo, true);
  assert.strictEqual(info.branch, 'feature');
  fs.rmSync(root, { recursive: true, force: true });
});

test('gitInfo reads a detached sha from a fake .git directory', () => {
  const root = tmpDir('wize-doc-gitdet-');
  fs.mkdirSync(path.join(root, '.git'));
  fs.writeFileSync(path.join(root, '.git/HEAD'), 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678\n');
  const info = gitInfo(root);
  assert.strictEqual(info.detached, true);
  assert.strictEqual(info.head, 'a1b2c3d');
  fs.rmSync(root, { recursive: true, force: true });
});

test('doctor outside a git repo still suggests git init', async () => {
  const root = tmpDir('wize-doc-nogit-');
  seedMinimalInstall(root);
  const r = await doctor(root);
  assert.ok(r.suggestions.some(s => /git init/.test(s.text)));
  fs.rmSync(root, { recursive: true, force: true });
});

test('unhydrated worktree with only an alias file is reported missing; hydrate fixes it', async () => {
  const kit = fakeKit('0.27.0');
  const { wt } = worktreeFixture({ pin: '0.27.0' });
  fs.mkdirSync(path.join(wt, '.claude/skills/wize'), { recursive: true });
  fs.writeFileSync(path.join(wt, '.claude/skills/wize/SKILL.md'), 'alias');

  const r = await doctor(wt, { kit });
  assert.strictEqual(r.hydration.status, 'missing');
  assert.deepStrictEqual(r.hydration.missing_targets.sort(), ['claude-code', 'generic']);
  const e = errors(r);
  assert.strictEqual(e.length, 1);
  assert.match(e[0].text, /not hydrated/);
  assert.ok(e[0].text.includes('`npx --yes wize-dev-kit@0.27.0 hydrate`'));
  assert.ok(!/wize-dev-kit(@\S+)? sync/.test(e[0].text), 'never recommends sync for a fresh checkout');
  assert.ok(!r.said.includes('✓ 1 files'));
  assert.match(r.said, /claude-code\s+✖ alias only/);

  const h = hydrateAs(wt, '0.27.0');
  assert.strictEqual(h.ok, true);
  const after = await doctor(wt, { kit });
  assert.strictEqual(after.hydration.status, 'ok');
  assert.strictEqual(errors(after).length, 0, JSON.stringify(after.suggestions));
  assert.match(after.said, /claude-code\s+✓ rendered/);
  fs.rmSync(kit, { recursive: true, force: true });
});

test('a marker older than the pin is flagged stale with the hydrate command', async () => {
  const kit = fakeKit('0.27.0');
  const { wt } = worktreeFixture({ pin: '0.27.0' });
  hydrateAs(wt, '0.27.0');
  assert.strictEqual((await doctor(wt, { kit })).hydration.status, 'ok');

  writeMarker(wt, { kit_version: '0.26.1', targets: ['claude-code', 'generic'], profiles: ['core'] });
  const r = await doctor(wt, { kit });
  assert.strictEqual(r.hydration.status, 'stale');
  const e = errors(r);
  assert.strictEqual(e.length, 1);
  assert.match(e[0].text, /stale/);
  assert.ok(e[0].text.includes('npx --yes wize-dev-kit@0.27.0 hydrate'));
  fs.rmSync(kit, { recursive: true, force: true });
});

test('a missing user.toml in a hydrated checkout is an error with the hydrate command', async () => {
  const kit = fakeKit('0.27.0');
  const { wt } = worktreeFixture({ pin: '0.27.0', userToml: null });
  hydrateAs(wt, '0.27.0');
  fs.rmSync(path.join(wt, '.wize/config/user.toml'), { force: true });
  const r = await doctor(wt, { kit });
  assert.ok(errors(r).some(s => /user\.toml/.test(s.text) && s.command === 'npx --yes wize-dev-kit@0.27.0 hydrate'));
  fs.rmSync(kit, { recursive: true, force: true });
});

test('tracked alias files are reported with the update fix', async () => {
  const kit = fakeKit('0.27.0');
  const { primary } = worktreeFixture({ pin: '0.27.0' });
  hydrateAs(primary, '0.27.0');
  fs.mkdirSync(path.join(primary, '.claude/skills/wize'), { recursive: true });
  fs.writeFileSync(path.join(primary, '.claude/skills/wize/SKILL.md'), 'alias');
  git(primary, 'add', '-f', '.claude/skills/wize/SKILL.md');
  git(primary, 'commit', '-q', '-m', 'track alias');

  const r = await doctor(primary, { kit });
  assert.deepStrictEqual(r.leaks.tracked_aliases, ['.claude/skills/wize/SKILL.md']);
  const w = r.suggestions.find(s => /tracked by git/.test(s.text));
  assert.ok(w && w.level === 'warn');
  assert.ok(w.text.includes('npx wize-dev-kit@latest update'));
  fs.rmSync(kit, { recursive: true, force: true });
});

test('a drifted or missing managed .gitignore block warns with the update fix', async () => {
  const kit = fakeKit('0.27.0');
  const { primary } = worktreeFixture({ pin: '0.27.0' });
  const ok = await doctor(primary, { kit });
  assert.strictEqual(ok.leaks.gitignore, 'ok');
  assert.ok(!ok.suggestions.some(s => /gitignore/i.test(s.text)));

  const gi = path.join(primary, '.gitignore');
  fs.writeFileSync(gi, fs.readFileSync(gi, 'utf-8').replace('.wize/.local/\n', ''));
  const drift = await doctor(primary, { kit });
  assert.strictEqual(drift.leaks.gitignore, 'drift');
  const w = drift.suggestions.find(s => /out of date/.test(s.text));
  assert.ok(w && w.level === 'warn' && w.text.includes('npx wize-dev-kit@latest update'));

  fs.writeFileSync(gi, 'node_modules/\n');
  const missing = await doctor(primary, { kit });
  assert.strictEqual(missing.leaks.gitignore, 'missing');
  assert.ok(missing.suggestions.some(s => /no wize-dev-kit managed block/.test(s.text)));
  fs.rmSync(kit, { recursive: true, force: true });
});

test('skew is directional: pin ahead of the binary does not say update', async () => {
  const { primary } = worktreeFixture({ pin: '0.27.0' });
  const ahead = await doctor(primary, { kit: fakeKit('0.26.0') });
  assert.ok(ahead.suggestions.some(s => s.level === 'info' && /newer than this kit/.test(s.text) && s.text.includes('wize-dev-kit@0.27.0')));
  assert.ok(!ahead.suggestions.some(s => /Run `npx wize-dev-kit@latest update`/.test(s.text)), JSON.stringify(ahead.suggestions));

  const behind = await doctor(primary, { kit: fakeKit('0.28.0') });
  const w = behind.suggestions.find(s => /Project pinned 0\.27\.0, this kit is 0\.28\.0/.test(s.text));
  assert.ok(w && w.level === 'warn' && w.text.includes('npx wize-dev-kit@latest update'));

  const same = await doctor(primary, { kit: fakeKit('0.27.0') });
  assert.ok(!same.suggestions.some(s => /pinned/.test(s.text)));
});

test('registry comes from the cache reader only and is skipped by WIZE_DISABLE_UPDATE_CHECK', async () => {
  const { primary } = worktreeFixture({ pin: '0.27.0' });
  let calls = 0;
  const reader = () => { calls++; return '9.9.9'; };

  const off = await doctor(primary, { kit: fakeKit('0.27.0'), env: OFF, getLatestNoWait: reader });
  assert.strictEqual(calls, 0, 'never consulted when disabled');
  assert.strictEqual(off.registryLatest, null);
  assert.match(off.said, /registry\):\s+\(update check disabled\)/);

  const on = await doctor(primary, { kit: fakeKit('0.27.0'), env: {}, getLatestNoWait: reader });
  assert.strictEqual(calls, 1);
  assert.strictEqual(on.registryLatest, '9.9.9');
  assert.ok(on.suggestions.some(s => /Registry has 9\.9\.9/.test(s.text)));
});

test('doctor starts no background registry refresh without a TTY', async () => {
  const { primary } = worktreeFixture({ pin: '0.27.0' });
  const seen = [];
  const reader = ({ env }) => { seen.push(env.WIZE_NO_BG_REFRESH); return null; };
  await doctor(primary, { kit: fakeKit('0.27.0'), env: {}, getLatestNoWait: reader, isTTY: false });
  await doctor(primary, { kit: fakeKit('0.27.0'), env: {}, getLatestNoWait: reader, isTTY: true });
  assert.deepStrictEqual(seen, ['1', undefined]);
});

test('detectPhase accepts sprint-status.yaml and keeps the .md fallback', () => {
  for (const file of ['sprint-status.yaml', 'sprint-status.md']) {
    const root = tmpProject('wize-doc-phase-');
    const w = (rel) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), 'x'); };
    for (const rel of [
      '.wize/planning/brief.md', '.wize/planning/ux/trigger-map.md', '.wize/planning/prd.md',
      '.wize/planning/ux/ux-scenarios.md', '.wize/planning/tech-vision.md', '.wize/solutioning/architecture.md',
      '.wize/solutioning/stories/E01-S01.md', '.wize/implementation/tea/risk-profile.md'
    ]) w(rel);
    assert.match(detectPhase(root), /sprint planning pending/, `${file}: not yet`);
    w(`.wize/implementation/${file}`);
    assert.strictEqual(detectPhase(root), '4-implementation', file);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('opencode counts agents and commands; a full render is not "none"', async () => {
  const root = tmpProject('wize-doc-opencode-');
  fs.mkdirSync(path.join(root, '.opencode/commands'), { recursive: true });
  fs.writeFileSync(path.join(root, '.opencode/commands/wize-x.md'), 'x');
  assert.strictEqual(countAdapterFiles('opencode', root), 1);
  fs.rmSync(root, { recursive: true, force: true });

  const { primary } = worktreeFixture({ pin: '0.27.0', targets: ['opencode', 'generic'] });
  hydrateAs(primary, '0.27.0', ['opencode', 'generic']);
  const r = await doctor(primary, { kit: fakeKit('0.27.0') });
  assert.ok(countAdapterFiles('opencode', primary) > 0);
  assert.doesNotMatch(r.said, /opencode\s+✖ none/);
  assert.match(r.said, /opencode\s+✓ \d+ files/);
});

function spawnDoctor(cwd, args = [], env = {}) {
  return spawnSync(process.execPath, [CLI, 'doctor', ...args], {
    cwd, encoding: 'utf-8', timeout: 60000,
    env: { ...GIT_ENV, XDG_CACHE_HOME: tmpDir('wize-doc-cache-'), ...env }
  });
}

test('doctor --json prints exactly one JSON object and nothing else', () => {
  const { primary } = worktreeFixture({ pin: KIT_VERSION });
  const r = spawnDoctor(primary, ['--json']);
  assert.strictEqual(r.status, 0, r.stderr);
  const lines = r.stdout.trim().split('\n');
  assert.strictEqual(lines.length, 1, r.stdout);
  const o = JSON.parse(lines[0]);
  assert.strictEqual(o.schema, 1);
  assert.strictEqual(o.root, primary);
  assert.strictEqual(o.git.linked, false);
  assert.strictEqual(o.hydration.status, 'missing');
  assert.ok(Array.isArray(o.suggestions) && o.suggestions.some(s => s.level === 'error'));
  assert.strictEqual(o.ok, false);
  assert.strictEqual(o.exit_code, 0);
  assert.ok(!r.stdout.includes('Wize Dev Kit — Doctor'));
});

test('doctor --strict exits 1 on an error-level suggestion and 0 when clean; default is 0', () => {
  const { wt } = worktreeFixture({ pin: KIT_VERSION });
  const plain = spawnDoctor(wt);
  assert.strictEqual(plain.status, 0);
  const bad = spawnDoctor(wt, ['--strict']);
  assert.strictEqual(bad.status, 1, bad.stdout);
  const badJson = spawnDoctor(wt, ['--strict', '--json']);
  assert.strictEqual(badJson.status, 1);
  assert.strictEqual(JSON.parse(badJson.stdout).exit_code, 1);

  const h = spawnSync(process.execPath, [CLI, 'hydrate', '--no-notice'], { cwd: wt, env: GIT_ENV, encoding: 'utf-8' });
  assert.strictEqual(h.status, 0, h.stderr);
  const clean = spawnDoctor(wt, ['--strict']);
  assert.strictEqual(clean.status, 0, clean.stdout);
});

test('doctor in a worktree whose branch lacks the kit warns (kit-not-on-branch) and never says to install', async () => {
  const { primary, wt } = worktreeFixture();
  git(primary, 'add', '-A');
  git(primary, 'commit', '-q', '--allow-empty', '-m', 'kit');
  const empty = git(primary, 'hash-object', '-t', 'tree', '/dev/null');
  git(primary, 'branch', 'older', git(primary, 'commit-tree', empty, '-m', 'old'));
  const old = path.join(path.dirname(primary), 'old');
  git(primary, 'worktree', 'add', '-q', old, 'older');
  const r = await doctor(fs.realpathSync(old));
  assert.strictEqual(errors(r).length, 0, JSON.stringify(r.suggestions));
  const warn = r.suggestions.find(s => /kit-not-on-branch/.test(s.text));
  assert.ok(warn, JSON.stringify(r.suggestions));
  assert.strictEqual(warn.level, 'warn');
  assert.match(warn.text, /merge the kit into this branch, or pass --here/i);
  assert.ok(!r.suggestions.some(s => s.command && /install/.test(s.command)), 'no install dead end');
  assert.ok(wt);
});
