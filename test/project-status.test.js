'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { tmpDir, initRepo, commitAll } = require('./_helpers-git.js');
const { getProjectStatus, hydrateCommand, ACTION_EXIT_CODES } = require('../tools/installer/project-status.js');
const { writeMarker } = require('../tools/installer/marker.js');

function kitWith(version) {
  const dir = tmpDir('wize-ps-kit-');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'wize-dev-kit', version }));
  return dir;
}

// Builds a project directory. `rendered` drops a wize-* sentinel in each
// configured target; `marker` is the kit_version recorded as last hydrated.
function project({ pin = '0.27.0', rendered = true, userToml = true, marker = null, targets = ['claude-code', 'generic'] } = {}) {
  const root = tmpDir('wize-ps-proj-');
  fs.mkdirSync(path.join(root, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(root, '.wize/config/project.toml'), [
    '[project]', 'name = "x"', ...(pin ? [`kit_version = "${pin}"`] : []),
    '', '[install]', `ide_targets = [${targets.map(t => `"${t}"`).join(', ')}]`, 'profiles = ["core"]', ''
  ].join('\n'));
  if (rendered) {
    for (const d of ['.claude/skills/wize-orchestrator', '.claude/skills/wize', '.wize/agents']) fs.mkdirSync(path.join(root, d), { recursive: true });
    fs.writeFileSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md'), 'x');
    fs.writeFileSync(path.join(root, '.claude/skills/wize/SKILL.md'), 'x');
    fs.writeFileSync(path.join(root, '.wize/agents/wize-orchestrator.md'), 'x');
    fs.writeFileSync(path.join(root, '.wize/agents/wize.md'), 'x');
  }
  if (userToml) fs.writeFileSync(path.join(root, '.wize/config/user.toml'), 'x');
  if (marker) writeMarker(root, { kit_version: marker, targets, profiles: ['core'] });
  return root;
}

const status = (root, { installed = '0.27.0', latest = null, latestSource = 'network', published = null, env = {} } = {}) =>
  getProjectStatus({ kitRoot: kitWith(installed), cwd: root, latest, latestSource, published, env });

test('no project: action install', () => {
  const s = status(tmpDir('wize-ps-empty-'));
  assert.strictEqual(s.root, null);
  assert.strictEqual(s.action, 'install');
  assert.strictEqual(s.reason, 'no-project');
  assert.strictEqual(s.commands.install, 'npx --yes wize-dev-kit@latest install');
  assert.strictEqual(s.git.repo, false);
});

test('unhydrated: a configured target without wize-* entries -> hydrate', () => {
  const s = status(project({ rendered: false }));
  assert.strictEqual(s.hydrated, 'missing');
  assert.deepStrictEqual(s.missing_targets, ['claude-code', 'generic']);
  assert.strictEqual(s.action, 'hydrate');
  assert.strictEqual(s.commands.hydrate, 'npx --yes wize-dev-kit@0.27.0 hydrate');
});

test('a lone non-wize file in a target directory does not count as hydrated', () => {
  const root = project({ rendered: false });
  fs.mkdirSync(path.join(root, '.claude/skills/wize'), { recursive: true });
  fs.mkdirSync(path.join(root, '.wize/agents'), { recursive: true });
  fs.writeFileSync(path.join(root, '.wize/agents/wize.md'), 'x');
  assert.strictEqual(status(root).hydrated, 'missing');
});

test('stale marker: pin >= 0.27.0 and marker version differs -> hydrate', () => {
  const s = status(project({ pin: '0.27.0', marker: '0.26.1' }));
  assert.strictEqual(s.hydrated, 'stale');
  assert.strictEqual(s.marker_version, '0.26.1');
  assert.strictEqual(s.action, 'hydrate');
  assert.strictEqual(s.reason, 'stale-marker');
});

test('a matching marker and a legacy install without a marker are both hydrated', () => {
  assert.strictEqual(status(project({ pin: '0.27.0', marker: '0.27.0' })).hydrated, 'ok');
  const legacy = status(project({ pin: '0.27.0', marker: null }));
  assert.strictEqual(legacy.hydrated, 'ok');
  assert.strictEqual(legacy.marker_version, null);
});

test('legacy pin 0.26.1 with user.toml missing -> update, never a hydrate loop', () => {
  const s = status(project({ pin: '0.26.1', userToml: false }), { installed: '0.27.0' });
  assert.strictEqual(s.user_toml, 'missing');
  assert.strictEqual(s.action, 'update');
  assert.strictEqual(s.reason, 'project-behind');
  assert.strictEqual(s.commands.hydrate, 'npx --yes wize-dev-kit@0.26.1 sync');
  // Same pin and binary: nothing can fix it, so nothing is asked for.
  assert.strictEqual(status(project({ pin: '0.26.1', userToml: false }), { installed: '0.26.1' }).action, 'none');
});

test('user.toml missing with a hydrate-capable pin -> hydrate', () => {
  const s = status(project({ pin: '0.27.0', userToml: false }));
  assert.strictEqual(s.action, 'hydrate');
  assert.strictEqual(s.reason, 'user-toml-missing');
});

test('pin ahead of the binary -> use-pin', () => {
  const s = status(project({ pin: '0.28.0' }), { installed: '0.27.0', latest: '0.28.0' });
  assert.strictEqual(s.pin_status, 'ahead-of-binary');
  assert.strictEqual(s.skew, 'project-ahead');
  assert.strictEqual(s.action, 'use-pin');
  assert.strictEqual(s.commands.hydrate, 'npx --yes wize-dev-kit@0.28.0 hydrate');
});

test('pin ahead of the registry -> update with --allow-downgrade', () => {
  const s = status(project({ pin: '0.29.0' }), { installed: '0.27.0', latest: '0.28.0', published: ['0.27.0', '0.28.0'] });
  assert.strictEqual(s.pin_status, 'unpublished');
  assert.strictEqual(s.action, 'update');
  assert.strictEqual(s.reason, 'pin-unpublished');
  assert.strictEqual(s.commands.update, 'npx --yes wize-dev-kit@latest update --allow-downgrade');
});

test('a pin above latest that the registry publishes (another dist-tag) is not unpublished', () => {
  const s = status(project({ pin: '0.28.0-rc.1' }), { installed: '0.27.0', latest: '0.27.0', published: ['0.27.0', '0.28.0-rc.1'] });
  assert.strictEqual(s.pin_status, 'ahead-of-binary');
  assert.strictEqual(s.action, 'use-pin');
  assert.strictEqual(s.commands.update, 'npx --yes wize-dev-kit@latest update');
});

test('an unknown published list never proves a pin unpublished', () => {
  const s = status(project({ pin: '0.29.0' }), { installed: '0.27.0', latest: '0.28.0', published: null });
  assert.strictEqual(s.pin_status, 'ahead-of-binary');
  assert.strictEqual(s.action, 'use-pin');
});

test('a pin that is not plain semver never reaches a command line', () => {
  const evil = '0.27.0 hydrate; touch /tmp/PWNED; echo';
  for (const pin of [evil, 'v0.27.0', '0.27.0\nrm -rf', '$(id)', '0.27.0+build']) {
    const s = status(project({ pin, rendered: false }), { installed: '0.27.0', latest: '0.27.0' });
    assert.strictEqual(s.pin_status, 'invalid', pin);
    assert.strictEqual(s.commands.hydrate, 'npx --yes wize-dev-kit hydrate', pin);
    assert.strictEqual(hydrateCommand(pin), 'npx --yes wize-dev-kit hydrate', pin);
    for (const c of Object.values(s.commands)) assert.ok(!c.includes(pin) || pin === '', `${pin} leaked into ${c}`);
  }
  const hydrated = status(project({ pin: evil }), { installed: '0.27.0', latest: '0.27.0' });
  assert.strictEqual(hydrated.action, 'update');
  assert.strictEqual(hydrated.reason, 'pin-invalid');
});

test('a cached registry answer never proves a pin unpublished', () => {
  for (const latestSource of ['cache', 'none', null]) {
    const s = status(project({ pin: '0.29.0' }), { installed: '0.27.0', latest: '0.28.0', latestSource });
    assert.strictEqual(s.pin_status, 'ahead-of-binary', String(latestSource));
    assert.strictEqual(s.action, 'use-pin', String(latestSource));
    assert.strictEqual(s.commands.update, 'npx --yes wize-dev-kit@latest update');
  }
});

test('pin behind the binary -> update', () => {
  const s = status(project({ pin: '0.27.0' }), { installed: '0.28.0', latest: '0.28.0' });
  assert.strictEqual(s.skew, 'project-behind');
  assert.strictEqual(s.action, 'update');
  assert.strictEqual(s.commands.update, 'npx --yes wize-dev-kit@latest update');
});

test('registry ahead of the pin -> update', () => {
  const s = status(project({ pin: '0.27.0' }), { installed: '0.27.0', latest: '0.27.3' });
  assert.strictEqual(s.skew, 'registry-ahead');
  assert.strictEqual(s.action, 'update');
  assert.strictEqual(s.reason, 'registry-ahead');
});

test('up to date -> none', () => {
  const s = status(project({ pin: '0.27.0', marker: '0.27.0' }), { installed: '0.27.0', latest: '0.27.0' });
  assert.strictEqual(s.skew, 'none');
  assert.strictEqual(s.pin_status, 'ok');
  assert.strictEqual(s.action, 'none');
});

test('offline (latest null): local facts still drive the action', () => {
  const s = status(project({ pin: '0.27.0' }), { installed: '0.27.0', latest: null });
  assert.strictEqual(s.latest, null);
  assert.strictEqual(s.action, 'none');
  assert.strictEqual(status(project({ pin: '0.28.0' }), { installed: '0.27.0', latest: null }).pin_status, 'ahead-of-binary');
});

test('missing pin -> update, and the hydrate command is unpinned', () => {
  const s = status(project({ pin: null }));
  assert.strictEqual(s.pin, null);
  assert.strictEqual(s.pin_status, 'missing');
  assert.strictEqual(s.action, 'update');
  assert.strictEqual(s.reason, 'pin-missing');
  assert.strictEqual(s.commands.hydrate, 'npx --yes wize-dev-kit hydrate');
});

test('WIZE_DISABLE_UPDATE_CHECK=1 downgrades update to none but keeps the skew', () => {
  const s = status(project({ pin: '0.26.0' }), { installed: '0.27.0', env: { WIZE_DISABLE_UPDATE_CHECK: '1' } });
  assert.strictEqual(s.skew, 'project-behind');
  assert.strictEqual(s.action, 'none');
  assert.strictEqual(s.reason, 'update-disabled');
  // hydrate and use-pin are local repairs, not updates.
  assert.strictEqual(status(project({ rendered: false }), { env: { WIZE_DISABLE_UPDATE_CHECK: '1' } }).action, 'hydrate');
  assert.strictEqual(status(project({ pin: '0.28.0' }), { env: { WIZE_DISABLE_UPDATE_CHECK: '1' } }).action, 'use-pin');
});

test('hydrate precedes update', () => {
  const s = status(project({ pin: '0.26.0', rendered: false }), { installed: '0.27.0', latest: '0.27.0' });
  assert.strictEqual(s.action, 'hydrate');
});

test('commands per pin: hydrate from 0.27.0, sync before, unpinned without a pin', () => {
  assert.strictEqual(hydrateCommand('0.27.0'), 'npx --yes wize-dev-kit@0.27.0 hydrate');
  assert.strictEqual(hydrateCommand('1.2.3'), 'npx --yes wize-dev-kit@1.2.3 hydrate');
  assert.strictEqual(hydrateCommand('0.26.9'), 'npx --yes wize-dev-kit@0.26.9 sync');
  assert.strictEqual(hydrateCommand('0.27.0-rc.1'), 'npx --yes wize-dev-kit@0.27.0-rc.1 sync');
  assert.strictEqual(hydrateCommand(null), 'npx --yes wize-dev-kit hydrate');
  const s = status(project({ pin: '0.27.0' }));
  assert.strictEqual(s.commands.update, 'npx --yes wize-dev-kit@latest update');
  assert.strictEqual(s.commands.pr, 'npx --yes wize-dev-kit@latest update --pr');
});

test('git facts for a repo and a linked worktree', () => {
  const root = project();
  initRepo(root);
  commitAll(root);
  const s = status(root);
  assert.strictEqual(s.git.repo, true);
  assert.strictEqual(s.git.linked, false);
  assert.strictEqual(s.git.branch, 'main');
  assert.strictEqual(s.git.detached, false);
  assert.strictEqual(s.git.default_branch, 'main');
  assert.strictEqual(s.git.primary, root);
});

test('exit codes per action', () => {
  assert.deepStrictEqual(ACTION_EXIT_CODES, { none: 0, hydrate: 10, update: 11, 'use-pin': 12, install: 13 });
});

test('a subdirectory resolves to the project root', () => {
  const root = project();
  initRepo(root);
  const sub = path.join(root, 'a', 'b');
  fs.mkdirSync(sub, { recursive: true });
  assert.strictEqual(status(sub).root, root);
});

test('a missing alias entrypoint makes the target count as unhydrated', () => {
  const root = project({ marker: '0.27.0' });
  fs.rmSync(path.join(root, '.claude/skills/wize'), { recursive: true });
  const s = status(root);
  assert.strictEqual(s.hydrated, 'missing');
  assert.deepStrictEqual(s.missing_targets, ['claude-code']);
  assert.strictEqual(s.action, 'hydrate');
});

test('a marker that records the pin it targeted is not stale when the binary differs', () => {
  const root = project({ pin: '0.27.5' });
  writeMarker(root, { kit_version: '0.27.0', pin: '0.27.5', targets: ['claude-code', 'generic'], profiles: ['core'] });
  assert.strictEqual(status(root, { installed: '0.27.0' }).hydrated, 'ok');
  writeMarker(root, { kit_version: '0.27.0', pin: '0.27.4', targets: ['claude-code', 'generic'], profiles: ['core'] });
  assert.strictEqual(status(root, { installed: '0.27.0' }).hydrated, 'stale');
});

// ---- linked worktree whose branch predates the kit -----------------------------------------------

const { git, makeInstalledRepo, applyGitEnv } = require('./_helpers-git.js');

function branchWithoutKit({ bare = false } = {}) {
  const base = tmpDir('wize-ps-nokit-');
  const seed = makeInstalledRepo(path.join(base, 'seed'));
  git(seed, 'add', '-A');
  git(seed, 'commit', '-q', '--allow-empty', '-m', 'kit');
  let home = seed;
  if (bare) {
    home = path.join(base, 'repo.git');
    git(base, 'clone', '-q', '--bare', seed, home);
    git(home, 'worktree', 'add', '-q', path.join(base, 'main'), 'main');
  }
  const empty = git(home, 'hash-object', '-t', 'tree', '/dev/null');
  git(home, 'branch', 'older', git(home, 'commit-tree', empty, '-m', 'old'));
  const old = path.join(base, 'old');
  git(home, 'worktree', 'add', '-q', old, 'older');
  return { old: fs.realpathSync(old), kitAt: fs.realpathSync(bare ? path.join(base, 'main') : seed) };
}

for (const bare of [false, true]) {
  test(`linked worktree whose branch lacks the kit -> kit-not-on-branch, not install (${bare ? 'bare repo' : 'primary checkout'})`, () => {
    applyGitEnv();
    const { old, kitAt } = branchWithoutKit({ bare });
    const s = status(old);
    assert.strictEqual(s.root, null);
    assert.strictEqual(s.action, 'none');
    assert.strictEqual(s.reason, 'kit-not-on-branch');
    assert.strictEqual(s.kit_at, kitAt);
    assert.match(s.commands.install, / --here$/);
  });
}

test('a linked worktree with no kit anywhere stays no-project/install', () => {
  applyGitEnv();
  const base = tmpDir('wize-ps-nokit-anywhere-');
  initRepo(base);
  git(base, 'commit', '-q', '--allow-empty', '-m', 'init');
  const wt = path.join(base, '..', path.basename(base) + '-wt');
  git(base, 'worktree', 'add', '-q', wt, '-b', 'b');
  const s = status(fs.realpathSync(wt));
  assert.strictEqual(s.action, 'install');
  assert.strictEqual(s.reason, 'no-project');
});
