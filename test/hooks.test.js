// `hooks install|print` and the managed .wize/hooks/hydrate.sh. CLI behavior is
// tested by spawn (the CLI runs main() at load); the script runs under sh with a
// stub npx so nothing reaches the network.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  GIT_ENV, git, CLI, KIT, tmpDir, makeInstalledRepo, addWorktree
} = require('./_helpers-git.js');
const hooks = require(path.join(KIT, 'tools/installer/commands/hooks.js'));
const { planTrackedChanges } = require(path.join(KIT, 'tools/installer/commands/update.js'));

const SCRIPT_REL = '.wize/hooks/hydrate.sh';

function runCli(cwd, args, env = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf-8', env: { ...GIT_ENV, ...env } });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// An npx that only logs its argv and exits `status`.
function recordingNpx(dir, status = 0) {
  fs.mkdirSync(dir, { recursive: true });
  const log = path.join(dir, 'npx.log');
  fs.writeFileSync(path.join(dir, 'npx'), `#!/bin/sh\necho "$@" >> "${log}"\nexit ${status}\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'npm'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  return { dir, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf-8').split('\n').filter(Boolean) : []) };
}

function runScript(cwd, stub, env = {}) {
  const r = spawnSync('sh', [path.join(cwd, SCRIPT_REL)], {
    cwd,
    encoding: 'utf-8',
    env: {
      ...GIT_ENV,
      PATH: `${stub.dir}:${process.env.PATH}`,
      WIZE_HOOK_BACKOFF_S: '0',
      ORCA_WORKTREE_PATH: '',
      ORCA_ROOT_PATH: '',
      CLAUDE_PROJECT_DIR: '',
      ...env
    }
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function installedProject(prefix, opts) {
  const repo = makeInstalledRepo(path.join(tmpDir(prefix), 'repo'), opts);
  const r = runCli(repo, ['hooks', 'install', '--claude']);
  assert.strictEqual(r.code, 0, r.err);
  return repo;
}

// ---- install ---------------------------------------------------------------

test('hooks install --claude writes the script and a SessionStart entry', () => {
  const repo = makeInstalledRepo(path.join(tmpDir('wize-hk-claude-'), 'repo'));
  const r = runCli(repo, ['hooks', 'install', '--claude']);
  assert.strictEqual(r.code, 0, r.err);
  const script = path.join(repo, SCRIPT_REL);
  const text = fs.readFileSync(script, 'utf-8');
  assert.ok(text.split('\n').includes('# wize-dev-kit managed hook v1'));
  assert.ok(fs.statSync(script).mode & 0o100, 'executable');
  const settings = JSON.parse(fs.readFileSync(path.join(repo, '.claude/settings.json'), 'utf-8'));
  assert.deepStrictEqual(settings.hooks.SessionStart, [{
    matcher: 'startup',
    hooks: [{ type: 'command', command: 'sh "$CLAUDE_PROJECT_DIR"/.wize/hooks/hydrate.sh', timeout: 180 }]
  }]);
  assert.strictEqual(spawnSync('sh', ['-n', script]).status, 0);
});

test('hooks install is idempotent', () => {
  const repo = installedProject('wize-hk-idem-');
  const before = fs.readFileSync(path.join(repo, '.claude/settings.json'), 'utf-8');
  const r = runCli(repo, ['hooks', 'install', '--claude']);
  assert.strictEqual(r.code, 0);
  assert.strictEqual(fs.readFileSync(path.join(repo, '.claude/settings.json'), 'utf-8'), before);
  assert.match(r.out, /unchanged \.claude\/settings\.json/);
  assert.strictEqual(JSON.parse(before).hooks.SessionStart.length, 1);
});

test('an existing settings.json keeps its other keys and hooks', () => {
  const repo = makeInstalledRepo(path.join(tmpDir('wize-hk-merge-'), 'repo'));
  fs.mkdirSync(path.join(repo, '.claude'), { recursive: true });
  const original = {
    permissions: { allow: ['Bash(ls)'] },
    hooks: {
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo pre' }] }],
      SessionStart: [{ matcher: 'resume', hooks: [{ type: 'command', command: 'echo mine' }] }]
    }
  };
  fs.writeFileSync(path.join(repo, '.claude/settings.json'), JSON.stringify(original));
  assert.strictEqual(runCli(repo, ['hooks', 'install', '--claude']).code, 0);
  const next = JSON.parse(fs.readFileSync(path.join(repo, '.claude/settings.json'), 'utf-8'));
  assert.deepStrictEqual(next.permissions, original.permissions);
  assert.deepStrictEqual(next.hooks.PreToolUse, original.hooks.PreToolUse);
  assert.strictEqual(next.hooks.SessionStart.length, 2);
  assert.deepStrictEqual(next.hooks.SessionStart[0], original.hooks.SessionStart[0]);
  assert.ok(JSON.stringify(next.hooks.SessionStart[1]).includes('.wize/hooks/hydrate.sh'));
});

test('an existing entry that already runs the script is not duplicated', () => {
  const merged = hooks.mergeClaudeSettings(JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'sh .wize/hooks/hydrate.sh' }] }] }
  }));
  assert.ok(merged.ok && !merged.changed);
});

test('invalid settings.json -> exit 1, nothing written', () => {
  const repo = makeInstalledRepo(path.join(tmpDir('wize-hk-bad-'), 'repo'));
  fs.mkdirSync(path.join(repo, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.claude/settings.json'), '{ not json');
  const r = runCli(repo, ['hooks', 'install', '--claude']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /not valid JSON/);
  assert.strictEqual(fs.readFileSync(path.join(repo, '.claude/settings.json'), 'utf-8'), '{ not json');
  assert.ok(!fs.existsSync(path.join(repo, SCRIPT_REL)), 'refuses before writing the script');
  const shapes = ['[]', '{"hooks":[]}', '{"hooks":{"SessionStart":{}}}'];
  for (const s of shapes) assert.strictEqual(hooks.mergeClaudeSettings(s).ok, false, s);
});

test('install with no flag prints usage and exits 1, writing nothing', () => {
  const repo = makeInstalledRepo(path.join(tmpDir('wize-hk-noflag-'), 'repo'));
  const r = runCli(repo, ['hooks', 'install']);
  assert.strictEqual(r.code, 1);
  assert.match(r.err, /Usage:/);
  assert.ok(!fs.existsSync(path.join(repo, '.wize/hooks')));
  assert.strictEqual(runCli(repo, ['hooks']).code, 1);
  assert.strictEqual(runCli(repo, ['hooks', 'nope']).code, 1);
});

test('--cursor writes worktrees.json once and prints the line for an existing file', () => {
  const repo = makeInstalledRepo(path.join(tmpDir('wize-hk-cursor-'), 'repo'));
  assert.strictEqual(runCli(repo, ['hooks', 'install', '--cursor']).code, 0);
  const file = path.join(repo, '.cursor/worktrees.json');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(file, 'utf-8')), { 'setup-worktree': ['sh .wize/hooks/hydrate.sh'] });

  fs.writeFileSync(file, '{"setup-worktree":["npm i"]}');
  const r = runCli(repo, ['hooks', 'install', '--cursor']);
  assert.strictEqual(r.code, 0);
  assert.strictEqual(fs.readFileSync(file, 'utf-8'), '{"setup-worktree":["npm i"]}');
  assert.ok(r.out.includes('"sh .wize/hooks/hydrate.sh"'));
});

test('--github-action writes a weekly workflow with the right permissions, once', () => {
  const repo = makeInstalledRepo(path.join(tmpDir('wize-hk-gha-'), 'repo'));
  assert.strictEqual(runCli(repo, ['hooks', 'install', '--github-action']).code, 0);
  const file = path.join(repo, '.github/workflows/wize-kit-update.yml');
  const y = fs.readFileSync(file, 'utf-8');
  assert.match(y, /^on:\n {2}schedule:\n {4}- cron: '17 6 \* \* 1'\n {2}workflow_dispatch:/m);
  assert.match(y, /^permissions:\n {2}contents: write\n {2}pull-requests: write/m);
  assert.match(y, /fetch-depth: 0/);
  assert.match(y, /node-version: 20/);
  assert.match(y, /github-actions\[bot\]/);
  assert.match(y, /GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.match(y, /npx --yes wize-dev-kit@latest update --pr --base "origin\/\$BASE_BRANCH"/);
  assert.match(y, /BASE_BRANCH: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(y, /GITHUB_TOKEN do not trigger other workflows/);
  assert.match(y, /create and approve pull\s+(#\s*)?requests/);

  fs.writeFileSync(file, '# mine\n');
  runCli(repo, ['hooks', 'install', '--github-action']);
  assert.strictEqual(fs.readFileSync(file, 'utf-8'), '# mine\n');
});

test('an unmanaged hydrate.sh is never overwritten', () => {
  const repo = makeInstalledRepo(path.join(tmpDir('wize-hk-own-'), 'repo'));
  fs.mkdirSync(path.join(repo, '.wize/hooks'), { recursive: true });
  fs.writeFileSync(path.join(repo, SCRIPT_REL), '#!/bin/sh\necho mine\n');
  const r = runCli(repo, ['hooks', 'install', '--claude']);
  assert.strictEqual(r.code, 1);
  assert.strictEqual(fs.readFileSync(path.join(repo, SCRIPT_REL), 'utf-8'), '#!/bin/sh\necho mine\n');
  assert.ok(!fs.existsSync(path.join(repo, '.claude/settings.json')));
});

// ---- print -----------------------------------------------------------------

test('hooks print writes nothing and covers every target', () => {
  const dir = tmpDir('wize-hk-print-');
  for (const t of hooks.PRINT_TARGETS) {
    const r = runCli(dir, ['hooks', 'print', t]);
    assert.strictEqual(r.code, 0, `${t}: ${r.err}`);
    assert.ok(r.out.includes('hydrate.sh') || t === 'github-action', t);
  }
  assert.deepStrictEqual(fs.readdirSync(dir), []);
  const orca = runCli(dir, ['hooks', 'print', 'orca']).out;
  assert.match(orca, /setup: sh \.wize\/hooks\/hydrate\.sh/);
  assert.match(orca, /setupAgentStartupPolicy: wait-for-setup/);
  assert.match(orca, /overrides orca\.yaml/);
  assert.match(orca, /\.worktreeinclude/);
  assert.match(runCli(dir, ['hooks', 'print', 'github-action']).out, /update --pr/);
});

test('hooks print with an unknown or missing target exits 1 and lists the targets', () => {
  const dir = tmpDir('wize-hk-print-bad-');
  for (const args of [['hooks', 'print', 'vim'], ['hooks', 'print']]) {
    const r = runCli(dir, args);
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /orca, claude, cursor, codex, github-action/);
  }
  assert.deepStrictEqual(fs.readdirSync(dir), []);
});

// ---- the script --------------------------------------------------------------

function renderedWorktree(prefix, pin) {
  const repo = makeInstalledRepo(path.join(tmpDir(prefix), 'repo'), { pin });
  runCli(repo, ['hooks', 'install', '--claude']);
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'hooks');
  const wt = addWorktree(repo, path.join(path.dirname(repo), 'wt'), 'feature/x');
  return { repo, wt };
}

test('script: pin 0.27.0 runs hydrate --quiet, and copies user.toml from the primary', () => {
  const { wt } = renderedWorktree('wize-hk-s27-', '0.27.0');
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  const r = runScript(wt, stub);
  assert.strictEqual(r.code, 0);
  assert.deepStrictEqual(stub.calls(), ['--yes --prefer-offline wize-dev-kit@0.27.0 hydrate --quiet']);
  assert.strictEqual(fs.readFileSync(path.join(wt, '.wize/config/user.toml'), 'utf-8'), 'name = "primary"\n');
  assert.strictEqual(r.out, '', 'stdout stays empty so a SessionStart hook adds nothing to the context');
});

test('script: pin 0.26.1 runs sync without --quiet', () => {
  const { wt } = renderedWorktree('wize-hk-s26-', '0.26.1');
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  assert.strictEqual(runScript(wt, stub).code, 0);
  assert.deepStrictEqual(stub.calls(), ['--yes --prefer-offline wize-dev-kit@0.26.1 sync']);
});

test('script: a failing npx is tried 3 times, then reports and still exits 0', () => {
  const { wt } = renderedWorktree('wize-hk-fail-', '0.27.0');
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'), 1);
  const r = runScript(wt, stub);
  assert.strictEqual(r.code, 0);
  assert.strictEqual(stub.calls().length, 3);
  assert.match(r.err, /wize: hydrate failed; run: npx wize-dev-kit@0\.27\.0 hydrate/);
});

test('script: an invalid pin falls back to @latest, three attempts, exit 0', () => {
  const repo = installedProject('wize-hk-badpin-', { pin: '0.27.0' });
  fs.writeFileSync(path.join(repo, '.wize/config/project.toml'), '[project]\nkit_version = "not;a pin"\n');
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'), 1);
  const r = runScript(repo, stub);
  assert.strictEqual(r.code, 0);
  assert.strictEqual(stub.calls().length, 3);
  assert.ok(stub.calls().every(c => c.startsWith('--yes wize-dev-kit@latest ')));
  assert.match(r.err, /npx wize-dev-kit@latest /);
});

test('script: a pin that only looks like a version (git-like spec) falls back to @latest', () => {
  const repo = installedProject('wize-hk-gitpin-', { pin: '0.27.0' });
  for (const bad of ['1.2.3.4:evil/repo', '1.2.3/../x', '1.2.3 --foo']) {
    fs.writeFileSync(path.join(repo, '.wize/config/project.toml'), `[project]\nkit_version = "${bad}"\n`);
    const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'), 1);
    assert.strictEqual(runScript(repo, stub).code, 0);
    assert.ok(stub.calls().length === 3 && stub.calls().every(c => c.startsWith('--yes wize-dev-kit@latest ')), bad);
  }
  fs.writeFileSync(path.join(repo, '.wize/config/project.toml'), '[project]\nkit_version = "0.27.0-rc.1"\n');
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  runScript(repo, stub);
  assert.match(stub.calls()[0], /wize-dev-kit@0\.27\.0-rc\.1 /, 'a prerelease pin is still accepted');
});

test('script: each npx attempt gets a bounded npm fetch timeout', () => {
  const repo = installedProject('wize-hk-fetcht-', { pin: '0.27.0' });
  const dir = path.join(tmpDir('wize-hk-bin-'), 'bin');
  fs.mkdirSync(dir, { recursive: true });
  const log = path.join(dir, 'env.log');
  fs.writeFileSync(path.join(dir, 'npx'), `#!/bin/sh\necho "$npm_config_fetch_timeout $npm_config_fetch_retries" >> "${log}"\nexit 0\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'npm'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  runScript(repo, { dir, calls: () => [] });
  assert.strictEqual(fs.readFileSync(log, 'utf-8').trim(), '20000 0');
});

test('script: the fast path makes zero npx calls once the marker matches', () => {
  const repo = installedProject('wize-hk-fast-', { pin: '0.27.0', targets: ['claude-code'] });
  fs.mkdirSync(path.join(repo, '.claude/skills/wize-help'), { recursive: true });
  fs.mkdirSync(path.join(repo, '.claude/skills/wize'), { recursive: true });
  fs.mkdirSync(path.join(repo, '.wize/.local'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.wize/.local/hydrated.json'), JSON.stringify({ schema: 1, kit_version: '0.27.0' }, null, 2));
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  assert.strictEqual(runScript(repo, stub).code, 0);
  assert.deepStrictEqual(stub.calls(), []);

  fs.writeFileSync(path.join(repo, '.wize/.local/hydrated.json'), JSON.stringify({ schema: 1, kit_version: '0.26.0' }, null, 2));
  runScript(repo, stub);
  assert.strictEqual(stub.calls().length, 1, 'a stale marker falls through to hydrate');
});

// A rendered claude-code checkout: wize-* entries, the `wize` entrypoint, user.toml and a marker.
function hydratedProject(prefix, pin, marker) {
  const repo = installedProject(prefix, { pin, targets: ['claude-code'] });
  fs.mkdirSync(path.join(repo, '.claude/skills/wize-help'), { recursive: true });
  fs.mkdirSync(path.join(repo, '.claude/skills/wize'), { recursive: true });
  if (marker) {
    fs.mkdirSync(path.join(repo, '.wize/.local'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.wize/.local/hydrated.json'), JSON.stringify({ schema: 1, ...marker }, null, 2));
  }
  return repo;
}

test('script: the fast path follows the marker pin, as project-status does', () => {
  const repo = hydratedProject('wize-hk-pinkey-', '0.27.0', { kit_version: '0.27.1', pin: '0.27.0' });
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  assert.strictEqual(runScript(repo, stub).code, 0);
  assert.deepStrictEqual(stub.calls(), [], 'rendered by 0.27.1 for pin 0.27.0 is current');

  fs.writeFileSync(path.join(repo, '.wize/.local/hydrated.json'), JSON.stringify({ schema: 1, kit_version: '0.27.0', pin: '0.26.9' }));
  runScript(repo, stub);
  assert.strictEqual(stub.calls().length, 1, 'kit_version alone does not count once a pin is recorded');
});

test('script: a lost `wize` entrypoint is repaired even when the marker matches', () => {
  const repo = hydratedProject('wize-hk-noalias-', '0.27.0', { kit_version: '0.27.0', pin: '0.27.0' });
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  fs.rmSync(path.join(repo, '.claude/skills/wize'), { recursive: true });
  runScript(repo, stub);
  assert.strictEqual(stub.calls().length, 1);
});

test('script: a legacy pin takes the fast path once its files exist, with no markers', () => {
  const repo = hydratedProject('wize-hk-legacy-', '0.26.1', null);
  fs.rmSync(path.join(repo, '.wize/config/user.toml'), { force: true });
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  assert.strictEqual(runScript(repo, stub).code, 0);
  assert.deepStrictEqual(stub.calls(), [], 'no sync on every session start');

  fs.mkdirSync(path.join(repo, '.wize/.local'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.wize/.local/hydrated.json'), JSON.stringify({ schema: 1, kit_version: '0.27.0', pin: '0.26.0' }));
  runScript(repo, stub);
  assert.strictEqual(stub.calls().length, 1, 'a marker for another pin is stale');

  fs.rmSync(path.join(repo, '.claude/skills/wize'), { recursive: true });
  fs.rmSync(path.join(repo, '.wize/.local/hydrated.json'));
  runScript(repo, stub);
  assert.strictEqual(stub.calls().length, 2, 'a missing entrypoint is repaired');
});

test('script: the npx output goes to stderr, for sync and hydrate alike', () => {
  for (const pin of ['0.26.1', '0.27.0']) {
    const { wt } = renderedWorktree(`wize-hk-out-${pin}-`, pin);
    const dir = path.join(tmpDir('wize-hk-bin-'), 'bin');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'npx'), '#!/bin/sh\necho STDOUT-NOISE\necho STDERR-NOISE >&2\n', { mode: 0o755 });
    fs.writeFileSync(path.join(dir, 'npm'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    const r = runScript(wt, { dir });
    assert.strictEqual(r.out, '', pin);
    assert.match(r.err, /STDOUT-NOISE/, pin);
    assert.match(r.err, /STDERR-NOISE/, pin);
  }
});

test('script: CLAUDE_PROJECT_DIR beats an inherited ORCA_WORKTREE_PATH, and the child is told the root', () => {
  const a = renderedWorktree('wize-hk-envA-', '0.27.0').wt;
  const b = renderedWorktree('wize-hk-envB-', '0.27.0').wt;
  const dir = path.join(tmpDir('wize-hk-bin-'), 'bin');
  fs.mkdirSync(dir, { recursive: true });
  const log = path.join(dir, 'env.log');
  fs.writeFileSync(path.join(dir, 'npx'), `#!/bin/sh\necho "$PWD $WIZE_PROJECT_ROOT" >> "${log}"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'npm'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  runScript(b, { dir }, { ORCA_WORKTREE_PATH: a, CLAUDE_PROJECT_DIR: b });
  assert.strictEqual(fs.readFileSync(log, 'utf-8').trim(), `${b} ${b}`);
});

test('script: user.toml is never copied from an ORCA_ROOT_PATH that belongs to another repository', () => {
  const { wt } = renderedWorktree('wize-hk-orcaroot-', '0.27.0');
  const stranger = makeInstalledRepo(path.join(tmpDir('wize-hk-stranger-'), 'repo'), { userToml: 'name = "stranger"\n' });
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  runScript(wt, stub, { ORCA_ROOT_PATH: stranger });
  assert.strictEqual(fs.readFileSync(path.join(wt, '.wize/config/user.toml'), 'utf-8'), 'name = "primary"\n');
});

test('script: the target table matches the installer (sentinel directories and `wize` entrypoints)', () => {
  const { SENTINEL_DIRS } = require(path.join(KIT, 'tools/installer/render-targets.js'));
  const { ALIAS_BY_TARGET } = require(path.join(KIT, 'tools/installer/setup-helpers.js'));
  const text = fs.readFileSync(path.join(KIT, 'tools/installer/templates/hydrate.sh'), 'utf-8');
  const rows = {};
  for (const m of text.matchAll(/^ {2}([a-z-]+)\) +dir=(\S+?);\s+alias=(\S+) ;;$/gm)) rows[m[1]] = { dir: m[2], alias: m[3] };
  assert.deepStrictEqual(Object.keys(rows).sort(), Object.keys(SENTINEL_DIRS).sort());
  for (const [code, dir] of Object.entries(SENTINEL_DIRS)) {
    assert.strictEqual(rows[code].dir, dir, code);
    assert.strictEqual(`${rows[code].alias}`, ALIAS_BY_TARGET[code][0].replace(/\/$/, ''), code);
  }
});

test('script: no project.toml means skip, exit 0', () => {
  const dir = tmpDir('wize-hk-none-');
  fs.mkdirSync(path.join(dir, '.wize/hooks'), { recursive: true });
  fs.writeFileSync(path.join(dir, SCRIPT_REL), hooks.readTemplate('hydrate.sh'));
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  const r = runScript(dir, stub);
  assert.strictEqual(r.code, 0);
  assert.deepStrictEqual(stub.calls(), []);
});

test('script: ORCA_WORKTREE_PATH wins over the cwd', () => {
  const { wt } = renderedWorktree('wize-hk-orca-', '0.27.0');
  const elsewhere = tmpDir('wize-hk-elsewhere-');
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  const r = spawnSync('sh', [path.join(wt, SCRIPT_REL)], {
    cwd: elsewhere,
    encoding: 'utf-8',
    env: { ...GIT_ENV, PATH: `${stub.dir}:${process.env.PATH}`, WIZE_HOOK_BACKOFF_S: '0', ORCA_WORKTREE_PATH: wt, CLAUDE_PROJECT_DIR: '' }
  });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(stub.calls().length, 1);
});

function pwdNpx(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const log = path.join(dir, 'npx.log');
  fs.writeFileSync(path.join(dir, 'npx'), `#!/bin/sh\necho "pwd=$PWD root=$WIZE_PROJECT_ROOT" >> "${log}"\nexit 0\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'npm'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  return { dir, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf-8').split('\n').filter(Boolean) : []) };
}

test('script: a project found from the cwd beats an inherited ORCA_WORKTREE_PATH of another worktree', () => {
  const { repo, wt } = renderedWorktree('wize-hk-foreign-', '0.27.0');
  const stub = pwdNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  const r = runScript(wt, stub, { ORCA_WORKTREE_PATH: repo });
  assert.strictEqual(r.code, 0);
  assert.deepStrictEqual(stub.calls(), [`pwd=${wt} root=${wt}`]);
});

test('script: run from a subdirectory it hydrates the project root, not the subdirectory or a foreign worktree', () => {
  const { repo, wt } = renderedWorktree('wize-hk-sub-', '0.27.0');
  const sub = path.join(wt, 'a', 'b');
  fs.mkdirSync(sub, { recursive: true });
  const stub = pwdNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  const r = spawnSync('sh', [path.join(wt, SCRIPT_REL)], {
    cwd: sub,
    encoding: 'utf-8',
    env: { ...GIT_ENV, PATH: `${stub.dir}:${process.env.PATH}`, WIZE_HOOK_BACKOFF_S: '0', ORCA_WORKTREE_PATH: repo, CLAUDE_PROJECT_DIR: '' }
  });
  assert.strictEqual(r.status, 0);
  assert.deepStrictEqual(stub.calls(), [`pwd=${wt} root=${wt}`]);
});

test('script: a 0.27.0 prerelease pin is legacy (sync), like the JS semver', () => {
  const { wt } = renderedWorktree('wize-hk-rc-', '0.27.0-rc.1');
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  assert.strictEqual(runScript(wt, stub).code, 0);
  assert.deepStrictEqual(stub.calls(), ['--yes --prefer-offline wize-dev-kit@0.27.0-rc.1 sync']);
});

test('script: an unpublished pin (ETARGET) is attempted once and its error is shown', () => {
  const { wt } = renderedWorktree('wize-hk-etarget-', '0.27.0');
  const dir = path.join(tmpDir('wize-hk-bin-'), 'bin');
  fs.mkdirSync(dir, { recursive: true });
  const log = path.join(dir, 'npx.log');
  fs.writeFileSync(path.join(dir, 'npx'), `#!/bin/sh\necho x >> "${log}"\necho 'npm error code ETARGET' >&2\nexit 1\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'npm'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const r = runScript(wt, { dir });
  assert.strictEqual(r.code, 0);
  assert.strictEqual(fs.readFileSync(log, 'utf-8').split('\n').filter(Boolean).length, 1);
  assert.match(r.err, /ETARGET/);
  assert.match(r.err, /wize: hydrate failed/);
});

// ---- update refreshes the managed script ----------------------------------------

test('update plans a refresh only for a managed hook that is out of date', () => {
  const repo = installedProject('wize-hk-upd-', { pin: KIT_PIN() });
  const pr = (rel) => planTrackedChanges(repo, KIT_PIN()).files.find(f => f.path === rel);
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'hooks');
  assert.ok(!pr(SCRIPT_REL), 'current script: nothing to do');

  const stale = fs.readFileSync(path.join(repo, SCRIPT_REL), 'utf-8')+ '\n# drift\n';
  fs.writeFileSync(path.join(repo, SCRIPT_REL), stale);
  const entry = pr(SCRIPT_REL);
  assert.ok(entry && entry.exec, 'a stale managed script is refreshed');
  assert.strictEqual(entry.content, hooks.readTemplate('hydrate.sh'));

  fs.writeFileSync(path.join(repo, SCRIPT_REL), '#!/bin/sh\necho mine\n');
  assert.ok(!pr(SCRIPT_REL), 'an unmanaged script is never touched');
});

test('update --in-place refreshes the script and keeps it executable', () => {
  const repo = installedProject('wize-hk-upd2-', { pin: KIT_PIN() });
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'hooks');
  fs.writeFileSync(path.join(repo, SCRIPT_REL), fs.readFileSync(path.join(repo, SCRIPT_REL), 'utf-8') + '\n# drift\n');
  git(repo, 'commit', '-q', '-am', 'drift');
  const r = runCli(repo, ['update', '--in-place', '--no-render']);
  assert.strictEqual(r.code, 0, r.err);
  assert.strictEqual(fs.readFileSync(path.join(repo, SCRIPT_REL), 'utf-8'), hooks.readTemplate('hydrate.sh'));
  assert.ok(fs.statSync(path.join(repo, SCRIPT_REL)).mode & 0o100);
});

function KIT_PIN() { return require('./_helpers-git.js').KIT_VERSION; }

test('every template passes sh -n and carries the header', () => {
  const file = path.join(KIT, 'tools/installer/templates/hydrate.sh');
  assert.strictEqual(spawnSync('sh', ['-n', file]).status, 0);
  assert.ok(hooks.isManagedHook(fs.readFileSync(file, 'utf-8')));
  assert.ok(!hooks.isManagedHook('#!/bin/sh\necho hi\n'));
});

test('script: an hour-old fallback marker is not current; a fresh one is', () => {
  const repo = hydratedProject('wize-hk-fallback-', '0.27.0', { kit_version: '0.27.1', pin: '0.27.0', fallback: true });
  const stub = recordingNpx(path.join(tmpDir('wize-hk-bin-'), 'bin'));
  runScript(repo, stub);
  assert.deepStrictEqual(stub.calls(), [], 'fresh fallback marker: fast path');

  const marker = path.join(repo, '.wize/.local/hydrated.json');
  const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
  fs.utimesSync(marker, old, old);
  runScript(repo, stub);
  assert.strictEqual(stub.calls().length, 1, 'old fallback marker: hydrate again');
});

test('script: an attempt killed by `timeout` (124) is not retried', () => {
  const repo = installedProject('wize-hk-timeout-', { pin: '0.27.0', targets: ['claude-code'] });
  const dir = path.join(tmpDir('wize-hk-bin-'), 'bin');
  const stub = recordingNpx(dir);
  const log = path.join(dir, 'timeout.log');
  fs.writeFileSync(path.join(dir, 'timeout'), `#!/bin/sh\necho "$@" >> "${log}"\nexit 124\n`, { mode: 0o755 });
  const r = runScript(repo, stub);
  assert.strictEqual(r.code, 0);
  assert.strictEqual(fs.readFileSync(log, 'utf-8').trim().split('\n').length, 1);
  assert.match(r.err, /hydrate failed/);
});
