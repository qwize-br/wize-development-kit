'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const { readToml, parseToml, setTomlValue, rewriteTomlValue, loadProjectConfig } = require(path.join(KIT, 'tools/installer/toml.js'));

function tmpFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-toml-'));
  const file = path.join(dir, 'project.toml');
  fs.writeFileSync(file, content, 'utf-8');
  return file;
}

test('a # inside a quoted string is kept; a trailing comment is dropped', () => {
  const t = parseToml('[project]\nname = "C# kit" # note\nother = \'a#b\'\nkit_version = "0.1.0"\n');
  assert.strictEqual(t.project.name, 'C# kit');
  assert.strictEqual(t.project.other, 'a#b');
  assert.strictEqual(t.project.kit_version, '0.1.0');
});

test('readToml returns {} for a missing file; loadProjectConfig reads project.toml', () => {
  assert.deepStrictEqual(readToml('/nonexistent/x.toml'), {});
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-toml-cfg-'));
  fs.mkdirSync(path.join(dir, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.wize/config/project.toml'), '[project]\nname = "x"\n');
  assert.strictEqual(loadProjectConfig(dir).project.name, 'x');
});

test('setTomlValue rewrites in place and preserves the trailing comment', () => {
  const file = tmpFile('[project]\nname = "x"\nkit_version = "0.1.0"   # pinned by CI\n\n[install]\nkit_version = "other"\n');
  assert.strictEqual(setTomlValue(file, 'project', 'kit_version', '0.2.0'), true);
  const out = fs.readFileSync(file, 'utf-8');
  assert.match(out, /^kit_version = "0\.2\.0"   # pinned by CI$/m);
  assert.match(out, /\[install\]\nkit_version = "other"/, 'other sections stay untouched');
});

test('setTomlValue inserts a missing key right after the section header', () => {
  const file = tmpFile('[project]\nname = "x"\n\n[install]\nprofiles = ["core"]\n');
  assert.strictEqual(setTomlValue(file, 'project', 'kit_version', '0.2.0'), true);
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  assert.strictEqual(lines[0], '[project]');
  assert.strictEqual(lines[1], 'kit_version = "0.2.0"');
  assert.strictEqual(readToml(file).project.kit_version, '0.2.0');
});

test('setTomlValue returns false for a missing section, missing file, non-string key or unsafe value', () => {
  const file = tmpFile('[install]\nprofiles = ["core"]\n[project]\nretries = 3\n');
  const before = fs.readFileSync(file, 'utf-8');
  assert.strictEqual(setTomlValue(file, 'nope', 'kit_version', '1'), false);
  assert.strictEqual(setTomlValue(file, 'project', 'retries', '4'), false);
  assert.strictEqual(setTomlValue(file, 'project', 'kit_version', 'a"b'), false);
  assert.strictEqual(setTomlValue('/nonexistent/x.toml', 'project', 'k', 'v'), false);
  assert.strictEqual(fs.readFileSync(file, 'utf-8'), before, 'failed writes leave the file alone');
});

test('setTomlValue keeps CRLF files CRLF', () => {
  const file = tmpFile('[project]\r\nname = "x"\r\n');
  assert.strictEqual(setTomlValue(file, 'project', 'kit_version', '0.2.0'), true);
  assert.strictEqual(fs.readFileSync(file, 'utf-8'), '[project]\r\nkit_version = "0.2.0"\r\nname = "x"\r\n');
});

test('rewriteTomlValue is pure: keeps comments, inserts a missing key, refuses unsafe input', () => {
  const src = '[project]\nname = "x"\nkit_version = "0.1.0"  # pinned\n\n[other]\nkit_version = "keep"\n';
  assert.strictEqual(
    rewriteTomlValue(src, 'project', 'kit_version', '0.2.0'),
    '[project]\nname = "x"\nkit_version = "0.2.0"  # pinned\n\n[other]\nkit_version = "keep"\n'
  );
  assert.strictEqual(rewriteTomlValue(src, 'project', 'kit_version', '0.1.0'), src);
  assert.match(rewriteTomlValue('[project]\nname = "x"\n', 'project', 'kit_version', '1.0.0'), /^\[project\]\nkit_version = "1\.0\.0"\nname/);
  assert.strictEqual(rewriteTomlValue('[a]\nx = 1\n', 'project', 'kit_version', '1.0.0'), null, 'missing section');
  assert.strictEqual(rewriteTomlValue('[project]\nkit_version = 5\n', 'project', 'kit_version', '1.0.0'), null, 'non-string value');
  assert.strictEqual(rewriteTomlValue(src, 'project', 'kit_version', 'a"b'), null, 'quote in value');
});
