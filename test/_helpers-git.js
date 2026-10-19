'use strict';
// Hermetic git environment shared by git-based tests (not a test file).
const { execFileSync } = require('node:child_process');

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@test.test',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@test.test',
  WIZE_DISABLE_UPDATE_CHECK: '1'
};

// Makes this process's own git calls hermetic too (for tests that call the
// installer's functions in-process instead of spawning the CLI).
function applyGitEnv() {
  for (const k of ['GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM', 'GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL']) {
    process.env[k] = GIT_ENV[k];
  }
}

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function initRepo(dir) {
  git(dir, 'init', '-q', '-b', 'main');
  return dir;
}

function commitAll(dir, msg = 'init') {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--allow-empty', '-m', msg);
}

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');
const CLI = path.join(KIT, 'tools/installer/wize-cli.js');
const KIT_VERSION = require(path.join(KIT, 'package.json')).version;
const { applyGitignore } = require(path.join(KIT, 'tools/installer/setup-helpers.js'));

function tmpDir(prefix) {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function projectToml({ pin, targets, profiles }) {
  return [
    '[project]',
    'name = "fixture"',
    ...(pin ? [`kit_version = "${pin}"`] : []),
    '',
    '[install]',
    `ide_targets = [${targets.map(t => `"${t}"`).join(', ')}]`,
    `profiles = [${profiles.map(t => `"${t}"`).join(', ')}]`,
    ''
  ].join('\n');
}

// A committed repo with .wize/config/project.toml and the managed .gitignore
// block, plus an untracked user.toml, the way an installed project looks.
function makeInstalledRepo(dir, { pin = KIT_VERSION, targets = ['claude-code', 'generic'], profiles = ['core'], gitignore = true, userToml = 'name = "primary"\n' } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  initRepo(dir);
  fs.mkdirSync(path.join(dir, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.wize/config/project.toml'), projectToml({ pin, targets, profiles }));
  if (gitignore) applyGitignore(dir);
  commitAll(dir);
  if (userToml !== null) fs.writeFileSync(path.join(dir, '.wize/config/user.toml'), userToml);
  return dir;
}

function addWorktree(primary, wt, branch) {
  git(primary, 'worktree', 'add', '-q', wt, '-b', branch);
  return fs.realpathSync(wt);
}

// An `npx` on PATH that logs its argv and WIZE_HYDRATE_DELEGATED, then either
// maps `npx --yes wize-dev-kit@<pin> <cmd> ...` onto the local CLI or fails.
function stubNpx(dir, { fail = false } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const log = path.join(dir, 'npx.log');
  const body = fail
    ? `#!/bin/sh\necho "$@" >> "${log}"\nexit 1\n`
    : `#!/bin/sh\necho "$@ DELEGATED=$WIZE_HYDRATE_DELEGATED" >> "${log}"\nwhile [ "\${1#--}" != "$1" ]; do shift; done\nshift\nexec "${process.execPath}" "${CLI}" "$@"\n`;
  fs.writeFileSync(path.join(dir, 'npx'), body, { mode: 0o755 });
  // npm view must not reach the network from the Orca script.
  fs.writeFileSync(path.join(dir, 'npm'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  return { log, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf-8').split('\n').filter(Boolean) : []) };
}

module.exports = { GIT_ENV, applyGitEnv, git, initRepo, commitAll, KIT, CLI, KIT_VERSION, tmpDir, makeInstalledRepo, addWorktree, stubNpx };
