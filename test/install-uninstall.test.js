// Tests for E09-S06: Non-interactive install + honest uninstall.
//
// Exercises:
//   - cmdInstall with --yes + defaults
//   - cmdInstall with --profiles + --targets + --yes
//   - cmdInstall --dry-run
//   - cmdUninstall removes adapter dirs
//   - cmdUninstall --dry-run
//   - cmdUninstall on clean project (no adapters)

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');

// We need to import the internal functions from wize-cli.js.
// The CLI is not designed as a library, but we can require it and call
// cmdInstall / cmdUninstall directly by mocking process.argv and stdin.
// However, the simplest approach is to spawn the CLI as a subprocess
// with piped input for interactive mode, and with --yes for non-interactive.

const { execSync, spawnSync } = require('node:child_process');
const { GIT_ENV, git } = require('./_helpers-git.js');
const { ALIAS_PATHS } = require(path.join(KIT, 'tools/installer/setup-helpers.js'));

const CLI = path.join(KIT, 'tools/installer/wize-cli.js');

function tmpProject(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function initGit(dir) {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.test"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: dir, stdio: 'pipe' });
}

// ---------- Non-interactive install ----------

test('install --yes uses full defaults (all profiles + all harnesses, pt-BR)', () => {
  const root = tmpProject('wize-inst-yes-');
  initGit(root);

  const r = spawnSync(process.execPath, [CLI, 'install', '--yes'], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  const out = r.stdout + r.stderr;
  assert.ok(r.status === 0 || out.includes('Concluído'), `install --yes should succeed. status=${r.status}`);

  // Check .wize/ was created.
  assert.ok(fs.existsSync(path.join(root, '.wize/config/project.toml')), 'project.toml should exist');
  assert.ok(fs.existsSync(path.join(root, '.wize/config/user.toml')), 'user.toml should exist');
  assert.ok(fs.existsSync(path.join(root, '.wize/config/tea.toml')), 'tea.toml should exist');

  // Check project.toml has ALL profiles (core + 3 overlays) and ALL targets.
  const toml = fs.readFileSync(path.join(root, '.wize/config/project.toml'), 'utf-8');
  for (const p of ['core', 'web-overlay', 'app-overlay', 'security-overlay']) {
    assert.match(toml, new RegExp(`"${p}"`), `should have profile ${p}`);
  }
  for (const t of ['claude-code', 'copilot', 'cursor', 'windsurf', 'codex', 'continue', 'kimi-code', 'hermes', 'kiro', 'opencode', 'antigravity', 'generic']) {
    assert.match(toml, new RegExp(`"${t}"`), `should have target ${t}`);
  }
  assert.match(toml, /communication = "pt-BR"/, 'should default to pt-BR');

  // The install rendered everything, so the checkout is hydrated at the pin.
  const marker = JSON.parse(fs.readFileSync(path.join(root, '.wize/.local/hydrated.json'), 'utf-8'));
  assert.strictEqual(marker.pin, require(path.join(KIT, 'package.json')).version);
  assert.strictEqual(marker.rendered_with, marker.pin);
  assert.strictEqual(marker.fallback, undefined);

  // Check adapters were rendered (claude-code + cursor + generic).
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md')),
    'claude-code adapter should render skills');
  assert.ok(fs.existsSync(path.join(root, '.cursor/rules/wize-orchestrator.mdc')),
    'cursor adapter should render skills');
  assert.ok(fs.existsSync(path.join(root, '.wize/agents/wize-orchestrator.md')),
    'generic adapter should render skills');

  // Security overlay skills should be rendered (all overlays on by default).
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize-sec-red-teamer/SKILL.md')),
    'security overlay skill should be rendered');

  // Check user.toml has the git user name.
  const userToml = fs.readFileSync(path.join(root, '.wize/config/user.toml'), 'utf-8');
  assert.match(userToml, /Test User/, 'should use git config user.name');

  fs.rmSync(root, { recursive: true, force: true });
});

