// Tests for the `wize-dev-kit document-project` CLI subcommand.
// Exercises the command module directly (not the full CLI process) to keep the
// suite fast and avoid spawning AI harnesses.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const { cmdDocumentProject, parseMode } = require(path.join(KIT, 'tools/installer/commands/document-project.js'));

function tmpProject(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function seedInstalledProject(root) {
  fs.mkdirSync(path.join(root, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(root, '.wize/config/project.toml'), `[project]
name = "${path.basename(root)}"
kit_version = "0.3.0"

[install]
profiles = ["core"]
ide_targets = ["claude-code", "generic"]

[language]
communication = "en"
document_output = "en"
`, 'utf-8');
}

function silentLog() { return () => {}; }

// ---------- parseMode ----------

test('parseMode defaults to quick when no args given', () => {
  const r = parseMode([]);
  assert.strictEqual(r.mode, 'quick');
  assert.strictEqual(r.resume, false);
});

test('parseMode recognizes valid modes', () => {
  for (const mode of ['quick', 'initial_scan', 'full_rescan', 'deep_dive']) {
    const r = parseMode([mode]);
    assert.strictEqual(r.mode, mode);
    assert.strictEqual(r.resume, false);
  }
});

test('parseMode recognizes --resume flag', () => {
  const r = parseMode(['initial_scan', '--resume']);
  assert.strictEqual(r.mode, 'initial_scan');
  assert.strictEqual(r.resume, true);
});

test('parseMode rejects unknown mode', () => {
  const r = parseMode(['unknown']);
  assert.strictEqual(r.mode, null);
  assert.ok(/unknown mode/i.test(r.error));
});

// ---------- cmdDocumentProject ----------

test('cmdDocumentProject quick produces the 6 baseline files', () => {
  const root = tmpProject('wize-doc-quick-');
  seedInstalledProject(root);

  const r = cmdDocumentProject({
    kitRoot: KIT,
    projectRoot: root,
    args: [],
    opts: { log: silentLog() }
  });

  assert.strictEqual(r.mode, 'quick');
  assert.strictEqual(r.changed, true);
  assert.ok(fs.existsSync(path.join(root, '.wize/knowledge/document-project/overview.md')));
  assert.ok(fs.existsSync(path.join(root, '.wize/knowledge/document-project/architecture-snapshot.md')));
  assert.ok(fs.existsSync(path.join(root, '.wize/knowledge/document-project/conventions.md')));
  assert.ok(fs.existsSync(path.join(root, '.wize/knowledge/document-project/dependencies.md')));
  assert.ok(fs.existsSync(path.join(root, '.wize/knowledge/document-project/risk-spots.md')));
  assert.ok(fs.existsSync(path.join(root, '.wize/knowledge/document-project/open-questions.md')));

  fs.rmSync(root, { recursive: true, force: true });
});

test('cmdDocumentProject accepts explicit mode', () => {
  const root = tmpProject('wize-doc-mode-');
  seedInstalledProject(root);

  const r = cmdDocumentProject({
    kitRoot: KIT,
    projectRoot: root,
    args: ['initial_scan'],
    opts: { log: silentLog() }
  });

  assert.strictEqual(r.mode, 'initial_scan');
  assert.strictEqual(r.changed, true);

  fs.rmSync(root, { recursive: true, force: true });
});

test('cmdDocumentProject returns error for unknown mode', () => {
  const root = tmpProject('wize-doc-bad-');
  seedInstalledProject(root);

  const r = cmdDocumentProject({
    kitRoot: KIT,
    projectRoot: root,
    args: ['nope'],
    opts: { log: silentLog() }
  });

  assert.strictEqual(r.ok, false);
  assert.ok(/unknown mode/i.test(r.error));
  assert.strictEqual(r.exitCode, 1);

  fs.rmSync(root, { recursive: true, force: true });
});

// ---------- non-destructive baseline (0.27.0) ----------

const { runQuick } = require(path.join(KIT, 'tools/installer/document-project/modes/quick.js'));
const { runInitialScan } = require(path.join(KIT, 'tools/installer/document-project/modes/initial-scan.js'));
const { runFullRescan } = require(path.join(KIT, 'tools/installer/document-project/modes/full-rescan.js'));

const DP = '.wize/knowledge/document-project';
const DATED = '# Conventions\n\n- 2026-03-01: team uses tabs, decided in review.\n';

function seedConventions(root) {
  fs.mkdirSync(path.join(root, DP), { recursive: true });
  fs.writeFileSync(path.join(root, DP, 'conventions.md'), DATED);
}

test('parseMode accepts --force for quick and sets overwrite', () => {
  const r = parseMode(['quick', '--force']);
  assert.strictEqual(r.mode, 'quick');
  assert.strictEqual(r.overwrite, true);
  assert.strictEqual(parseMode(['quick']).overwrite, false);
  assert.strictEqual(parseMode([]).overwrite, false);
});

test('document-project quick keeps an existing conventions.md with a dated bullet', () => {
  const root = tmpProject('wize-doc-keep-');
  seedInstalledProject(root);
  seedConventions(root);
  const lines = [];
  const r = cmdDocumentProject({ kitRoot: KIT, projectRoot: root, args: ['quick'], opts: { log: m => lines.push(m), env: {} } });
  assert.strictEqual(fs.readFileSync(path.join(root, DP, 'conventions.md'), 'utf-8'), DATED);
  assert.deepStrictEqual(r.skipped, ['conventions.md']);
  assert.strictEqual(r.written.length, 5);
  assert.strictEqual(r.changed, true);
  assert.ok(lines.some(l => l === 'Quick baseline: wrote 5, kept 1 existing (use --force to overwrite)'));
  fs.rmSync(root, { recursive: true, force: true });
});

test('document-project quick --force overwrites existing files', () => {
  const root = tmpProject('wize-doc-force-');
  seedInstalledProject(root);
  seedConventions(root);
  const r = cmdDocumentProject({ kitRoot: KIT, projectRoot: root, args: ['quick', '--force'], opts: { log: silentLog(), env: {} } });
  assert.notStrictEqual(fs.readFileSync(path.join(root, DP, 'conventions.md'), 'utf-8'), DATED);
  assert.strictEqual(r.written.length, 6);
  assert.deepStrictEqual(r.skipped, []);
  fs.rmSync(root, { recursive: true, force: true });
});

test('runQuick on a complete baseline writes nothing and reports changed:false', () => {
  const root = tmpProject('wize-doc-full-');
  runQuick(root, { log: silentLog() });
  const before = fs.readFileSync(path.join(root, DP, 'overview.md'), 'utf-8');
  const r = runQuick(root, { log: silentLog() });
  assert.strictEqual(r.changed, false);
  assert.deepStrictEqual(r.written, []);
  assert.strictEqual(r.skipped.length, 6);
  assert.strictEqual(fs.readFileSync(path.join(root, DP, 'overview.md'), 'utf-8'), before);
  fs.rmSync(root, { recursive: true, force: true });
});

test('partial baseline gets only the missing files', () => {
  const root = tmpProject('wize-doc-partial-');
  runQuick(root, { log: silentLog() });
  fs.rmSync(path.join(root, DP, 'risk-spots.md'));
  fs.rmSync(path.join(root, DP, 'dependencies.md'));
  const r = runQuick(root, { log: silentLog() });
  assert.deepStrictEqual(r.written.sort(), ['dependencies.md', 'risk-spots.md']);
  assert.strictEqual(r.skipped.length, 4);
  fs.rmSync(root, { recursive: true, force: true });
});

test('initial_scan keeps existing baseline files; --force overwrites them', () => {
  const root = tmpProject('wize-doc-init-');
  seedInstalledProject(root);
  seedConventions(root);
  runInitialScan(root, { scanLevel: 'quick', log: silentLog() });
  assert.strictEqual(fs.readFileSync(path.join(root, DP, 'conventions.md'), 'utf-8'), DATED);
  assert.ok(fs.existsSync(path.join(root, DP, 'index.md')));
  assert.ok(fs.existsSync(path.join(root, DP, 'overview.md')));

  cmdDocumentProject({ kitRoot: KIT, projectRoot: root, args: ['initial_scan', '--force'], opts: { log: silentLog() } });
  assert.notStrictEqual(fs.readFileSync(path.join(root, DP, 'conventions.md'), 'utf-8'), DATED);
  fs.rmSync(root, { recursive: true, force: true });
});

test('cmdDocumentProject initial_scan without --force keeps the dated bullet', () => {
  const root = tmpProject('wize-doc-init-cmd-');
  seedInstalledProject(root);
  seedConventions(root);
  cmdDocumentProject({ kitRoot: KIT, projectRoot: root, args: ['initial_scan'], opts: { log: silentLog() } });
  assert.strictEqual(fs.readFileSync(path.join(root, DP, 'conventions.md'), 'utf-8'), DATED);
  fs.rmSync(root, { recursive: true, force: true });
});

test('full_rescan still overwrites existing baseline files', () => {
  const root = tmpProject('wize-doc-rescan-');
  seedInstalledProject(root);
  seedConventions(root);
  runFullRescan(root, { scanLevel: 'quick', log: silentLog() });
  assert.notStrictEqual(fs.readFileSync(path.join(root, DP, 'conventions.md'), 'utf-8'), DATED);
  fs.rmSync(root, { recursive: true, force: true });
});

test('WIZE_SKIP_BASELINE=1 makes document-project quick write nothing', () => {
  const root = tmpProject('wize-doc-skip-');
  seedInstalledProject(root);
  const lines = [];
  const r = cmdDocumentProject({ kitRoot: KIT, projectRoot: root, args: ['quick'], opts: { log: m => lines.push(m), env: { WIZE_SKIP_BASELINE: '1' } } });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.changed, false);
  assert.ok(lines.includes('WIZE_SKIP_BASELINE=1: skipped'));
  assert.ok(!fs.existsSync(path.join(root, DP)));
  fs.rmSync(root, { recursive: true, force: true });
});

test('document-project CLI: quick --force parses through the real binary', () => {
  const { spawnSync } = require('node:child_process');
  const root = tmpProject('wize-doc-spawn-');
  seedInstalledProject(root);
  seedConventions(root);
  const bin = path.join(KIT, 'tools/installer/wize-cli.js');
  const env = { ...process.env, WIZE_DISABLE_UPDATE_CHECK: '1' };
  delete env.WIZE_SKIP_BASELINE;
  let r = spawnSync(process.execPath, [bin, 'document-project', 'quick', '--root', root], { env, encoding: 'utf-8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /kept 1 existing/);
  assert.strictEqual(fs.readFileSync(path.join(root, DP, 'conventions.md'), 'utf-8'), DATED);
  r = spawnSync(process.execPath, [bin, 'document-project', 'quick', '--force', '--root', root], { env, encoding: 'utf-8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /wrote 6, kept 0/);
  fs.rmSync(root, { recursive: true, force: true });
});
