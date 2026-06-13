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