test('install --profiles core,security-overlay --targets claude-code --yes', () => {
  const root = tmpProject('wize-inst-profiles-');
  initGit(root);

  const r = spawnSync(process.execPath, [
    CLI, 'install',
    '--profiles', 'core,security-overlay',
    '--targets', 'claude-code',
    '--yes'
  ], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  const out = r.stdout + r.stderr;
  assert.ok(r.status === 0 || out.includes('Concluído'), `install with profiles should succeed. status=${r.status}`);

  const toml = fs.readFileSync(path.join(root, '.wize/config/project.toml'), 'utf-8');
  assert.match(toml, /"core"/, 'should have core');
  assert.match(toml, /"security-overlay"/, 'should have security-overlay');
  assert.match(toml, /"claude-code"/, 'should have claude-code');
  // Should NOT have cursor or other targets.
  assert.doesNotMatch(toml, /"cursor"/, 'should not have cursor');

  // Security overlay skills should be rendered.
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize-sec-red-teamer/SKILL.md')),
    'security overlay skill should be rendered');

  fs.rmSync(root, { recursive: true, force: true });
});

test('install --dry-run does not write files', () => {
  const root = tmpProject('wize-inst-dry-');
  initGit(root);

  const r = spawnSync(process.execPath, [
    CLI, 'install',
    '--profiles', 'core',
    '--targets', 'claude-code',
    '--yes',
    '--dry-run'
  ], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  const out = r.stdout + r.stderr;
  assert.ok(out.includes('[DRY-RUN]'), 'should show dry-run banner');
  assert.ok(out.includes('Nenhum arquivo foi modificado'), 'should say no files modified');

  // .wize/ should NOT exist.
  assert.ok(!fs.existsSync(path.join(root, '.wize')), '.wize/ should not exist after dry-run');
  assert.ok(!fs.existsSync(path.join(root, '.claude')), '.claude/ should not exist after dry-run');

  fs.rmSync(root, { recursive: true, force: true });
});

test('install --name overrides user name', () => {
  const root = tmpProject('wize-inst-name-');
  initGit(root);

  const r = spawnSync(process.execPath, [
    CLI, 'install',
    '--name', 'Shuri',
    '--yes'
  ], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  const out = r.stdout + r.stderr;
  assert.ok(r.status === 0 || out.includes('Concluído'), `install --name should succeed. status=${r.status}`);

  const userToml = fs.readFileSync(path.join(root, '.wize/config/user.toml'), 'utf-8');
  assert.match(userToml, /Shuri/, 'should use --name value');

  fs.rmSync(root, { recursive: true, force: true });
});

test('install --lang en uses English', () => {
  const root = tmpProject('wize-inst-lang-');
  initGit(root);

  const r = spawnSync(process.execPath, [
    CLI, 'install',
    '--lang', 'en',
    '--yes'
  ], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  const out = r.stdout + r.stderr;
  assert.ok(r.status === 0 || out.includes('Concluído'), `install --lang should succeed. status=${r.status}`);

  const toml = fs.readFileSync(path.join(root, '.wize/config/project.toml'), 'utf-8');
  assert.match(toml, /communication = "en"/, 'should use en for communication');

  fs.rmSync(root, { recursive: true, force: true });
});

// ---------- Uninstall ----------

test('uninstall removes adapter dirs and .wize/', () => {
  const root = tmpProject('wize-uninst-');
  initGit(root);

  // First install.
  const installR = spawnSync(process.execPath, [
    CLI, 'install',
    '--profiles', 'core',
    '--targets', 'claude-code,cursor',
    '--yes'
  ], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md')),
    'precondition: claude-code adapter should exist');
  assert.ok(fs.existsSync(path.join(root, '.cursor/rules/wize-orchestrator.mdc')),
    'precondition: cursor adapter should exist');

  // Now uninstall (pipe 'y' to confirm).
  const uninstallR = spawnSync(process.execPath, [CLI, 'uninstall'], {
    cwd: root,
    input: 'y\n',
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  const out = uninstallR.stdout + uninstallR.stderr;
  assert.ok(out.includes('Removido'), `uninstall should report removal. Got: ${out.slice(0, 500)}`);

  // .wize/ should be gone.
  assert.ok(!fs.existsSync(path.join(root, '.wize')), '.wize/ should be removed');

  // Adapter wize-* entries should be gone.
  if (fs.existsSync(path.join(root, '.claude/skills'))) {
    const remaining = fs.readdirSync(path.join(root, '.claude/skills'));
    const wizeEntries = remaining.filter(n => n.startsWith('wize-'));
    assert.strictEqual(wizeEntries.length, 0, 'no wize-* entries should remain in .claude/skills/');
  }

  if (fs.existsSync(path.join(root, '.cursor/rules'))) {
    const remaining = fs.readdirSync(path.join(root, '.cursor/rules'));
    const wizeEntries = remaining.filter(n => n.startsWith('wize-'));
    assert.strictEqual(wizeEntries.length, 0, 'no wize-* entries should remain in .cursor/rules/');
  }

  fs.rmSync(root, { recursive: true, force: true });
});

test('uninstall --dry-run shows what would be removed without deleting', () => {
  const root = tmpProject('wize-uninst-dry-');
  initGit(root);

  // Install first.
  spawnSync(process.execPath, [
    CLI, 'install',
    '--profiles', 'core',
    '--targets', 'claude-code',
    '--yes'
  ], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  assert.ok(fs.existsSync(path.join(root, '.wize')), 'precondition: .wize/ should exist');

  const r = spawnSync(process.execPath, [CLI, 'uninstall', '--dry-run'], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  const out = r.stdout + r.stderr;
  assert.ok(out.includes('[DRY-RUN]'), 'should show dry-run banner');
  assert.ok(out.includes('Nenhum arquivo foi removido'), 'should say no files removed');

  // .wize/ should still exist.
  assert.ok(fs.existsSync(path.join(root, '.wize')), '.wize/ should still exist after dry-run');
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md')),
    'adapter files should still exist after dry-run');

  fs.rmSync(root, { recursive: true, force: true });
});

test('uninstall on clean project (no adapters) does not error', () => {
  const root = tmpProject('wize-uninst-clean-');
  initGit(root);

  // Install with no targets that render (use a target that has no adapter).
  // Actually, just create a minimal .wize/ manually.
  fs.mkdirSync(path.join(root, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(root, '.wize/config/project.toml'), `[project]
name = "test"
kit_version = "0.11.0"

[install]
profiles = ["core"]
ide_targets = ["claude-code"]

[language]
communication = "pt-BR"
document_output = "pt-BR"
`, 'utf-8');

  // No adapter dirs exist — uninstall should handle gracefully.
  const r = spawnSync(process.execPath, [CLI, 'uninstall'], {
    cwd: root,
    input: 'y\n',
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  const out = r.stdout + r.stderr;
  assert.ok(out.includes('Removido') || out.includes('Nada para remover') || out.includes('Nenhum arquivo de adapter'),
    `should handle clean project gracefully. Got: ${out.slice(0, 500)}`);

  assert.ok(!fs.existsSync(path.join(root, '.wize')), '.wize/ should be removed');

  fs.rmSync(root, { recursive: true, force: true });
});

test('uninstall removes AGENTS.md when kit-generated', () => {
  const root = tmpProject('wize-uninst-agents-');
  initGit(root);

  // Install with generic target (which generates AGENTS.md via renderAgentsMd).
  spawnSync(process.execPath, [
    CLI, 'install',
    '--profiles', 'core',
    '--targets', 'claude-code,generic',
    '--yes'
  ], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  assert.ok(fs.existsSync(path.join(root, 'AGENTS.md')), 'precondition: AGENTS.md should exist');

  // Uninstall.
  spawnSync(process.execPath, [CLI, 'uninstall'], {
    cwd: root,
    input: 'y\n',
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  assert.ok(!fs.existsSync(path.join(root, 'AGENTS.md')), 'AGENTS.md should be removed');

  fs.rmSync(root, { recursive: true, force: true });
});

test('uninstall does NOT remove user-created AGENTS.md (no kit signature)', () => {
  const root = tmpProject('wize-uninst-user-agents-');
  initGit(root);

  // Install first.
  spawnSync(process.execPath, [
    CLI, 'install',
    '--profiles', 'core',
    '--targets', 'claude-code',
    '--yes'
  ], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  // Overwrite AGENTS.md with user content (no kit signature).
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# My Custom Agents\n\nThis is my file.\n', 'utf-8');

  // Uninstall.
  spawnSync(process.execPath, [CLI, 'uninstall'], {
    cwd: root,
    input: 'y\n',
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 30000
  });

  assert.ok(fs.existsSync(path.join(root, 'AGENTS.md')), 'user AGENTS.md should NOT be removed');
  const content = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf-8');
  assert.match(content, /My Custom Agents/, 'user content should be preserved');

  fs.rmSync(root, { recursive: true, force: true });
});

// ---------- Alias entrypoints (0.27.0) ----------

const FULL_INSTALL = ['install', '--yes', '--targets',
  'claude-code,copilot,cursor,windsurf,codex,continue,kimi-code,hermes,kiro,opencode,antigravity,generic',
  '--profiles', 'core'];

function hermeticInstall(root, args = FULL_INSTALL) {
  git(root, 'init', '-q', '-b', 'main');
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: root, env: GIT_ENV, stdio: 'pipe', encoding: 'utf-8', timeout: 60000
  });
}

test('every ALIAS_PATHS entry is produced by a full 12-target install (drift guard)', () => {
  const root = tmpProject('wize-alias-drift-');
  const r = hermeticInstall(root);
  assert.ok(r.status === 0, r.stdout + r.stderr);
  for (const a of ALIAS_PATHS) {
    assert.ok(fs.existsSync(path.join(root, a)), `ALIAS_PATHS lists ${a} but install does not produce it`);
  }
  // And nothing else named exactly `wize` or `wize.<ext>` shows up that the list misses.
  const stack = [root];
  const found = [];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      if (/^wize(\.[a-z]+)?$/.test(e.name)) found.push(path.relative(root, full) + (e.isDirectory() ? '/' : ''));
      if (e.isDirectory()) stack.push(full);
    }
  }
  const known = new Set(ALIAS_PATHS);
  for (const f of found) {
    if (f.startsWith('.wize/config') || f.startsWith('.wize/knowledge')) continue;
    assert.ok(known.has(f), `install produced ${f}, which is missing from ALIAS_PATHS`);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test('after install + git add -A, no generated alias is tracked and every alias is ignored', () => {
  const root = tmpProject('wize-alias-ignore-');
  const r = hermeticInstall(root);
  assert.ok(r.status === 0, r.stdout + r.stderr);
  git(root, 'add', '-A');
  const tracked = git(root, 'ls-files').split('\n').filter(Boolean);
  const leaked = tracked.filter(f => /(^|\/)wize(\/|\.)/.test(f))
    .filter(f => !f.startsWith('.wize/config') && !f.startsWith('.wize/knowledge'));
  assert.deepStrictEqual(leaked, [], `alias files under version control: ${leaked.join(', ')}`);

  for (const a of ALIAS_PATHS) {
    const probe = a.endsWith('/') ? a + 'SKILL.md' : a;
    assert.ok(git(root, 'check-ignore', probe), `${probe} is not ignored`);
  }
  assert.ok(git(root, 'check-ignore', '.claude/worktrees/x'), '.claude/worktrees/x is not ignored');
  fs.rmSync(root, { recursive: true, force: true });
});

test('uninstall removes alias entries and keeps unrelated wize.* user files', () => {
  const root = tmpProject('wize-alias-uninst-');
  const r = hermeticInstall(root);
  assert.ok(r.status === 0, r.stdout + r.stderr);
  fs.writeFileSync(path.join(root, 'wize.txt'), 'mine');
  fs.mkdirSync(path.join(root, '.claude/skills/wizebar'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude/skills/wizebar/SKILL.md'), 'mine');
  fs.writeFileSync(path.join(root, '.cursor/rules/wizefoo.mdc'), 'mine');

  const dry = spawnSync(process.execPath, [CLI, 'uninstall', '--dry-run'], { cwd: root, env: GIT_ENV, encoding: 'utf-8', timeout: 60000 });
  assert.match(dry.stdout, /alias wize/);
  assert.match(dry.stdout, /\.claude\/skills\/wize/);
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize/SKILL.md')), 'dry-run keeps the alias');

  const u = spawnSync(process.execPath, [CLI, 'uninstall'], { cwd: root, env: GIT_ENV, input: 'y\n', encoding: 'utf-8', timeout: 60000 });
  assert.match(u.stdout, /Removido/);
  for (const a of ALIAS_PATHS) {
    assert.ok(!fs.existsSync(path.join(root, a.replace(/\/$/, ''))), `${a} survived uninstall`);
  }
  assert.strictEqual(fs.readFileSync(path.join(root, 'wize.txt'), 'utf-8'), 'mine');
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wizebar/SKILL.md')), 'prefix-lookalike dir survives');
  assert.ok(fs.existsSync(path.join(root, '.cursor/rules/wizefoo.mdc')), 'prefix-lookalike file survives');
  fs.rmSync(root, { recursive: true, force: true });
});

// ---------- Idempotent install, naming, root guards (0.27.0) ----------

function rtmp(prefix) {
  return fs.realpathSync(tmpProject(prefix));
}

function run(cwd, args, extra = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd, env: { ...GIT_ENV, ...(extra.env || {}) }, input: extra.input, stdio: 'pipe', encoding: 'utf-8', timeout: 60000
  });
}

function repo(prefix) {
  const dir = rtmp(prefix);
  git(dir, 'init', '-q', '-b', 'main');
  return dir;
}

function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else out[path.relative(dir, full)] = fs.readFileSync(full, 'utf-8');
    }
  };
  walk(dir);
  return out;
}

const ONE_TARGET = ['install', '--yes', '--profiles', 'core', '--targets', 'claude-code'];

test('re-running install --yes on an installed project only hydrates', () => {
  const root = repo('wize-reinstall-');
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"app","version":"1.0.0"}\n');
  const first = run(root, ONE_TARGET);
  assert.strictEqual(first.status, 0, first.stderr);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'install');

  const conv = path.join(root, '.wize/knowledge/document-project/conventions.md');
  fs.appendFileSync(conv, '\n- 2026-04-01: dated bullet that must survive.\n');
  fs.rmSync(path.join(root, 'AGENTS.md'), { force: true });
  const skillsAfterInstall = fs.readdirSync(path.join(root, '.claude/skills')).sort();
  assert.ok(!skillsAfterInstall.includes('wize-sec-recon'), 'core profile has no overlay skills');
  fs.rmSync(path.join(root, '.claude'), { recursive: true, force: true });
  const files = ['.wize/config/project.toml', '.wize/config/tea.toml', '.wize/config/user.toml', '.gitignore'];
  const before = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(root, f), 'utf-8')]));
  const knowledgeBefore = Object.fromEntries(
    fs.readdirSync(path.join(root, '.wize/knowledge/document-project')).map(f => [f, fs.readFileSync(path.join(root, '.wize/knowledge/document-project', f), 'utf-8')])
  );

  const statusBefore = git(root, 'status', '--porcelain');
  const r = run(root, ['install', '--yes']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /kit already installed \(kit_version [^)]+\): hydrating; run `npx wize-dev-kit@latest update`/);
  for (const f of files) assert.strictEqual(fs.readFileSync(path.join(root, f), 'utf-8'), before[f], `${f} must be byte-identical`);
  for (const [f, content] of Object.entries(knowledgeBefore)) {
    assert.strictEqual(fs.readFileSync(path.join(root, '.wize/knowledge/document-project', f), 'utf-8'), content, `${f} must be byte-identical`);
  }
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md')), 'configured target is rendered');
  for (const d of ['.cursor', '.github', '.windsurf', '.opencode', '.wize/agents']) {
    assert.ok(!fs.existsSync(path.join(root, d)), `${d} must not be rendered`);
  }
  assert.deepStrictEqual(fs.readdirSync(path.join(root, '.claude/skills')).sort(), skillsAfterInstall, 'same skills as the configured profile, no overlay output');
  assert.ok(!fs.existsSync(path.join(root, 'AGENTS.md')), 'AGENTS.md is not created');
  assert.strictEqual(git(root, 'status', '--porcelain'), statusBefore, 'git status gains no entries');
  fs.rmSync(root, { recursive: true, force: true });
});

test('install --yes on an installed project rejects conflicting flags without writing', () => {
  const root = repo('wize-reinstall-conflict-');
  assert.strictEqual(run(root, ONE_TARGET).status, 0);
  const before = snapshot(root);
  for (const extra of [['--targets', 'claude-code,cursor'], ['--profiles', 'core,web-overlay'], ['--lang', 'en']]) {
    const r = run(root, ['install', '--yes', ...extra]);
    assert.strictEqual(r.status, 1, `${extra.join(' ')}: ${r.stdout}`);
    assert.match(r.stderr, /edit \[install\] in \.wize\/config\/project\.toml, then run hydrate/);
    assert.doesNotMatch(r.stdout, /hydrating/, 'a rejected install does not claim to hydrate');
  }
  assert.deepStrictEqual(snapshot(root), before, 'no writes');
  // The same values are accepted.
  const same = run(root, [...ONE_TARGET, '--lang', 'pt-BR']);
  assert.strictEqual(same.status, 0, same.stderr);
  fs.rmSync(root, { recursive: true, force: true });
});

test('install --dry-run on an installed project writes nothing', () => {
  const root = repo('wize-reinstall-dry-');
  assert.strictEqual(run(root, ONE_TARGET).status, 0);
  fs.rmSync(path.join(root, '.claude'), { recursive: true, force: true });
  const before = snapshot(root);
  const r = run(root, ['install', '--yes', '--dry-run']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(snapshot(root), before);
  fs.rmSync(root, { recursive: true, force: true });
});

test('--user-name and --project-name are independent; --name keeps both meanings', () => {
  const a = repo('wize-names-a-');
  git(a, 'config', 'user.name', 'Local Dev');
  assert.strictEqual(run(a, [...ONE_TARGET, '--project-name', 'Proj X']).status, 0);
  assert.match(fs.readFileSync(path.join(a, '.wize/config/project.toml'), 'utf-8'), /^name = "Proj X"$/m);
  assert.match(fs.readFileSync(path.join(a, '.wize/config/user.toml'), 'utf-8'), /name = "Local Dev"/);

  const b = repo('wize-names-b-');
  assert.strictEqual(run(b, [...ONE_TARGET, '--user-name', 'Ana']).status, 0);
  assert.match(fs.readFileSync(path.join(b, '.wize/config/user.toml'), 'utf-8'), /name = "Ana"/);
  assert.match(fs.readFileSync(path.join(b, '.wize/config/project.toml'), 'utf-8'), new RegExp(`^name = "${path.basename(b)}"$`, 'm'));

  const c = repo('wize-names-c-');
  assert.strictEqual(run(c, [...ONE_TARGET, '--name', 'Both']).status, 0);
  assert.match(fs.readFileSync(path.join(c, '.wize/config/user.toml'), 'utf-8'), /name = "Both"/);
  assert.match(fs.readFileSync(path.join(c, '.wize/config/project.toml'), 'utf-8'), /^name = "Both"$/m);

  const d = repo('wize-names-d-');
  assert.strictEqual(run(d, [...ONE_TARGET, '--name', 'Legacy', '--user-name', 'Ana', '--project-name', 'Proj']).status, 0);
  assert.match(fs.readFileSync(path.join(d, '.wize/config/user.toml'), 'utf-8'), /name = "Ana"/);
  assert.match(fs.readFileSync(path.join(d, '.wize/config/project.toml'), 'utf-8'), /^name = "Proj"$/m);
  for (const x of [a, b, c, d]) fs.rmSync(x, { recursive: true, force: true });
});

test('project_name in a linked worktree is the primary checkout basename', () => {
  const base = rtmp('wize-names-wt-');
  const primary = path.join(base, 'primary-repo');
  fs.mkdirSync(primary);
  git(primary, 'init', '-q', '-b', 'main');
  git(primary, 'commit', '-q', '--allow-empty', '-m', 'init');
  const wt = path.join(base, 'throwaway-wt');
  git(primary, 'worktree', 'add', '-q', wt, '-b', 'feat/x');
  const r = run(wt, ONE_TARGET);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(wt, '.wize/config/project.toml'), 'utf-8'), /^name = "primary-repo"$/m);
  fs.rmSync(base, { recursive: true, force: true });
});

test('install from a repo subdirectory fails with the toplevel; --here allows it', () => {
  const root = repo('wize-subdir-');
  const sub = path.join(root, 'packages', 'app');
  fs.mkdirSync(sub, { recursive: true });
  const r = run(sub, ONE_TARGET);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.includes(`run install from the repo root ${root} (or pass --here)`), r.stderr);
  assert.ok(!fs.existsSync(path.join(sub, '.wize')), 'nothing written');

  const ok = run(sub, [...ONE_TARGET, '--here']);
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.ok(fs.existsSync(path.join(sub, '.wize/config/project.toml')));
  fs.rmSync(root, { recursive: true, force: true });
});

