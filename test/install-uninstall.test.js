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

test('install --yes uses defaults (core profile, detected targets, pt-BR)', () => {
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

  // Check project.toml has core profile and at least claude-code + generic.
  const toml = fs.readFileSync(path.join(root, '.wize/config/project.toml'), 'utf-8');
  assert.match(toml, /profiles = \["core"\]/, 'should have core profile');
  assert.match(toml, /claude-code/, 'should have claude-code target');
  assert.match(toml, /generic/, 'should have generic target');
  assert.match(toml, /communication = "pt-BR"/, 'should default to pt-BR');

  // Check adapters were rendered.
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/wize-orchestrator/SKILL.md')),
    'claude-code adapter should render skills');

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
