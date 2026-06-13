// Tests for project-scan-report state file.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const {
  statePath,
  initState,
  loadState,
  updateState,
  archiveOldState,
  stateAgeDays
} = require(path.join(KIT, 'tools/installer/document-project/state.js'));

function tmpProject(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function ensureWize(root) {
  fs.mkdirSync(path.join(root, '.wize', 'knowledge', 'document-project'), { recursive: true });
}

test('statePath returns expected location', () => {
  const root = tmpProject('wize-state-path-');
  const p = statePath(root);
  assert.ok(p.endsWith('.wize/knowledge/document-project/project-scan-report.json'));
  fs.rmSync(root, { recursive: true, force: true });
});

test('initState creates a valid state file', () => {
  const root = tmpProject('wize-state-init-');
  ensureWize(root);

  const state = initState(root, 'initial_scan', 'deep');
  assert.strictEqual(state.mode, 'initial_scan');
  assert.strictEqual(state.scan_level, 'deep');
  assert.ok(state.timestamps.started);
  assert.ok(state.timestamps.last_updated);
  assert.strictEqual(state.current_step, 'step_1');

  assert.ok(fs.existsSync(statePath(root)));

  fs.rmSync(root, { recursive: true, force: true });
});

test('loadState reads an existing state file', () => {
  const root = tmpProject('wize-state-load-');
  ensureWize(root);
  initState(root, 'quick', 'quick');

  const loaded = loadState(root);
  assert.ok(loaded);
  assert.strictEqual(loaded.mode, 'quick');

  fs.rmSync(root, { recursive: true, force: true });
});

test('loadState returns null when state file is missing', () => {
  const root = tmpProject('wize-state-missing-');
  assert.strictEqual(loadState(root), null);
  fs.rmSync(root, { recursive: true, force: true });
});

test('loadState returns null when state file is invalid JSON', () => {
  const root = tmpProject('wize-state-bad-');
  ensureWize(root);
  fs.writeFileSync(statePath(root), 'not json', 'utf-8');

  assert.strictEqual(loadState(root), null);

  fs.rmSync(root, { recursive: true, force: true });
});

test('updateState merges patch into existing state', () => {
  const root = tmpProject('wize-state-update-');
  ensureWize(root);
  initState(root, 'initial_scan', 'deep');

  const state = updateState(root, {
    current_step: 'step_2',
    completed_steps: [{ step: 'step_1', status: 'completed', timestamp: new Date().toISOString(), summary: 'done' }],
    outputs_generated: ['overview.md']
  });

  assert.strictEqual(state.current_step, 'step_2');
  assert.strictEqual(state.completed_steps.length, 1);
  assert.ok(state.outputs_generated.includes('overview.md'));
  assert.ok(state.outputs_generated.includes('project-scan-report.json'));

  const loaded = loadState(root);
  assert.strictEqual(loaded.current_step, 'step_2');

  fs.rmSync(root, { recursive: true, force: true });
});

test('archiveOldState moves state to archive and removes active file', () => {
  const root = tmpProject('wize-state-archive-');
  ensureWize(root);
  initState(root, 'initial_scan', 'deep');

  const archived = archiveOldState(root);
  assert.strictEqual(archived, true);
  assert.strictEqual(fs.existsSync(statePath(root)), false);

  const archiveDir = path.join(root, '.wize', 'knowledge', 'document-project', '_archive');
  const files = fs.readdirSync(archiveDir);
  assert.strictEqual(files.length, 1);
  assert.ok(files[0].startsWith('project-scan-report-'));

  fs.rmSync(root, { recursive: true, force: true });
});

test('archiveOldState returns false when no state exists', () => {
  const root = tmpProject('wize-state-noarchive-');
  ensureWize(root);
  assert.strictEqual(archiveOldState(root), false);
  fs.rmSync(root, { recursive: true, force: true });
});

test('stateAgeDays returns age for old state', () => {
  const yesterday = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
  const age = stateAgeDays({ timestamps: { last_updated: yesterday } });
  assert.strictEqual(age, 1);
});

test('stateAgeDays returns null for invalid state', () => {
  assert.strictEqual(stateAgeDays(null), null);
  assert.strictEqual(stateAgeDays({}), null);
});