test('nested install under an installed root is refused; --here overrides', () => {
  const root = repo('wize-nested-');
  assert.strictEqual(run(root, ONE_TARGET).status, 0);
  const sub = path.join(root, 'packages', 'app');
  fs.mkdirSync(sub, { recursive: true });
  const r = run(sub, ONE_TARGET);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.includes(`kit already installed at ${root}; run from there`), r.stderr);
  assert.ok(!fs.existsSync(path.join(sub, '.wize')));
  const ok = run(sub, [...ONE_TARGET, '--here']);
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.ok(fs.existsSync(path.join(sub, '.wize/config/project.toml')));
  fs.rmSync(root, { recursive: true, force: true });
});

test('uninstall from a subdirectory is refused; --root allows it', () => {
  const root = repo('wize-uninst-sub-');
  assert.strictEqual(run(root, ONE_TARGET).status, 0);
  const sub = path.join(root, 'packages', 'app');
  fs.mkdirSync(sub, { recursive: true });

  const refused = run(sub, ['uninstall'], { input: 'y\n' });
  assert.strictEqual(refused.status, 1);
  assert.ok(refused.stdout.includes(`uninstalling from ${root}`));
  assert.ok(refused.stderr.includes(`--root ${root}`), refused.stderr);
  assert.ok(fs.existsSync(path.join(root, '.wize')), 'nothing removed');

  const ok = run(sub, ['uninstall', '--root', root], { input: 'y\n' });
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.ok(ok.stdout.includes(`uninstalling from ${root}`));
  assert.ok(!fs.existsSync(path.join(root, '.wize')));
  fs.rmSync(root, { recursive: true, force: true });
});

