// `wize-dev-kit hydrate` end to end. The CLI runs main() at top level, so
// everything here spawns it against throwaway git repos with a hermetic git
// environment and WIZE_DISABLE_UPDATE_CHECK=1 (no registry traffic).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  GIT_ENV, git, commitAll, CLI, KIT, KIT_VERSION, tmpDir, makeInstalledRepo, addWorktree, stubNpx
} = require('./_helpers-git.js');

function hydrate(cwd, args = [], env = {}) {
  return spawnSync(process.execPath, [CLI, 'hydrate', ...args], {
    cwd,
    encoding: 'utf-8',
    timeout: 60000,
    env: { ...GIT_ENV, USER: 'envuser', XDG_CACHE_HOME: tmpDir('wize-hy-cache-'), ...env }
  });
}

const json = (r) => JSON.parse(r.stdout.trim());
const exists = (...p) => fs.existsSync(path.join(...p));

function fixture(opts = {}) {
  const base = tmpDir('wize-hy-');
  const primary = makeInstalledRepo(path.join(base, 'primary'), opts);
  const wt = addWorktree(primary, path.join(base, 'wt'), 'work');
  return { base, primary, wt };
}

test('hydrates a linked worktree: every target rendered, user.toml copied, git status untouched', () => {
  const { primary, wt } = fixture({ targets: ['claude-code', 'generic', 'cursor'] });
  assert.ok(!exists(wt, '.claude/skills'), 'fresh worktree has no renders');
  const before = git(wt, 'status', '--porcelain');

  const r = hydrate(wt);
  assert.strictEqual(r.status, 0, r.stderr);
  for (const dir of ['.claude/skills', '.wize/agents', '.cursor/rules']) {
    assert.ok(fs.readdirSync(path.join(wt, dir)).some(n => n.startsWith('wize-')), `${dir} has wize-* entries`);
  }
  assert.strictEqual(
    fs.readFileSync(path.join(wt, '.wize/config/user.toml'), 'utf-8'),
    fs.readFileSync(path.join(primary, '.wize/config/user.toml'), 'utf-8')
  );
  assert.strictEqual(git(wt, 'status', '--porcelain'), before);
  assert.ok(exists(wt, '.wize/.local/hydrated.json'));
  assert.match(r.stdout, /wize: hydrated .* user\.toml: copied:/);
  assert.match(r.stdout, /✓ claude-code: \d+ written, 0 unchanged/);
});

test('a second run rewrites nothing and keeps the marker stable except rendered_at', () => {
  const { wt } = fixture();
  hydrate(wt);
  const m1 = JSON.parse(fs.readFileSync(path.join(wt, '.wize/.local/hydrated.json'), 'utf-8'));
  const r = hydrate(wt, ['--json']);
  const out = json(r);
  assert.strictEqual(out.ok, true);
  assert.ok(out.adapters.length === 2);
  for (const a of out.adapters) {
    assert.strictEqual(a.written, 0);
    assert.ok(a.unchanged > 0);
  }
  const m2 = JSON.parse(fs.readFileSync(path.join(wt, '.wize/.local/hydrated.json'), 'utf-8'));
  const strip = ({ rendered_at, counts, ...rest }) => rest;
  assert.deepStrictEqual(strip(m2), strip(m1));
  assert.strictEqual(m2.kit_version, KIT_VERSION);
  assert.strictEqual(m2.delegated, false);
  assert.strictEqual(m2.rendered_with, KIT_VERSION);
});

test('--if-needed is a no-op when the marker matches and re-renders after a pin edit', () => {
  const { wt } = fixture();
  hydrate(wt);
  const markerFile = path.join(wt, '.wize/.local/hydrated.json');
  const before = fs.readFileSync(markerFile, 'utf-8');

  const noop = hydrate(wt, ['--if-needed']);
  assert.strictEqual(noop.status, 0);
  assert.match(noop.stdout, new RegExp(`wize: already hydrated \\(${KIT_VERSION.replace(/\./g, '\\.')}\\)`));
  assert.strictEqual(fs.readFileSync(markerFile, 'utf-8'), before);

  const quiet = hydrate(wt, ['--if-needed', '--quiet']);
  assert.strictEqual(quiet.stdout, '');

  const toml = path.join(wt, '.wize/config/project.toml');
  fs.writeFileSync(toml, fs.readFileSync(toml, 'utf-8').replace(`kit_version = "${KIT_VERSION}"`, 'kit_version = "0.26.0"'));
  const again = hydrate(wt, ['--if-needed']);
  assert.match(again.stdout, /wize: hydrated /);
  assert.doesNotMatch(again.stdout, /already hydrated/);
});

