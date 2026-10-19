/*
 * Compatibility with the user's Orca worktree setup hook
 * (~/.local/bin/wize-worktree-setup): it runs `npx --yes wize-dev-kit@<pin>
 * hydrate` for pins from 0.27.0 and `sync` for older ones. Skipped when the
 * script is not installed.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { GIT_ENV, tmpDir, makeInstalledRepo, addWorktree, stubNpx } = require('./_helpers-git.js');

const SCRIPT = path.join(os.homedir(), '.local', 'bin', 'wize-worktree-setup');
const has = fs.existsSync(SCRIPT);

for (const [pin, cmd] of [['0.27.0', 'hydrate'], ['0.26.1', 'sync']]) {
  test(`wize-worktree-setup renders a fresh worktree pinned ${pin} (${cmd})`, { skip: !has && 'wize-worktree-setup not installed' }, () => {
    const repo = makeInstalledRepo(path.join(tmpDir('wize-orca-'), 'repo'), { pin });
    const wt = addWorktree(repo, path.join(path.dirname(repo), 'wt'), 'feature/orca');
    const bin = path.join(tmpDir('wize-orca-bin-'), 'bin');
    const stub = stubNpx(bin);
    const r = spawnSync('bash', [SCRIPT], {
      cwd: wt,
      encoding: 'utf-8',
      timeout: 120000,
      env: { ...GIT_ENV, PATH: `${bin}:${process.env.PATH}`, ORCA_WORKTREE_PATH: wt, ORCA_ROOT_PATH: repo, CLAUDE_PROJECT_DIR: '' }
    });
    assert.strictEqual(r.status, 0, r.stderr + r.stdout);
    const calls = stub.calls();
    assert.ok(calls.length >= 1, 'npx was called');
    assert.match(calls[0], new RegExp(`wize-dev-kit@${pin.replace(/\./g, '\\.')} ${cmd}\\b`));
    const skills = fs.readdirSync(path.join(wt, '.claude', 'skills'));
    assert.ok(skills.some(n => n.startsWith('wize-')), 'wize-* skills rendered');
    assert.ok(fs.existsSync(path.join(wt, '.claude', 'skills', 'wize')), 'wize alias rendered');
  });
}