test('uninstall from the root prints the root it works on', () => {
  const root = repo('wize-uninst-root-');
  assert.strictEqual(run(root, ONE_TARGET).status, 0);
  const r = run(root, ['uninstall', '--dry-run']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes(`uninstalling from ${root}`));
  fs.rmSync(root, { recursive: true, force: true });
});

test('fresh install runs the baseline only when no baseline exists; --baseline forces; env skips', () => {
  const dpDir = '.wize/knowledge/document-project';
  const seed = (dir) => {
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"app"}\n');
    fs.mkdirSync(path.join(dir, dpDir), { recursive: true });
    fs.writeFileSync(path.join(dir, dpDir, 'conventions.md'), '- 2026-01-01: keep me\n');
  };

  const a = repo('wize-bl-exists-');
  seed(a);
  const ra = run(a, ONE_TARGET);
  assert.strictEqual(ra.status, 0, ra.stderr);
  assert.ok(!fs.existsSync(path.join(a, dpDir, 'overview.md')), 'existing baseline blocks the run');
  assert.strictEqual(fs.readFileSync(path.join(a, dpDir, 'conventions.md'), 'utf-8'), '- 2026-01-01: keep me\n');

  const b = repo('wize-bl-forced-');
  seed(b);
  const rb = run(b, [...ONE_TARGET, '--baseline']);
  assert.strictEqual(rb.status, 0, rb.stderr);
  assert.ok(fs.existsSync(path.join(b, dpDir, 'overview.md')), '--baseline forces the run');
  assert.strictEqual(fs.readFileSync(path.join(b, dpDir, 'conventions.md'), 'utf-8'), '- 2026-01-01: keep me\n', 'existing file kept');

  const c = repo('wize-bl-env-');
  fs.writeFileSync(path.join(c, 'package.json'), '{"name":"app"}\n');
  const rc = run(c, ONE_TARGET, { env: { WIZE_SKIP_BASELINE: '1' } });
  assert.strictEqual(rc.status, 0, rc.stderr);
  assert.ok(!fs.existsSync(path.join(c, dpDir, 'overview.md')));

  const d = repo('wize-bl-fresh-');
  fs.writeFileSync(path.join(d, 'package.json'), '{"name":"app"}\n');
  const rd = run(d, ONE_TARGET, { env: { WIZE_SKIP_BASELINE: '' } });
  assert.strictEqual(rd.status, 0, rd.stderr);
  assert.ok(fs.existsSync(path.join(d, dpDir, 'overview.md')), 'brownfield without baseline gets one');
  for (const x of [a, b, c, d]) fs.rmSync(x, { recursive: true, force: true });
});

test('install closing message points to hydrate, update --pr and hooks install', () => {
  const root = repo('wize-closing-');
  const r = run(root, ONE_TARGET);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /wize-dev-kit hydrate/);
  assert.match(r.stdout, /wize-dev-kit update --pr/);
  assert.match(r.stdout, /wize-dev-kit hooks install/);
  fs.rmSync(root, { recursive: true, force: true });
});