test('--if-needed re-renders when a configured target lost its wize-* entries', () => {
  const { wt } = fixture();
  hydrate(wt);
  fs.rmSync(path.join(wt, '.wize/agents'), { recursive: true });
  const r = hydrate(wt, ['--if-needed']);
  assert.match(r.stdout, /wize: hydrated /);
  assert.ok(fs.readdirSync(path.join(wt, '.wize/agents')).some(n => n.startsWith('wize-')));
});

test('user.toml source order: ORCA_ROOT_PATH of this repo, then primary, then derived', () => {
  const { base, primary, wt } = fixture();
  const other = addWorktree(primary, path.join(base, 'other'), 'other');
  fs.writeFileSync(path.join(other, '.wize/config/user.toml'), 'name = "orca"\n');

  hydrate(wt, [], { ORCA_ROOT_PATH: other });
  assert.match(fs.readFileSync(path.join(wt, '.wize/config/user.toml'), 'utf-8'), /name = "orca"/);

  // A different repository's ORCA_ROOT_PATH is ignored.
  const wt2 = addWorktree(primary, path.join(base, 'wt2'), 'work2');
  const foreign = makeInstalledRepo(path.join(base, 'foreign'), { userToml: 'name = "foreign"\n' });
  const r2 = hydrate(wt2, ['--json'], { ORCA_ROOT_PATH: foreign });
  assert.match(fs.readFileSync(path.join(wt2, '.wize/config/user.toml'), 'utf-8'), /name = "primary"/);
  assert.ok(json(r2).user_toml.startsWith(`copied:${primary}`));
});

test('an existing user.toml is never overwritten', () => {
  const { wt } = fixture();
  fs.writeFileSync(path.join(wt, '.wize/config/user.toml'), 'name = "mine"\n');
  const r = hydrate(wt, ['--json']);
  assert.strictEqual(json(r).user_toml, 'present');
  assert.strictEqual(fs.readFileSync(path.join(wt, '.wize/config/user.toml'), 'utf-8'), 'name = "mine"\n');
});

test('with no copy to inherit, user.toml is derived: git user.name, then $USER', () => {
  const base = tmpDir('wize-hy-derive-');
  const solo = makeInstalledRepo(path.join(base, 'solo'), { userToml: null });
  const r = hydrate(solo, ['--json'], { USER: 'tester' });
  assert.strictEqual(json(r).user_toml, 'generated');
  assert.match(fs.readFileSync(path.join(solo, '.wize/config/user.toml'), 'utf-8'), /name = "tester"/);

  const solo2 = makeInstalledRepo(path.join(base, 'solo2'), { userToml: null });
  git(solo2, 'config', 'user.name', 'Local Name');
  hydrate(solo2, [], { USER: 'tester' });
  assert.match(fs.readFileSync(path.join(solo2, '.wize/config/user.toml'), 'utf-8'), /name = "Local Name"/);
});

test('without project.toml it prints the skip message and exits 0', () => {
  const dir = tmpDir('wize-hy-none-');
  const r = hydrate(dir);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /wize: no \.wize\/config\/project\.toml here, skipping/);
  assert.ok(!exists(dir, '.wize'));
  const strict = hydrate(dir, ['--strict']);
  assert.strictEqual(strict.status, 0);
});

