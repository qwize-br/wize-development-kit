// Tests for tools/installer/baseline.js — detection priority + spawn safety.
// We mock PATH so the test is hermetic and doesn't depend on whatever harnesses
// the local box happens to have installed.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const baselinePath = path.join(KIT, 'tools/installer/baseline.js');

function fakeHarnessBin(dir, name) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, `#!/usr/bin/env bash\necho "${name} ran"\n`, { mode: 0o755 });
  return file;
}

function withFakePath(harnessNames, fn) {
  // Build a temp dir containing only the requested binaries, then prepend it
  // to PATH and isolate from the real environment by pointing PATH to it
  // exclusively (so `which` can't pick up the real claude/codex/opencode).
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-bl-'));
  for (const name of harnessNames) fakeHarnessBin(dir, name);
  const orig = process.env.PATH;
  // Hermetic PATH — only the temp dir; whichSync is pure JS, doesn't need any
  // system binary, so we don't have to leave /usr/bin in (which may itself ship
  // a global `claude` / `codex` from a system-wide npm install and bias the test).
  process.env.PATH = dir;
  try {
    // Reload baseline.js fresh so it doesn't cache anything from previous tests.
    delete require.cache[require.resolve(baselinePath)];
    return fn(require(baselinePath));
  } finally {
    process.env.PATH = orig;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('detectHarnessCli returns empty when nothing is on PATH', () => {
  withFakePath([], (mod) => {
    const found = mod.detectHarnessCli();
    assert.strictEqual(found.length, 0);
  });
});

test('detectHarnessCli finds a single available harness', () => {
  withFakePath(['claude'], (mod) => {
    const found = mod.detectHarnessCli();
    assert.strictEqual(found.length, 1);
    assert.strictEqual(found[0].binary, 'claude');
    assert.match(found[0].path, /\bclaude$/);
  });
});

test('detectHarnessCli surfaces the preferred IDE target first', () => {
  withFakePath(['claude', 'codex', 'opencode'], (mod) => {
    const found = mod.detectHarnessCli({ preferIde: ['opencode', 'claude-code'] });
    assert.strictEqual(found.length, 3);
    assert.strictEqual(found[0].code, 'opencode');
    assert.strictEqual(found[1].code, 'claude-code');
    assert.strictEqual(found[2].code, 'codex');
  });
});

test('defaultPrompt mentions the skill and the target folder', () => {
  const mod = require(baselinePath);
  const p = mod.defaultPrompt();
  assert.ok(p.includes('wize-document-project'));
  assert.ok(p.includes('.wize/knowledge/document-project'));
});

test('manualInstructions(null) gives the no-CLI fallback text', () => {
  const mod = require(baselinePath);
  const text = mod.manualInstructions(null);
  assert.match(text, /No AI harness CLI was detected/);
  assert.match(text, /\/wize-document-project/);
});

test('manualInstructions(harness) returns the harness-specific command', () => {
  const mod = require(baselinePath);
  const claude = mod.HARNESSES.find(h => h.binary === 'claude');
  const text = mod.manualInstructions(claude);
  assert.ok(text.includes('claude -p /wize-document-project'),
    `expected harness-specific command line in: ${text}`);
});

test('runHeadlessBaseline respects WIZE_SKIP_BASELINE=1', () => {
  const mod = require(baselinePath);
  const orig = process.env.WIZE_SKIP_BASELINE;
  process.env.WIZE_SKIP_BASELINE = '1';
  try {
    let said = '';
    const r = mod.runHeadlessBaseline({
      harness: mod.HARNESSES.find(h => h.binary === 'claude'),
      projectRoot: os.tmpdir(),
      prompt: 'noop',
      log: (m) => { said += m; }
    });
    assert.strictEqual(r.skipped, true);
    assert.strictEqual(r.ok, false);
    assert.match(said, /WIZE_SKIP_BASELINE=1/);
  } finally {
    process.env.WIZE_SKIP_BASELINE = orig;
  }
});
