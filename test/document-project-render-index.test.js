// Tests for the master index renderer used by `wize-dev-kit document-project`.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const { renderIndex, link, linkWithMarker } = require(path.join(KIT, 'tools/installer/document-project/render-index.js'));

function tmpProject(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('link produces markdown link', () => {
  assert.strictEqual(link('Architecture', 'architecture.md'), '- [Architecture](./architecture.md)');
});

test('linkWithMarker appends marker when file does not exist', () => {
  const result = linkWithMarker('API', 'api.md', false);
  assert.ok(result.includes('To be generated'));
});

test('renderIndex creates index for single-part project', () => {
  const root = tmpProject('wize-index-single-');
  renderIndex(root, { projectTypes: ['web'], generated: ['overview.md', 'index.md'] });

  const indexPath = path.join(root, '.wize', 'knowledge', 'document-project', 'index.md');
  assert.ok(fs.existsSync(indexPath));
  const content = fs.readFileSync(indexPath, 'utf-8');
  assert.ok(content.includes('Project Documentation Index'));
  assert.ok(content.includes('[Overview](./overview.md)'));

  fs.rmSync(root, { recursive: true, force: true });
});

test('renderIndex marks missing conditional docs', () => {
  const root = tmpProject('wize-index-missing-');
  renderIndex(root, { projectTypes: ['web'] });

  const indexPath = path.join(root, '.wize', 'knowledge', 'document-project', 'index.md');
  const content = fs.readFileSync(indexPath, 'utf-8');
  assert.ok(content.includes('To be generated'));

  fs.rmSync(root, { recursive: true, force: true });
});

test('renderIndex removes marker after doc is generated', () => {
  const root = tmpProject('wize-index-removal-');
  renderIndex(root, { projectTypes: ['web'], generated: ['architecture.md'] });

  const indexPath = path.join(root, '.wize', 'knowledge', 'document-project', 'index.md');
  const content = fs.readFileSync(indexPath, 'utf-8');
  const archLine = content.split('\n').find(l => l.includes('[Architecture]'));
  assert.ok(archLine);
  assert.strictEqual(archLine.includes('To be generated'), false);

  fs.rmSync(root, { recursive: true, force: true });
});

test('renderIndex adapts to multi-part project', () => {
  const root = tmpProject('wize-index-multi-');
  const parts = [
    { part_id: 'client', project_type_id: 'web', root_path: path.join(root, 'client') },
    { part_id: 'server', project_type_id: 'backend', root_path: path.join(root, 'server') }
  ];
  renderIndex(root, { projectTypes: ['web', 'backend'], parts });

  const indexPath = path.join(root, '.wize', 'knowledge', 'document-project', 'index.md');
  const content = fs.readFileSync(indexPath, 'utf-8');
  assert.ok(content.includes('multi-part'));
  assert.ok(content.includes('Architecture — client'));
  assert.ok(content.includes('Architecture — server'));

  fs.rmSync(root, { recursive: true, force: true });
});

test('renderIndex lists deep-dive files', () => {
  const root = tmpProject('wize-index-dive-');
  renderIndex(root, { projectTypes: ['web'], deepDiveFiles: ['deep-dive-lib.md'] });

  const indexPath = path.join(root, '.wize', 'knowledge', 'document-project', 'index.md');
  const content = fs.readFileSync(indexPath, 'utf-8');
  assert.ok(content.includes('Deep-Dive Docs'));
  assert.ok(content.includes('[lib](./deep-dive-lib.md)'));

  fs.rmSync(root, { recursive: true, force: true });
});
