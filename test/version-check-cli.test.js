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

// ── schema 2: project state and the next action ──

const fs = require('node:fs');
const { tmpDir } = require('./_helpers-git.js');

function vc(cwd, args, env = {}) {
  const base = { ...process.env, XDG_CACHE_HOME: tmpDir('wize-vcc-cache-'), CI: '' };
  const r = spawnSync(process.execPath, [CLI, 'version-check', ...args], {
    cwd, encoding: 'utf-8', timeout: 15000, env: { ...base, WIZE_DISABLE_UPDATE_CHECK: '1', ...env }
  });
  return r;
}

function proj({ pin, rendered = true, userToml = true }) {
  const root = tmpDir('wize-vcc-proj-');
  fs.mkdirSync(path.join(root, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(root, '.wize/config/project.toml'),
    `[project]\nname = "x"\nkit_version = "${pin}"\n\n[install]\nide_targets = ["claude-code", "generic"]\nprofiles = ["core"]\n`);
  if (rendered) {
    fs.mkdirSync(path.join(root, '.claude/skills/wize-x'), { recursive: true });
    fs.mkdirSync(path.join(root, '.claude/skills/wize'), { recursive: true });
    fs.mkdirSync(path.join(root, '.wize/agents'), { recursive: true });
    fs.writeFileSync(path.join(root, '.claude/skills/wize-x/SKILL.md'), 'x');
    fs.writeFileSync(path.join(root, '.claude/skills/wize/SKILL.md'), 'x');
    fs.writeFileSync(path.join(root, '.wize/agents/wize-x.md'), 'x');
    fs.writeFileSync(path.join(root, '.wize/agents/wize.md'), 'x');
  }
  if (userToml) fs.writeFileSync(path.join(root, '.wize/config/user.toml'), 'x');
  return root;
}

function cacheWith(version) {
  const dir = tmpDir('wize-vcc-cache-');
  fs.mkdirSync(path.join(dir, 'wize-dev-kit'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'wize-dev-kit/registry-version.json'), JSON.stringify({ version, fetched_at: Date.now() }));
  return dir;
}

test('--json keeps the legacy keys and adds schema 2', () => {
  const r = vc(proj({ pin: '0.1.0' }), ['--json']);
  assert.strictEqual(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim());
  for (const k of ['installed', 'latest', 'updateAvailable', 'disabled']) assert.ok(k in out, k);
  assert.strictEqual(out.schema, 2);
  assert.strictEqual(out.latest_source, 'none');
  for (const k of ['project', 'git', 'skew', 'action', 'reason', 'commands']) assert.ok(k in out, k);
  assert.strictEqual(out.project.pin, '0.1.0');
  assert.strictEqual(out.skew, 'project-behind');
  assert.strictEqual(out.action, 'none', 'update is opted out under WIZE_DISABLE_UPDATE_CHECK=1');
  assert.ok(!('exitCode' in out));
});

test('--json outside a project: project is null and the action is install', () => {
  const out = JSON.parse(vc(tmpDir('wize-vcc-none-'), ['--json']).stdout.trim());
  assert.strictEqual(out.project, null);
  assert.strictEqual(out.action, 'install');
});

test('--exit-code maps the action to 0/10/11/12/13; the default stays 0', () => {
  const none = proj({ pin: '0.26.1' });
  const code = (root, env) => vc(root, ['--exit-code'], env).status;
  assert.strictEqual(code(none), 0, 'disabled update -> none');
  assert.strictEqual(code(proj({ pin: '0.26.1', rendered: false })), 10);
  assert.strictEqual(code(proj({ pin: '99.0.0' })), 12);
  assert.strictEqual(code(tmpDir('wize-vcc-empty-')), 13);
  const behind = proj({ pin: '0.0.1' });
  assert.strictEqual(code(behind, { WIZE_DISABLE_UPDATE_CHECK: '', XDG_CACHE_HOME: cacheWith('0.0.1') }), 11);
  assert.strictEqual(vc(proj({ pin: '0.26.1', rendered: false }), []).status, 0, 'no flag, no exit code');
});

test('human output names the update and the command', () => {
  const r = vc(proj({ pin: '0.0.1' }), [], { WIZE_DISABLE_UPDATE_CHECK: '', XDG_CACHE_HOME: cacheWith('99.0.0') });
  assert.match(r.stdout, /Update available/);
  assert.match(r.stdout, /npx wize-dev-kit@latest update/);
});

test('human output names the hydrate command when the checkout is not rendered', () => {
  const r = vc(proj({ pin: '0.27.0', rendered: false }), []);
  assert.match(r.stdout, /run `npx --yes wize-dev-kit@0\.27\.0 hydrate`/);
});

test('--refresh --quiet is silent and fills the cache', () => {
  const cache = tmpDir('wize-vcc-refresh-');
  const r = vc(tmpDir('wize-vcc-r-'), ['--refresh', '--quiet'], { WIZE_DISABLE_UPDATE_CHECK: '', XDG_CACHE_HOME: cache });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
});

test('version-check in a linked worktree whose branch lacks the kit says kit-not-on-branch, with no install command', () => {
  const { GIT_ENV, git, makeInstalledRepo, tmpDir } = require('./_helpers-git.js');
  const fs = require('node:fs');
  const base = tmpDir('wize-vc-nokit-');
  const primary = makeInstalledRepo(path.join(base, 'p'));
  git(primary, 'add', '-A');
  git(primary, 'commit', '-q', '--allow-empty', '-m', 'kit');
  const empty = git(primary, 'hash-object', '-t', 'tree', '/dev/null');
  git(primary, 'branch', 'older', git(primary, 'commit-tree', empty, '-m', 'old'));
  const old = path.join(base, 'old');
  git(primary, 'worktree', 'add', '-q', old, 'older');
  const run = (args) => spawnSync(process.execPath, [CLI, 'version-check', ...args], { cwd: old, encoding: 'utf-8', timeout: 20000, env: { ...GIT_ENV, WIZE_DISABLE_UPDATE_CHECK: '1' } });

  const j = run(['--json', '--exit-code']);
  const parsed = JSON.parse(j.stdout.trim());
  assert.strictEqual(parsed.action, 'none');
  assert.strictEqual(parsed.reason, 'kit-not-on-branch');
  assert.strictEqual(parsed.kit_at, fs.realpathSync(primary));
  assert.strictEqual(j.status, 0);

  const t = run([]);
  assert.match(t.stdout, /kit-not-on-branch/);
  assert.match(t.stdout, /merge the kit into this branch, or pass --here/);
  assert.doesNotMatch(t.stdout, /No \.wize\/config\/project\.toml here: run/);
});
