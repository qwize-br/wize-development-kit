// Integration tests for `wize-dev-kit document-project` modes.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const { cmdDocumentProject, parseMode } = require(path.join(KIT, 'tools/installer/commands/document-project.js'));
const { runInitialScan } = require(path.join(KIT, 'tools/installer/document-project/modes/initial-scan.js'));
const { runFullRescan } = require(path.join(KIT, 'tools/installer/document-project/modes/full-rescan.js'));
const { runDeepDive, resolveTarget } = require(path.join(KIT, 'tools/installer/document-project/modes/deep-dive.js'));

function tmpProject(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function seedProject(root) {
  fs.mkdirSync(path.join(root, '.wize', 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, '.wize', 'config', 'project.toml'), `[project]
name = "${path.basename(root)}"
kit_version = "0.3.0"
`, 'utf-8');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: path.basename(root), version: '1.0.0' }), 'utf-8');
}

function silentLog() { return () => {}; }

// ---------- parseMode integration ----------

test('parseMode extracts --target for deep_dive', () => {
  const r = parseMode(['deep_dive', '--target', 'src/tools']);
  assert.strictEqual(r.mode, 'deep_dive');
  assert.strictEqual(r.target, 'src/tools');
});

test('parseMode accepts scan level after mode', () => {
  const r = parseMode(['initial_scan', 'deep']);
  assert.strictEqual(r.mode, 'initial_scan');
  assert.strictEqual(r.scanLevel, 'deep');
});

// ---------- initial_scan ----------

test('runInitialScan quick writes baseline + index', () => {
  const root = tmpProject('wize-init-quick-');
  seedProject(root);

  const r = runInitialScan(root, { scanLevel: 'quick', log: silentLog() });
  assert.strictEqual(r.mode, 'initial_scan');
  assert.ok(fs.existsSync(path.join(root, '.wize', 'knowledge', 'document-project', 'index.md')));
  assert.ok(fs.existsSync(path.join(root, '.wize', 'knowledge', 'document-project', 'overview.md')));

  fs.rmSync(root, { recursive: true, force: true });
});

test('runInitialScan deep includes batch results in state', () => {
  const root = tmpProject('wize-init-deep-');
  seedProject(root);
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'index.js'), 'console.log("hi");\n', 'utf-8');

  const r = runInitialScan(root, { scanLevel: 'deep', log: silentLog() });
  assert.strictEqual(r.scanLevel, 'deep');

  const statePath = path.join(root, '.wize', 'knowledge', 'document-project', 'project-scan-report.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  assert.ok(state.findings.batches_completed.length >= 1);

  fs.rmSync(root, { recursive: true, force: true });
});

// ---------- full_rescan ----------

test('runFullRescan archives old state and re-runs', () => {
  const root = tmpProject('wize-rescan-');
  seedProject(root);
  runInitialScan(root, { scanLevel: 'quick', log: silentLog() });

  const before = fs.readFileSync(path.join(root, '.wize', 'knowledge', 'document-project', 'project-scan-report.json'), 'utf-8');
  runFullRescan(root, { scanLevel: 'quick', log: silentLog() });

  const archiveDir = path.join(root, '.wize', 'knowledge', 'document-project', '_archive');
  assert.ok(fs.existsSync(archiveDir));
  const archives = fs.readdirSync(archiveDir);
  assert.strictEqual(archives.length, 1);

  const after = fs.readFileSync(path.join(root, '.wize', 'knowledge', 'document-project', 'project-scan-report.json'), 'utf-8');
  assert.notStrictEqual(before, after);

  fs.rmSync(root, { recursive: true, force: true });
});

// ---------- deep_dive ----------

test('runDeepDive generates deep-dive file for target folder', () => {
  const root = tmpProject('wize-dive-');
  seedProject(root);
  fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'lib', 'utils.js'), 'module.exports = { add: (a,b) => a+b };\n', 'utf-8');

  const r = runDeepDive(root, { target: 'lib', log: silentLog() });
  assert.strictEqual(r.ok, true);
  assert.ok(r.written[0].startsWith('deep-dive-'));
  assert.ok(fs.existsSync(path.join(root, '.wize', 'knowledge', 'document-project', r.written[0])));

  fs.rmSync(root, { recursive: true, force: true });
});

test('runDeepDive resolves feature target by name', () => {
  const root = tmpProject('wize-dive-feature-');
  seedProject(root);
  fs.mkdirSync(path.join(root, 'src', 'auth'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'auth', 'login.js'), 'export function login() {}\n', 'utf-8');

  const r = runDeepDive(root, { target: 'feature:auth', log: silentLog() });
  assert.strictEqual(r.ok, true);
  assert.ok(r.written[0].startsWith('deep-dive-'));

  fs.rmSync(root, { recursive: true, force: true });
});

test('resolveTarget resolves api_group and component_group prefixes', () => {
  const root = tmpProject('wize-dive-types-');
  seedProject(root);
  fs.mkdirSync(path.join(root, 'src', 'routes'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'routes', 'users.js'), 'module.exports = {}\n', 'utf-8');
  fs.mkdirSync(path.join(root, 'src', 'components'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'components', 'Button.js'), 'export default function Button() {}\n', 'utf-8');

  const api = resolveTarget(root, 'api_group:users');
  assert.strictEqual(api.targetType, 'api_group');
  assert.strictEqual(api.files.length, 1);

  const comp = resolveTarget(root, 'component_group:Button');
  assert.strictEqual(comp.targetType, 'component_group');
  assert.strictEqual(comp.files.length, 1);

  fs.rmSync(root, { recursive: true, force: true });
});

test('runDeepDive returns error when target is missing', () => {
  const root = tmpProject('wize-dive-missing-');
  seedProject(root);

  const r = runDeepDive(root, { target: 'missing', log: silentLog() });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.exitCode, 1);

  fs.rmSync(root, { recursive: true, force: true });
});

// ---------- CLI dispatcher ----------

test('cmdDocumentProject initial_scan via dispatcher', () => {
  const root = tmpProject('wize-cli-init-');
  seedProject(root);

  const r = cmdDocumentProject({ kitRoot: KIT, projectRoot: root, args: ['initial_scan', 'deep'], opts: { log: silentLog() } });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.mode, 'initial_scan');
  assert.ok(fs.existsSync(path.join(root, '.wize', 'knowledge', 'document-project', 'index.md')));

  fs.rmSync(root, { recursive: true, force: true });
});

test('cmdDocumentProject deep_dive via dispatcher', () => {
  const root = tmpProject('wize-cli-dive-');
  seedProject(root);
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'main.js'), 'module.exports = {};\n', 'utf-8');

  const r = cmdDocumentProject({ kitRoot: KIT, projectRoot: root, args: ['deep_dive', '--target', 'src'], opts: { log: silentLog() } });
  assert.strictEqual(r.ok, true);
  assert.ok(r.written[0].startsWith('deep-dive-'));

  fs.rmSync(root, { recursive: true, force: true });
});
