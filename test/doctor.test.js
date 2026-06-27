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
    'antigravity': '.agent/skills',
    'codex':       '.codex/skills',
    'kimi-code':   '.kimi/skills',
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
    opts: { log: (m) => { said += m + '\n'; } }
  });
  assert.ok(said.includes('Wize Dev Kit — Doctor'), 'should print header');
  assert.ok(said.includes('Project'), 'should print Project section');
  assert.ok(said.includes('IDE Adapters'), 'should print adapters section');
  assert.ok(said.includes('Suggestions'), 'should print suggestions section');
  assert.ok(Array.isArray(out.suggestions), 'should return suggestions array');
  fs.rmSync(root, { recursive: true, force: true });
});
