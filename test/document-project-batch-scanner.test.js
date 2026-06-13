// Tests for the batch scanner used by `wize-dev-kit document-project`.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const { batchScanner, scanFolder, shouldIgnore, MAX_FILE_LOC } = require(path.join(KIT, 'tools/installer/document-project/batch-scanner.js'));

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function touch(root, relPath, content = '') {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
}

test('shouldIgnore rejects noise directories', () => {
  assert.strictEqual(shouldIgnore('node_modules'), true);
  assert.strictEqual(shouldIgnore('.git'), true);
  assert.strictEqual(shouldIgnore('src'), false);
});

test('scanFolder skips ignored subdirectories', () => {
  const root = tmpDir('wize-scan-folder-');
  touch(root, 'src/index.js', 'x');
  touch(root, 'node_modules/pkg/index.js', 'x');

  const result = scanFolder(path.join(root, 'src'), { ignore: [] });
  assert.strictEqual(result.files.length, 1);
  assert.ok(result.files[0].relative.endsWith('index.js'));

  fs.rmSync(root, { recursive: true, force: true });
});

test('scanFolder flags files above MAX_FILE_LOC', () => {
  const root = tmpDir('wize-scan-large-');
  const big = 'x\n'.repeat(MAX_FILE_LOC + 10);
  touch(root, 'huge.js', big);

  const result = scanFolder(root);
  assert.strictEqual(result.files.length, 1);
  assert.strictEqual(result.files[0].skipped, true);
  assert.strictEqual(result.files[0].loc, MAX_FILE_LOC);

  fs.rmSync(root, { recursive: true, force: true });
});

test('batchScanner returns one result per subfolder', () => {
  const root = tmpDir('wize-batch-');
  touch(root, 'src/index.js', 'x');
  touch(root, 'test/main.test.js', 'x');
  touch(root, 'node_modules/pkg/index.js', 'x');

  const results = batchScanner(root);
  const names = results.map(r => path.basename(r.folder)).sort();
  assert.deepStrictEqual(names, ['src', 'test']);
  assert.strictEqual(results.find(r => r.folder.endsWith('src')).fileCount, 1);

  fs.rmSync(root, { recursive: true, force: true });
});

test('batchScanner respects custom ignore patterns', () => {
  const root = tmpDir('wize-batch-ignore-');
  touch(root, 'src/index.js', 'x');
  touch(root, 'generated/output.js', 'x');

  const results = batchScanner(root, { ignore: ['generated'] });
  const names = results.map(r => path.basename(r.folder)).sort();
  assert.deepStrictEqual(names, ['src']);

  fs.rmSync(root, { recursive: true, force: true });
});