test('an adapter that throws: exit 0, ok:false in --json, --strict exits 1', () => {
  const { wt } = fixture();
  fs.mkdirSync(path.join(wt, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(wt, '.claude/skills'), 'a file where a directory belongs');

  const r = hydrate(wt, ['--json']);
  assert.strictEqual(r.status, 0);
  const out = json(r);
  assert.strictEqual(out.ok, false);
  assert.ok(out.adapters.find(a => a.code === 'claude-code').error);
  assert.ok(out.adapters.find(a => a.code === 'generic').written > 0, 'other adapters still render');
  assert.match(r.stderr, /wize: hydrate: adapter claude-code failed; run: npx --yes wize-dev-kit@/);
  assert.ok(!exists(wt, '.wize/.local/hydrated.json'), 'no marker after a failed render');

  const strict = hydrate(wt, ['--json', '--strict']);
  assert.strictEqual(strict.status, 1);
  assert.strictEqual(json(strict).ok, false);
});

test('a tracked generated file is left untouched and reported', () => {
  const base = tmpDir('wize-hy-tracked-');
  const primary = makeInstalledRepo(path.join(base, 'primary'));
  const stale = path.join(primary, '.claude/skills/wize-orchestrator/SKILL.md');
  fs.mkdirSync(path.dirname(stale), { recursive: true });
  fs.writeFileSync(stale, 'stale tracked bytes');
  git(primary, 'add', '-f', '.claude/skills/wize-orchestrator/SKILL.md');
  commitAll(primary, 'track a generated file');
  const wt = addWorktree(primary, path.join(base, 'wt'), 'work');

  const r = hydrate(wt, ['--json']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(wt, '.claude/skills/wize-orchestrator/SKILL.md'), 'utf-8'), 'stale tracked bytes');
  assert.strictEqual(git(wt, 'status', '--porcelain'), '');
  assert.match(r.stderr, /1 generated file\(s\) are tracked by git or resolve outside the project and were left untouched; untrack them with: npx wize-dev-kit@latest update/);
  assert.strictEqual(json(r).adapters.find(a => a.code === 'claude-code').skippedTracked.length, 1);
});

test('targets come from project.toml and nothing outside the generated set is written', () => {
  const { wt } = fixture({ targets: ['claude-code'] });
  const tomlBefore = fs.readFileSync(path.join(wt, '.wize/config/project.toml'), 'utf-8');
  const ignoreBefore = fs.readFileSync(path.join(wt, '.gitignore'), 'utf-8');
  const r = hydrate(wt, ['--json']);
  assert.deepStrictEqual(json(r).adapters.map(a => a.code), ['claude-code']);
  assert.ok(!exists(wt, '.cursor'));
  assert.ok(!exists(wt, '.wize/agents'));
  assert.ok(!exists(wt, '.wize/knowledge'));
  assert.ok(!exists(wt, '.wize/custom'));
  assert.ok(!exists(wt, '.wize/config/tea.toml'));
  assert.ok(!exists(wt, 'AGENTS.md'));
  assert.strictEqual(fs.readFileSync(path.join(wt, '.wize/config/project.toml'), 'utf-8'), tomlBefore);
  assert.strictEqual(fs.readFileSync(path.join(wt, '.gitignore'), 'utf-8'), ignoreBefore);
});

