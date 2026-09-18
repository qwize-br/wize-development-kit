// Integration test for `wize-dev-kit version-check` — spawns the actual CLI
// process to prove the dispatcher wiring (subcommand routing, `--json` flag
// parsing, exit code) end to end, on top of the unit tests in
// version-check.test.js and cli-commands.test.js that exercise the
// underlying functions directly. Uses WIZE_DISABLE_UPDATE_CHECK=1 so it
// never touches the network and stays fast/hermetic in CI.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const KIT = path.resolve(__dirname, '..');
const CLI = path.join(KIT, 'tools/installer/wize-cli.js');

test('`wize-dev-kit version-check --json` exits 0 and prints parseable JSON', () => {
  const r = spawnSync(process.execPath, [CLI, 'version-check', '--json'], {
    encoding: 'utf-8',
    timeout: 10000,
    env: { ...process.env, WIZE_DISABLE_UPDATE_CHECK: '1' }
  });

  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}. stderr: ${r.stderr}`);
  const parsed = JSON.parse(r.stdout.trim());
  assert.strictEqual(parsed.disabled, true);
  assert.strictEqual(parsed.updateAvailable, false);
  assert.strictEqual(parsed.latest, null);
  assert.strictEqual(typeof parsed.installed, 'string');
});

test('`wize-dev-kit version-check` (no --json) prints a human-readable line', () => {
  const r = spawnSync(process.execPath, [CLI, 'version-check'], {
    encoding: 'utf-8',
    timeout: 10000,
    env: { ...process.env, WIZE_DISABLE_UPDATE_CHECK: '1' }
  });

  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}. stderr: ${r.stderr}`);
  assert.match(r.stdout, /Update check disabled/);
});

test('`wize-dev-kit help` lists version-check', () => {
  const r = spawnSync(process.execPath, [CLI, 'help'], { encoding: 'utf-8', timeout: 10000 });
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /version-check/);
});
