// Tests for project-type classification used by `wize-dev-kit document-project`.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const { classifyProject, loadRequirements, isMultiPart, scorePart } = require(path.join(KIT, 'tools/installer/document-project/classify.js'));
const CSV_PATH = path.join(KIT, 'src/method-skills/1-analysis/wize-document-project/documentation-requirements.csv');

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function touch(root, relPath) {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, '', 'utf-8');
}

// ---------- loadRequirements ----------

test('loadRequirements reads the shipped CSV and returns 11 rows', () => {
  const rows = loadRequirements(CSV_PATH);
  assert.strictEqual(rows.length, 11, `expected 11 project types, got ${rows.length}`);
  const ids = rows.map(r => r.project_type_id);
  for (const expected of ['web', 'mobile', 'backend', 'cli', 'library', 'desktop', 'game', 'data', 'extension', 'infra', 'embedded']) {
    assert.ok(ids.includes(expected), `missing project type: ${expected}`);
  }
});

test('every row has required boolean flags and pattern columns', () => {
  const rows = loadRequirements(CSV_PATH);
  for (const row of rows) {
    assert.ok(row.project_type_id, 'project_type_id required');
    assert.ok(row.key_file_patterns, 'key_file_patterns required');
    assert.ok(row.critical_directories, 'critical_directories required');
    assert.ok(typeof row.requires_api_scan === 'boolean', 'requires_api_scan must be boolean');
    assert.ok(typeof row.requires_data_models === 'boolean', 'requires_data_models must be boolean');
  }
});

// ---------- classifyProject ----------

test('classifyProject identifies wize-dev-kit as cli + library', () => {
  const r = classifyProject(KIT);
  assert.ok(r.projectTypes.includes('cli'), `expected cli, got ${r.projectTypes.join(', ')}`);
  assert.ok(r.projectTypes.includes('library'), `expected library, got ${r.projectTypes.join(', ')}`);
  assert.strictEqual(r.parts.length, 1);
});

test('classifyProject identifies a simple web app', () => {
  const root = tmpDir('wize-web-');
  touch(root, 'package.json');
  touch(root, 'src/index.ts');
  touch(root, 'vite.config.ts');

  const r = classifyProject(root);
  assert.ok(r.projectTypes.includes('web'), `expected web, got ${r.projectTypes.join(', ')}`);
  assert.strictEqual(r.parts.length, 1);

  fs.rmSync(root, { recursive: true, force: true });
});

test('classifyProject identifies a backend service', () => {
  const root = tmpDir('wize-backend-');
  touch(root, 'package.json');
  touch(root, 'src/server.ts');
  touch(root, 'src/routes/users.ts');

  const r = classifyProject(root, { prefer: ['backend'] });
  assert.ok(r.projectTypes.includes('backend'), `expected backend, got ${r.projectTypes.join(', ')}`);

  fs.rmSync(root, { recursive: true, force: true });
});

test('classifyProject detects multi-part client + server', () => {
  const root = tmpDir('wize-multi-');
  touch(root, 'client/package.json');
  touch(root, 'client/vite.config.ts');
  touch(root, 'client/src/main.tsx');
  touch(root, 'server/package.json');
  touch(root, 'server/src/server.ts');
  touch(root, 'server/src/routes/users.ts');

  const r = classifyProject(root);
  assert.ok(r.projectTypes.includes('web'), `expected web in multi-part, got ${r.projectTypes.join(', ')}`);
  assert.ok(r.projectTypes.includes('backend'), `expected backend in multi-part, got ${r.projectTypes.join(', ')}`);
  assert.strictEqual(r.parts.length, 2);

  const partIds = r.parts.map(p => p.part_id).sort();
  assert.deepStrictEqual(partIds, ['client', 'server']);

  fs.rmSync(root, { recursive: true, force: true });
});

test('classifyProject detects mobile project', () => {
  const root = tmpDir('wize-mobile-');
  touch(root, 'pubspec.yaml');
  touch(root, 'lib/main.dart');

  const r = classifyProject(root);
  assert.ok(r.projectTypes.includes('mobile'), `expected mobile, got ${r.projectTypes.join(', ')}`);

  fs.rmSync(root, { recursive: true, force: true });
});

test('classifyProject detects infra project', () => {
  const root = tmpDir('wize-infra-');
  touch(root, 'main.tf');
  touch(root, 'modules/vpc/main.tf');

  const r = classifyProject(root);
  assert.ok(r.projectTypes.includes('infra'), `expected infra, got ${r.projectTypes.join(', ')}`);

  fs.rmSync(root, { recursive: true, force: true });
});

test('classifyProject returns empty types for unknown structure', () => {
  const root = tmpDir('wize-empty-');
  touch(root, 'README.md');

  const r = classifyProject(root);
  assert.deepStrictEqual(r.projectTypes, []);
  assert.strictEqual(r.parts.length, 0);

  fs.rmSync(root, { recursive: true, force: true });
});

// ---------- helpers ----------

test('isMultiPart returns false for monolith', () => {
  const root = tmpDir('wize-mono-');
  touch(root, 'package.json');
  touch(root, 'src/index.ts');

  assert.strictEqual(isMultiPart(root), false);

  fs.rmSync(root, { recursive: true, force: true });
});

test('isMultiPart returns true when known part folders exist', () => {
  const root = tmpDir('wize-mp-');
  touch(root, 'client/package.json');
  touch(root, 'server/package.json');

  assert.strictEqual(isMultiPart(root), true);

  fs.rmSync(root, { recursive: true, force: true });
});