test('without target keys it falls back to claude-code + generic, never the 12 targets', () => {
  const base = tmpDir('wize-hy-defaults-');
  const dir = path.join(base, 'p');
  fs.mkdirSync(path.join(dir, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.wize/config/project.toml'), `[project]\nname = "x"\nkit_version = "${KIT_VERSION}"\n`);
  const r = hydrate(dir, ['--json']);
  assert.deepStrictEqual(json(r).adapters.map(a => a.code), ['claude-code', 'generic']);
});

test('a stale .gitignore block is reported when generated files show up in git status', () => {
  const { wt } = fixture({ gitignore: false });
  const r = hydrate(wt, ['--json']);
  assert.strictEqual(r.status, 0);
  assert.match(r.stderr, /your \.gitignore block is outdated; run: npx wize-dev-kit@latest update/);
  assert.ok(json(r).warnings.some(w => /outdated/.test(w)));
  assert.ok(exists(wt, '.claude/skills'), 'nothing is reverted');
});

test('delegates to the pinned kit when pin >= 0.27.0 and differs from the binary', () => {
  const { base, wt } = fixture({ pin: '0.27.5' });
  const npx = stubNpx(path.join(base, 'stub'));
  const r = hydrate(wt, [], { PATH: `${path.join(base, 'stub')}:${process.env.PATH}` });
  assert.strictEqual(r.status, 0, r.stderr);
  const calls = npx.calls();
  assert.strictEqual(calls.length, 1, 'the child must not delegate again');
  assert.match(calls[0], /^--yes --prefer-offline wize-dev-kit@0\.27\.5 hydrate --strict /);
  assert.match(calls[0], /DELEGATED=1$/);
  assert.ok(exists(wt, '.wize/.local/hydrated.json'), 'the child wrote the marker');
  assert.ok(fs.readdirSync(path.join(wt, '.claude/skills')).some(n => n.startsWith('wize-')));
});

test('delegated --json still prints exactly one object', () => {
  const { base, wt } = fixture({ pin: '0.27.5' });
  stubNpx(path.join(base, 'stub'));
  const r = hydrate(wt, ['--json'], { PATH: `${path.join(base, 'stub')}:${process.env.PATH}` });
  const out = json(r);
  assert.strictEqual(out.delegated, true);
  assert.strictEqual(out.pin, '0.27.5');
  assert.ok(out.adapters.length > 0);
});

test('a failing delegation falls back to an in-process render with a warning', () => {
  const { base, wt } = fixture({ pin: '0.27.5' });
  const npx = stubNpx(path.join(base, 'stub'), { fail: true });
  const r = hydrate(wt, ['--json'], { PATH: `${path.join(base, 'stub')}:${process.env.PATH}`, WIZE_HYDRATE_BACKOFF_MS: '0' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(npx.calls().length, 2, 'two attempts');
  const out = json(r);
  assert.strictEqual(out.delegated, false);
  assert.strictEqual(out.ok, true);
  assert.match(r.stderr, new RegExp(`wize: could not run kit 0\\.27\\.5 \\(offline or unpublished\\); rendering with ${KIT_VERSION.replace(/\./g, '\\.')}`));
  assert.ok(fs.readdirSync(path.join(wt, '.claude/skills')).some(n => n.startsWith('wize-')));
});

test('WIZE_HYDRATE_DELEGATED=1 and --no-delegate both prevent delegation', () => {
  const { base, wt } = fixture({ pin: '0.27.5' });
  const npx = stubNpx(path.join(base, 'stub'));
  const PATH = `${path.join(base, 'stub')}:${process.env.PATH}`;
  hydrate(wt, [], { PATH, WIZE_HYDRATE_DELEGATED: '1' });
  hydrate(wt, ['--no-delegate'], { PATH });
  assert.strictEqual(npx.calls().length, 0);
});

test('pin 0.26.1 never delegates and warns that it predates hydrate', () => {
  const { base, wt } = fixture({ pin: '0.26.1' });
  const npx = stubNpx(path.join(base, 'stub'));
  const r = hydrate(wt, [], { PATH: `${path.join(base, 'stub')}:${process.env.PATH}` });
  assert.strictEqual(npx.calls().length, 0);
  assert.match(r.stderr, /wize: pin 0\.26\.1 predates hydrate; adopt it with: npx wize-dev-kit@latest update/);
  assert.ok(fs.readdirSync(path.join(wt, '.claude/skills')).some(n => n.startsWith('wize-')));
});

test('a missing kit_version renders in-process and warns', () => {
  const { base, wt } = fixture({ pin: null });
  const npx = stubNpx(path.join(base, 'stub'));
  const r = hydrate(wt, ['--json'], { PATH: `${path.join(base, 'stub')}:${process.env.PATH}` });
  assert.strictEqual(npx.calls().length, 0);
  assert.match(r.stderr, /wize: kit_version missing in project\.toml; run: npx wize-dev-kit@latest update/);
  assert.strictEqual(json(r).pin, null);
});

test('works from a subdirectory and honours ORCA_WORKTREE_PATH and --root', () => {
  const { base, wt } = fixture();
  const sub = path.join(wt, 'src', 'deep');
  fs.mkdirSync(sub, { recursive: true });
  const r = hydrate(sub, ['--json']);
  assert.strictEqual(json(r).root, wt);
  assert.ok(exists(wt, '.claude/skills'));
  assert.ok(!exists(sub, '.claude'));

  fs.rmSync(path.join(wt, '.claude'), { recursive: true });
  const outside = tmpDir('wize-hy-outside-');
  hydrate(outside, [], { ORCA_WORKTREE_PATH: wt });
  assert.ok(exists(wt, '.claude/skills'));

  fs.rmSync(path.join(wt, '.claude'), { recursive: true });
  hydrate(outside, ['--root', wt]);
  assert.ok(exists(wt, '.claude/skills'));
  assert.ok(!exists(outside, '.claude'));
  assert.ok(base);
});

test('--json prints one object with the documented shape', () => {
  const { primary, wt } = fixture();
  const r = hydrate(wt, ['--json']);
  assert.strictEqual(r.stdout.trim().split('\n').length, 1);
  const out = json(r);
  assert.deepStrictEqual(Object.keys(out).sort(), [
    'adapters', 'binary', 'delegated', 'linked', 'notice', 'ok', 'pin', 'primary', 'root', 'user_toml', 'warnings'
  ]);
  assert.strictEqual(out.linked, true);
  assert.strictEqual(out.primary, primary);
  assert.strictEqual(out.binary, KIT_VERSION);
  assert.strictEqual(out.notice, null);
  assert.ok(out.user_toml.startsWith('copied:'));
});

test('--quiet prints only warnings and the final line', () => {
  const { wt } = fixture({ pin: '0.26.0' });
  const r = hydrate(wt, ['--quiet']);
  assert.doesNotMatch(r.stdout, /✓/);
  assert.match(r.stdout, /^wize: hydrated /m);
  assert.match(r.stderr, /predates hydrate/);
});

test('the notice comes from the cache only and honours --no-notice', () => {
  const { wt } = fixture();
  const cache = tmpDir('wize-hy-notice-');
  fs.mkdirSync(path.join(cache, 'wize-dev-kit'), { recursive: true });
  fs.writeFileSync(path.join(cache, 'wize-dev-kit/registry-version.json'), JSON.stringify({ version: '99.0.0', fetched_at: Date.now() }));
  const env = { XDG_CACHE_HOME: cache, WIZE_DISABLE_UPDATE_CHECK: '', CI: '' };

  const r = hydrate(wt, ['--json'], env);
  assert.strictEqual(json(r).notice, `wize: kit ${KIT_VERSION} -> 99.0.0 available; run: npx wize-dev-kit@latest update`);
  assert.strictEqual(json(hydrate(wt, ['--json', '--no-notice'], env)).notice, null);
  assert.strictEqual(json(hydrate(wt, ['--json'], { ...env, CI: 'true' })).notice, null);
  assert.strictEqual(json(hydrate(wt, ['--json'], { ...env, WIZE_DISABLE_UPDATE_CHECK: '1' })).notice, null);
});

test('hydrate is not a hint command and lists itself in help', () => {
  const r = spawnSync(process.execPath, [CLI, 'help'], { encoding: 'utf-8' });
  assert.match(r.stdout, /hydrate\s+Render this checkout from project\.toml \(worktree-safe; never touches tracked files\)/);
});

// ---- review round 1 -----------------------------------------------------------

function gitShim(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'git'), '#!/bin/sh\necho "fatal: detected dubious ownership in repository" >&2\nexit 128\n', { mode: 0o755 });
  return `${dir}:${process.env.PATH}`;
}

test('when git cannot list tracked files, existing files are left alone (fail closed)', () => {
  const base = tmpDir('wize-hy-failclosed-');
  const primary = makeInstalledRepo(path.join(base, 'primary'));
  const mine = path.join(primary, '.claude/skills/wize-orchestrator/SKILL.md');
  fs.mkdirSync(path.dirname(mine), { recursive: true });
  fs.writeFileSync(mine, 'MY TRACKED CONTENT');
  git(primary, 'add', '-f', '.claude/skills/wize-orchestrator/SKILL.md');
  commitAll(primary, 'track a generated file');
  const wt = addWorktree(primary, path.join(base, 'wt'), 'work');

  const r = hydrate(wt, ['--json', '--no-delegate'], { PATH: gitShim(path.join(base, 'shim')) });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(wt, '.claude/skills/wize-orchestrator/SKILL.md'), 'utf-8'), 'MY TRACKED CONTENT');
  assert.match(r.stderr, /git could not list tracked files/);
  assert.ok(!exists(wt, '.wize/.local/hydrated.json'), 'no marker while files were skipped');
  assert.doesNotMatch(r.stderr, /are tracked by git or resolve outside the project and were left untouched/);
  assert.ok(exists(wt, '.claude/skills/wize-agent-dev') || exists(wt, '.claude/skills/wize-help'), 'files that do not exist yet are still written');
});

