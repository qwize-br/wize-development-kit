/*
 * Documentation guards for the 0.27.0 worktree and automatic-update work:
 * the WORKTREES guide (en + pt-BR), the README section in three languages,
 * the harness docs, ARCH, the knowledge note and the CHANGELOG entry.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(KIT, rel), 'utf-8');
const GUIDES = ['docs/WORKTREES.md', 'docs/WORKTREES.pt-BR.md'];
const READMES = ['README.md', 'README.pt-BR.md', 'README.es.md'];
const HARNESSES = ['antigravity', 'claude-code', 'codex', 'continue', 'copilot', 'cursor', 'generic',
  'hermes', 'kimi-code', 'kiro', 'opencode', 'windsurf'];

test('WORKTREES guide exists in en and pt-BR, cross-linked', () => {
  const en = read(GUIDES[0]);
  const pt = read(GUIDES[1]);
  assert.match(en, /\[Português \(pt-BR\)\]\(WORKTREES\.pt-BR\.md\)/);
  assert.match(pt, /\[English\]\(WORKTREES\.md\)/);
  assert.match(en, /\]\(\.\.\/README\.md\)/);
  assert.match(pt, /\]\(\.\.\/README\.pt-BR\.md\)/);
});

test('WORKTREES guides cover the same commands, variables and exit codes', () => {
  for (const f of GUIDES) {
    const text = read(f);
    for (const needle of [
      'npx wize-dev-kit hydrate', 'update --pr', '--in-place', '--check', '--allow-downgrade',
      'hooks install', 'hooks print', 'doctor --strict', 'version-check --exit-code',
      'WIZE_PROJECT_ROOT', 'WIZE_SKIP_BASELINE', 'WIZE_HYDRATE_DELEGATED', 'WIZE_DISABLE_UPDATE_CHECK',
      'WIZE_NO_BG_REFRESH', '`CI`', 'chore/wize-kit-', 'wait-for-setup', '.worktreeinclude',
      'worktrees.json', 'SessionStart', 'copilot-setup-steps', 'user.toml', 'kit_version'
    ]) {
      assert.ok(text.includes(needle), `${f} is missing "${needle}"`);
    }
    for (const code of ['10', '11', '12', '13']) {
      assert.match(text, new RegExp(`\\b${code}\\b`), `${f} is missing exit code ${code}`);
    }
  }
});

test('every WIZE_* variable the guide documents is read by the installer', () => {
  const sources = fs.readdirSync(path.join(KIT, 'tools/installer'), { recursive: true })
    .filter((f) => /\.(js|sh)$/.test(f))
    .map((f) => fs.readFileSync(path.join(KIT, 'tools/installer', f), 'utf-8'))
    .join('\n') + read('tools/installer/templates/hydrate.sh');
  const vars = new Set(read(GUIDES[0]).match(/\bWIZE_[A-Z_]+\b/g));
  assert.ok(vars.size >= 5);
  for (const v of vars) assert.ok(sources.includes(v), `${v} is documented but never read`);
});

test('relative links in the guides and the README section resolve', () => {
  for (const f of GUIDES) {
    const dir = path.dirname(path.join(KIT, f));
    for (const m of read(f).matchAll(/\]\((?!https?:|#|mailto:)([^)#\s]+)/g)) {
      assert.ok(fs.existsSync(path.resolve(dir, m[1])), `${f}: broken link ${m[1]}`);
    }
  }
  for (const f of READMES) {
    for (const m of read(f).matchAll(/\]\((docs\/WORKTREES[^)#\s]*)/g)) {
      assert.ok(fs.existsSync(path.join(KIT, m[1])), `${f}: broken link ${m[1]}`);
    }
  }
});

test('READMEs have the worktrees section, link the guide and list the new commands', () => {
  const heading = {
    'README.md': /^## Worktrees & automatic updates$/m,
    'README.pt-BR.md': /^## Worktrees & atualizações automáticas$/m,
    'README.es.md': /^## Worktrees y actualizaciones automáticas$/m
  };
  const guide = { 'README.md': 'docs/WORKTREES.md', 'README.pt-BR.md': 'docs/WORKTREES.pt-BR.md', 'README.es.md': 'docs/WORKTREES.md' };
  for (const f of READMES) {
    const text = read(f);
    assert.match(text, heading[f], `${f}: section heading`);
    assert.ok(text.includes(`](${guide[f]})`), `${f}: links ${guide[f]}`);
    const cli = text.slice(text.search(/^## (CLI commands|Comandos da CLI|Comandos de la CLI)$/m));
    for (const cmd of [
      'npx wize-dev-kit hydrate', 'npx wize-dev-kit update --pr', 'npx wize-dev-kit hooks <install|print>',
      'npx wize-dev-kit doctor [--json] [--strict]', 'version-check [--json] [--exit-code]'
    ]) {
      assert.ok(cli.includes(cmd), `${f}: command list is missing "${cmd}"`);
    }
  }
});

test('every harness doc points at hydrate and the guide, in both languages', () => {
  for (const h of HARNESSES) {
    const en = read(`docs/harnesses/${h}.md`);
    const pt = read(`docs/harnesses/${h}.pt-BR.md`);
    assert.ok(en.includes('npx wize-dev-kit hydrate'), `${h}.md`);
    assert.ok(en.includes('](../WORKTREES.md)'), `${h}.md links the guide`);
    assert.ok(pt.includes('npx wize-dev-kit hydrate'), `${h}.pt-BR.md`);
    assert.ok(pt.includes('](../WORKTREES.pt-BR.md)'), `${h}.pt-BR.md links the guide`);
  }
  assert.match(read('docs/harnesses/claude-code.md'), /hooks install --claude/);
  assert.match(read('docs/harnesses/cursor.md'), /hooks install --cursor/);
  assert.match(read('docs/harnesses/codex.md'), /hooks print codex/);
  assert.match(read('docs/harnesses/copilot.md'), /copilot-setup-steps\.yml/);
});

test('codex history note no longer sends an old install to a bare `update`', () => {
  for (const f of ['docs/harnesses/codex.md', 'docs/harnesses/codex.pt-BR.md']) {
    const text = read(f);
    assert.ok(!/run `npx wize-dev-kit update` (to fix|pra corrigir)/.test(text), f);
    assert.match(text, /update --pr/, f);
  }
});

test('ARCH and the dependencies note describe the 0.27.0 behavior', () => {
  const arch = read('ARCH.md');
  assert.match(arch, /update\s+# converge: pin \+ \.gitignore \+ bloco AGENTS, via branch isolada\/PR/);
  assert.ok(!arch.includes('# diff + preserva customizações'));
  assert.match(arch, /wize-dev-kit hydrate/);
  const deps = read('.wize/knowledge/document-project/dependencies.md');
  for (const needle of ['stale-while-revalidate', 'fetched_at', 'attempted_at', '10 minutes', 'CI']) {
    assert.ok(deps.includes(needle), `dependencies.md is missing "${needle}"`);
  }
  assert.ok(!/cached 1 hour/.test(deps));
});

test('CHANGELOG top entry is the 0.27.0 release with its migration notes', () => {
  const text = read('CHANGELOG.md');
  const top = text.match(/^## \[([^\]]+)\][^\n]*\n([\s\S]*?)(?=^## \[)/m);
  assert.ok(top, 'no release heading found');
  assert.ok(['Unreleased', '0.27.0'].includes(top[1]), `top entry is ${top[1]}`);
  const body = top[2];
  assert.match(body, /0\.27\.0/);
  for (const h of ['### Added', '### Changed', '### Fixed', '### Migration', '### Breaking notes']) {
    assert.ok(body.includes(h), `top entry is missing ${h}`);
  }
  for (const needle of ['`hydrate`', '`--exit-code`', '`--pr`', '`--in-place`', '`--check`', '`--allow-downgrade`',
    '`hooks install|print`', '`doctor --json`', 'bootstrap block', 'isolated branch', 'idempotent',
    'non-destructive', '.claude/worktrees/', 'update --pr` once']) {
    assert.ok(body.includes(needle), `top entry is missing ${needle}`);
  }
});
