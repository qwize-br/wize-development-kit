// Sanity coverage across all 9 IDE adapters: each one must export a
// render(kitRoot, projectRoot, opts) function and must actually emit files
// at the path documented in its adapter.yaml (no more "stub printing").

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const ADAPTERS = [
  { code: 'claude-code',  expectFile: (root) => path.join(root, '.claude/skills/wize-orchestrator/SKILL.md') },
  { code: 'antigravity',  expectFile: (root) => path.join(root, '.agent/skills/wize-orchestrator/SKILL.md') },
  { code: 'codex',        expectFile: (root) => path.join(root, '.agents/skills/wize-orchestrator/SKILL.md') },
  { code: 'kimi-code',    expectFile: (root) => path.join(root, '.kimi/skills/wize-orchestrator/SKILL.md') },
  { code: 'cursor',       expectFile: (root) => path.join(root, '.cursor/rules/wize-orchestrator.mdc') },
  { code: 'windsurf',     expectFile: (root) => path.join(root, '.windsurf/rules/wize-orchestrator.md') },
  { code: 'continue',     expectFile: (root) => path.join(root, '.continue/prompts/wize-orchestrator.prompt') },
  { code: 'opencode',     expectFile: (root) => path.join(root, '.opencode/agents/wize-orchestrator.md') },
  { code: 'generic',      expectFile: (root) => path.join(root, '.wize/agents/wize-orchestrator.md') }
];

for (const a of ADAPTERS) {
  test(`adapter ${a.code} emits files at the documented path`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `wize-${a.code}-`));
    const mod = require(path.join(KIT, 'adapters', a.code, 'render.js'));
    assert.strictEqual(typeof mod.render, 'function', `${a.code} must export render()`);
    const r = mod.render(KIT, root, { profiles: ['core', 'web-overlay', 'app-overlay'] });
    assert.ok(Array.isArray(r.written), `${a.code} render() must return { written: [] }`);
    assert.ok(r.written.length > 0, `${a.code} must emit at least one file`);
    assert.ok(fs.existsSync(a.expectFile(root)),
              `${a.code} should have produced ${path.relative(root, a.expectFile(root))}`);
    fs.rmSync(root, { recursive: true, force: true });
  });
}

test('generic adapter emits a root AGENTS.md', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-agentsmd-'));
  const mod = require(path.join(KIT, 'adapters', 'generic', 'render.js'));
  mod.render(KIT, root, { profiles: ['core'] });
  const f = path.join(root, 'AGENTS.md');
  assert.ok(fs.existsSync(f), 'AGENTS.md missing');
  const content = fs.readFileSync(f, 'utf-8');
  assert.match(content, /Wize Development Kit/);
  assert.match(content, /wize-orchestrator/);
  fs.rmSync(root, { recursive: true, force: true });
});

// Anthropic-family adapters must copy companion files (steps/, templates/,
// data/, *.csv, customize.toml, *-template.md) alongside the SKILL.md so
// micro-file workflows like wize-create-architecture can resolve relative
// paths from inside the SKILL body.
const ANTHROPIC = [
  { code: 'claude-code',  base: '.claude' },
  { code: 'antigravity',  base: '.agent' },
  { code: 'codex',        base: '.agents' },
  { code: 'kimi-code',    base: '.kimi' }
];

for (const a of ANTHROPIC) {
  test(`adapter ${a.code} copies companion files (steps/, templates/, *.csv) next to SKILL.md`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `wize-companions-${a.code}-`));
    const mod = require(path.join(KIT, 'adapters', a.code, 'render.js'));
    mod.render(KIT, root, { profiles: ['core'] });

    // micro-file: wize-create-architecture/steps/step-01-init.md
    const step = path.join(root, a.base, 'skills/wize-create-architecture/steps/step-01-init.md');
    assert.ok(fs.existsSync(step),
      `${a.code} should copy steps/step-01-init.md next to SKILL.md (looked at ${step})`);

    // sibling template: wize-market-research/research.template.md
    const tpl = path.join(root, a.base, 'skills/wize-market-research/research.template.md');
    assert.ok(fs.existsSync(tpl),
      `${a.code} should copy research.template.md for wize-market-research`);

    // sibling CSV: wize-document-project/documentation-requirements.csv
    const csv = path.join(root, a.base, 'skills/wize-document-project/documentation-requirements.csv');
    assert.ok(fs.existsSync(csv),
      `${a.code} should copy documentation-requirements.csv for wize-document-project`);

    fs.rmSync(root, { recursive: true, force: true });
  });
}

test('cursor mdc has correct frontmatter shape', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-cursor-'));
  const mod = require(path.join(KIT, 'adapters', 'cursor', 'render.js'));
  mod.render(KIT, root, { profiles: ['core'] });
  const f = path.join(root, '.cursor/rules/wize-orchestrator.mdc');
  const content = fs.readFileSync(f, 'utf-8');
  assert.match(content, /^---\ndescription: /, 'must start with frontmatter');
  assert.match(content, /^alwaysApply: false$/m);
  fs.rmSync(root, { recursive: true, force: true });
});

test('continue prompt has invokable: true', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-cont-'));
  const mod = require(path.join(KIT, 'adapters', 'continue', 'render.js'));
  mod.render(KIT, root, { profiles: ['core'] });
  const f = path.join(root, '.continue/prompts/wize-orchestrator.prompt');
  const content = fs.readFileSync(f, 'utf-8');
  assert.match(content, /^invokable: true$/m);
  fs.rmSync(root, { recursive: true, force: true });
});

test('opencode emits orchestrator as primary mode and other agents as subagent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-oc-'));
  const mod = require(path.join(KIT, 'adapters', 'opencode', 'render.js'));
  mod.render(KIT, root, { profiles: ['core'] });
  const orch = fs.readFileSync(path.join(root, '.opencode/agents/wize-orchestrator.md'), 'utf-8');
  const dev  = fs.readFileSync(path.join(root, '.opencode/agents/wize-agent-dev.md'), 'utf-8');
  assert.match(orch, /^mode: primary$/m, 'orchestrator should be primary');
  assert.match(dev,  /^mode: subagent$/m, 'dev should be subagent');
  fs.rmSync(root, { recursive: true, force: true });
});