test('a tracked symlinked skills directory does not let the render overwrite the tracked target', () => {
  const base = tmpDir('wize-hy-symlink-');
  const primary = makeInstalledRepo(path.join(base, 'primary'));
  const real = path.join(primary, 'skills/wize-orchestrator/SKILL.md');
  fs.mkdirSync(path.dirname(real), { recursive: true });
  fs.writeFileSync(real, 'MY TRACKED CONTENT');
  fs.mkdirSync(path.join(primary, '.claude'), { recursive: true });
  fs.symlinkSync('../skills', path.join(primary, '.claude/skills'));
  git(primary, 'add', 'skills', '.claude/skills');
  commitAll(primary, 'link skills');
  const wt = addWorktree(primary, path.join(base, 'wt'), 'work');

  const r = hydrate(wt, ['--json', '--no-delegate']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(wt, 'skills/wize-orchestrator/SKILL.md'), 'utf-8'), 'MY TRACKED CONTENT');
  assert.ok(!git(wt, 'status', '--porcelain').split('\n').some(l => /^ ?M /.test(l)), 'no tracked file modified');
});

test('a monorepo project does not overwrite tracked files that its symlinked skills directory leads to', () => {
  const base = tmpDir('wize-hy-mono-');
  const repo = path.join(base, 'R');
  fs.mkdirSync(path.join(repo, 'app/.wize/config'), { recursive: true });
  git(base, 'init', '-q', '-b', 'main', repo);
  fs.writeFileSync(path.join(repo, 'app/.wize/config/project.toml'),
    `[project]\nname = "m"\nkit_version = "${KIT_VERSION}"\n\n[install]\nide_targets = ["claude-code"]\nprofiles = ["core"]\n`);
  fs.mkdirSync(path.join(repo, 'shared/skills/wize-help'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'shared/skills/wize-help/SKILL.md'), 'MY CUSTOM');
  fs.mkdirSync(path.join(repo, 'app/.claude'), { recursive: true });
  fs.symlinkSync('../../shared/skills', path.join(repo, 'app/.claude/skills'));
  commitAll(repo);

  const r = hydrate(path.join(repo, 'app'), ['--json', '--no-delegate']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(repo, 'shared/skills/wize-help/SKILL.md'), 'utf-8'), 'MY CUSTOM');
  assert.strictEqual(git(repo, 'status', '--porcelain').split('\n').filter(l => /shared\//.test(l)).length, 0, 'nothing written under shared/');
  assert.match(r.stderr, /tracked by git or resolve outside the project/);
});

test('a symlinked skills directory leading out of the repository is never written through', () => {
  const base = tmpDir('wize-hy-outside-');
  const { wt } = (() => {
    const primary = makeInstalledRepo(path.join(base, 'primary'));
    return { wt: addWorktree(primary, path.join(base, 'wt'), 'work') };
  })();
  const elsewhere = path.join(base, 'other-repo-skills');
  fs.mkdirSync(elsewhere);
  fs.mkdirSync(path.join(wt, '.claude'), { recursive: true });
  fs.symlinkSync(elsewhere, path.join(wt, '.claude/skills'));

  const r = hydrate(wt, ['--no-delegate']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(fs.readdirSync(elsewhere), [], 'nothing landed in the other directory');
});

test('the delegated child is pinned to the parent root, whatever ORCA_WORKTREE_PATH says', () => {
  const { cmdHydrate } = require(path.join(KIT, 'tools/installer/commands/hydrate.js'));
  const { wt } = fixture({ pin: '0.27.5' });
  const other = tmpDir('wize-hy-other-');
  const seen = [];
  cmdHydrate({
    kitRoot: KIT, binary: KIT_VERSION, projectRoot: wt, flags: {},
    env: { ...GIT_ENV, ORCA_WORKTREE_PATH: other, WIZE_PROJECT_ROOT: other, CI: '' },
    log: () => {}, warn: () => {},
    deps: { spawnSync: (cmd, args, opts) => { seen.push(opts); return { status: 0 }; } }
  });
  assert.strictEqual(seen.length, 1);
  assert.strictEqual(seen[0].cwd, wt);
  assert.strictEqual(seen[0].env.WIZE_PROJECT_ROOT, wt);
  assert.strictEqual(seen[0].env.npm_config_fetch_timeout, '20000');
});

test('--if-needed re-renders when the `wize` alias entrypoint is missing', () => {
  const { wt } = fixture();
  hydrate(wt);
  fs.rmSync(path.join(wt, '.claude/skills/wize'), { recursive: true, force: true });
  const r = hydrate(wt, ['--if-needed']);
  assert.doesNotMatch(r.stdout, /already hydrated/);
  assert.ok(exists(wt, '.claude/skills/wize/SKILL.md'));
});

test('a fallback render records the pin it targeted, so version-check does not report it stale', () => {
  const { wt } = fixture({ pin: '0.27.5' });
  const r = hydrate(wt, ['--no-delegate']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`kit_version 0\\.27\\.5, rendered with ${KIT_VERSION.replace(/\./g, '\\.')}`));
  const marker = JSON.parse(fs.readFileSync(path.join(wt, '.wize/.local/hydrated.json'), 'utf-8'));
  assert.strictEqual(marker.pin, '0.27.5');
  assert.strictEqual(marker.kit_version, KIT_VERSION);

  const again = hydrate(wt, ['--if-needed', '--no-delegate']);
  assert.match(again.stdout, /already hydrated \(0\.27\.5\)/);
  const vc = spawnSync(process.execPath, [CLI, 'version-check', '--json'], {
    cwd: wt, encoding: 'utf-8', env: { ...GIT_ENV, XDG_CACHE_HOME: tmpDir('wize-hy-cache-'), CI: '' }
  });
  assert.strictEqual(JSON.parse(vc.stdout.trim()).project.hydrated, 'ok');
});

test('the delegated call sends no --root (paths with spaces survive cmd.exe) and always --strict', () => {
  const base = tmpDir('wize hy spaced-');
  const primary = makeInstalledRepo(path.join(base, 'primary dir'), { pin: '0.27.5' });
  const wt = addWorktree(primary, path.join(base, 'wt dir'), 'work');
  const npx = stubNpx(path.join(base, 'stub'));
  const r = hydrate(wt, [], { PATH: `${path.join(base, 'stub')}:${process.env.PATH}` });
  assert.strictEqual(r.status, 0, r.stderr);
  const call = npx.calls()[0];
  assert.doesNotMatch(call, /--root/);
  assert.match(call, /hydrate --strict/);
  assert.ok(fs.readdirSync(path.join(wt, '.claude/skills')).some(n => n.startsWith('wize-')));
});

test('a delegated child that finds no project reports failure instead of success', () => {
  const dir = tmpDir('wize-hy-noproj-');
  const r = hydrate(dir, ['--json', '--strict'], { WIZE_HYDRATE_DELEGATED: '1' });
  assert.strictEqual(r.status, 1);
  assert.strictEqual(json(r).ok, false);
  assert.strictEqual(hydrate(dir, ['--json', '--strict']).status, 0, 'a normal run still skips quietly');
});

test('hydrate never writes inside a submodule that holds tracked skills', () => {
  const base = tmpDir('wize-hy-subm-');
  const sub = path.join(base, 'skills-repo');
  fs.mkdirSync(path.join(sub, 'wize-help'), { recursive: true });
  git(base, 'init', '-q', '-b', 'main', sub);
  fs.writeFileSync(path.join(sub, 'wize-help/SKILL.md'), 'TEAM SKILL\n');
  commitAll(sub);
  const primary = makeInstalledRepo(path.join(base, 'primary'));
  fs.mkdirSync(path.join(primary, '.claude'), { recursive: true });
  git(primary, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', sub, '.claude/skills');
  commitAll(primary, 'skills submodule');
  const wt = addWorktree(primary, path.join(base, 'wt'), 'work');
  git(wt, '-c', 'protocol.file.allow=always', 'submodule', 'update', '--init', '-q');

  const r = hydrate(wt, ['--no-delegate']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(wt, '.claude/skills/wize-help/SKILL.md'), 'utf-8'), 'TEAM SKILL\n');
  assert.strictEqual(git(path.join(wt, '.claude/skills'), 'status', '--porcelain'), '', 'the submodule is untouched');
  assert.match(r.stderr, /tracked by git or resolve outside the project and were left untouched/);
});

test('the notice never starts a background refresh without a TTY', () => {
  const { cmdHydrate } = require(path.join(KIT, 'tools/installer/commands/hydrate.js'));
  const { wt } = fixture();
  for (const [isTTY, expected] of [[false, '1'], [true, undefined]]) {
    const seen = [];
    cmdHydrate({
      kitRoot: KIT, binary: KIT_VERSION, projectRoot: wt, flags: { 'no-delegate': true },
      env: { ...GIT_ENV, WIZE_DISABLE_UPDATE_CHECK: '', CI: '', WIZE_NO_BG_REFRESH: '' },
      log: () => {}, warn: () => {},
      deps: { isTTY, getLatestNoWait: ({ env }) => { seen.push(env.WIZE_NO_BG_REFRESH || undefined); return null; } }
    });
    assert.deepStrictEqual(seen, [expected], `isTTY=${isTTY}`);
  }
});

// ---- delegation timeouts and fallback markers ---------------------------------------------

function runHydrateWith(wt, spawnSync, { flags = {}, env = {} } = {}) {
  const { cmdHydrate } = require(path.join(KIT, 'tools/installer/commands/hydrate.js'));
  const warnings = [];
  const r = cmdHydrate({
    kitRoot: KIT, binary: KIT_VERSION, projectRoot: wt, flags,
    env: { ...GIT_ENV, CI: '', WIZE_HYDRATE_BACKOFF_MS: '0', ...env },
    log: () => {}, warn: (l) => warnings.push(l),
    deps: { spawnSync }
  });
  return { r, warnings };
}

test('a delegated attempt killed by the timeout is not retried; a quick failure is', () => {
  const { wt } = fixture({ pin: '0.27.5' });
  let calls = 0;
  const timedOut = () => { calls++; return { status: null, signal: 'SIGTERM', error: Object.assign(new Error('spawnSync npx ETIMEDOUT'), { code: 'ETIMEDOUT' }) }; };
  const { warnings } = runHydrateWith(wt, timedOut);
  assert.strictEqual(calls, 1, 'one attempt after a timeout');
  assert.ok(warnings.some(w => /could not run kit 0\.27\.5/.test(w)));

  let quick = 0;
  runHydrateWith(wt, () => { quick++; return { status: 1 }; });
  assert.strictEqual(quick, 2, 'a quick failure still gets the second attempt');
});

test('a fallback render is marked, counts as current for an hour, then retries the exact pin', () => {
  const { markerPath, readMarker, fallbackExpired } = require(path.join(KIT, 'tools/installer/marker.js'));
  const { wt } = fixture({ pin: '0.27.5' });
  let calls = 0;
  const failing = () => { calls++; return { status: 1 }; };
  runHydrateWith(wt, failing);
  const marker = readMarker(wt);
  assert.strictEqual(marker.pin, '0.27.5');
  assert.strictEqual(marker.rendered_with, KIT_VERSION);
  assert.strictEqual(marker.fallback, true);
  assert.strictEqual(fallbackExpired(marker), false);
  assert.strictEqual(fallbackExpired(marker, Date.now() + 61 * 60 * 1000), true);

  calls = 0;
  const fast = runHydrateWith(wt, failing, { flags: { 'if-needed': true } });
  assert.strictEqual(calls, 0, 'a fresh fallback marker takes the fast path');
  assert.deepStrictEqual(fast.r.adapters, []);

  const stale = { ...marker, rendered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() };
  fs.writeFileSync(markerPath(wt), JSON.stringify(stale));
  runHydrateWith(wt, failing, { flags: { 'if-needed': true } });
  assert.ok(calls > 0, 'an hour-old fallback marker tries the pin again');
});

test('a render that was not a fallback carries no fallback flag', () => {
  const { readMarker } = require(path.join(KIT, 'tools/installer/marker.js'));
  const { wt } = fixture();
  hydrate(wt);
  assert.strictEqual(readMarker(wt).fallback, undefined);
});

test('a failing delegation prints one fallback line, not npm\'s raw error per attempt', () => {
  const { base, wt } = fixture({ pin: '0.27.5' });
  const dir = path.join(base, 'stub');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'npx'), '#!/bin/sh\necho "npm error code ETARGET" >&2\nexit 1\n', { mode: 0o755 });
  const env = { PATH: `${dir}:${process.env.PATH}`, WIZE_HYDRATE_BACKOFF_MS: '0' };
  const r = hydrate(wt, [], env);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /ETARGET/);
  assert.match(r.stderr, /could not run kit 0\.27\.5 \(offline or unpublished\)/);
  const verbose = hydrate(wt, ['--no-notice'], { ...env, WIZE_VERBOSE: '1' });
  assert.match(verbose.stderr, /ETARGET/);
});

test('--json in a linked worktree without project.toml still reports linked and primary', () => {
  const { primary, wt } = fixture();
  const empty = git(primary, 'hash-object', '-t', 'tree', '/dev/null');
  git(primary, 'branch', 'older', git(primary, 'commit-tree', empty, '-m', 'old'));
  const old = path.join(path.dirname(primary), 'old');
  git(primary, 'worktree', 'add', '-q', old, 'older');
  const r = hydrate(old, ['--json']);
  assert.strictEqual(r.status, 0, r.stderr);
  const out = json(r);
  assert.strictEqual(out.linked, true);
  assert.strictEqual(out.primary, fs.realpathSync(primary));
  assert.ok(wt);
});
