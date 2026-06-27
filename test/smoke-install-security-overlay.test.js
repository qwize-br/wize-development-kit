'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');

// Three adapters that must accept the security-overlay and emit the fixture
// skill `wize-sec-pentest`. The path each one writes is different (per its
// adapter.yaml convention), so we look up the right one for each.
const TARGETS = [
  { code: 'claude-code', base: '.claude/skills' },
  { code: 'codex',       base: '.agents/skills' },
  { code: 'cursor',      base: '.cursor/rules' }
];

for (const t of TARGETS) {
  test(`security-overlay skill emitted by ${t.code} adapter (AC-E01-3)`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `wize-sec-smoke-${t.code}-`));
    const mod = require(path.join(KIT, 'adapters', t.code, 'render.js'));
    mod.render(KIT, root, { profiles: ['core', 'security-overlay'] });

    // Cursor uses .mdc; others use a folder/SKILL.md.
    const skillPath = t.code === 'cursor'
      ? path.join(root, t.base, 'wize-sec-pentest.mdc')
      : path.join(root, t.base, 'wize-sec-pentest/SKILL.md');
    assert.ok(fs.existsSync(skillPath),
      `${t.code} must emit wize-sec-pentest under ${t.base} when security-overlay is in profiles`);

    fs.rmSync(root, { recursive: true, force: true });
  });
}

test('security-overlay NOT emitted when profile is absent (regression)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-sec-nosmoke-'));
  const mod = require(path.join(KIT, 'adapters', 'claude-code', 'render.js'));
  mod.render(KIT, root, { profiles: ['core'] });
  const skillPath = path.join(root, '.claude/skills/wize-sec-pentest/SKILL.md');
  assert.ok(!fs.existsSync(skillPath),
    'wize-sec-pentest must NOT be emitted without security-overlay profile');
  fs.rmSync(root, { recursive: true, force: true });
});

test('npm run validate stays green with security-overlay fixture present', () => {
  const r = require('node:child_process').spawnSync('npm', ['run', 'validate'], {
    cwd: KIT,
    encoding: 'utf8',
    timeout: 60_000
  });
  assert.equal(r.status, 0, `validate exited ${r.status}\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
  assert.match(r.stdout, /All structural checks passed/);
});
