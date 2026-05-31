/*
 * Structural integrity tests for the wize-dev-kit.
 * Uses node:test (built-in). No external test framework required.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');

const EXPECTED_AGENTS = [
  'src/orchestrator-skills/wize-orchestrator/agent.yaml',
  'src/method-skills/1-analysis/wize-agent-analyst/agent.yaml',
  'src/method-skills/1-analysis/wize-agent-tech-writer/agent.yaml',
  'src/method-skills/2-plan-workflows/wize-agent-pm/agent.yaml',
  'src/method-skills/2-plan-workflows/wize-agent-ux-designer/agent.yaml',
  'src/method-skills/3-solutioning/wize-agent-solution-strategist/agent.yaml',
  'src/method-skills/3-solutioning/wize-agent-architect/agent.yaml',
  'src/method-skills/4-implementation/wize-agent-dev/agent.yaml',
  'src/tea-skills/wize-agent-test-architect/agent.yaml'
];

const EXPECTED_TEA_GATES = ['risk', 'design', 'trace', 'nfr', 'review', 'gate'];

const EXPECTED_ADAPTERS = [
  'claude-code', 'cursor', 'windsurf', 'codex',
  'continue', 'kimi-code', 'opencode', 'antigravity', 'generic'
];

test('all 9 agents exist with agent.yaml + persona.md', () => {
  for (const rel of EXPECTED_AGENTS) {
    const full = path.join(KIT, rel);
    assert.ok(fs.existsSync(full), `missing agent.yaml: ${rel}`);
    const personaPath = path.join(path.dirname(full), 'persona.md');
    assert.ok(fs.existsSync(personaPath), `missing persona.md: ${rel}`);
  }
});

test('all 6 TEA gates have workflow folders', () => {
  for (const gate of EXPECTED_TEA_GATES) {
    const dir = path.join(KIT, 'src/tea-skills', `wize-tea-${gate}`);
    const wf = path.join(dir, 'workflow.md');
    assert.ok(fs.existsSync(wf), `missing TEA gate workflow: ${gate}`);
  }
});

test('all 9 IDE adapters present', () => {
  for (const code of EXPECTED_ADAPTERS) {
    const dir = path.join(KIT, 'adapters', code);
    assert.ok(fs.existsSync(path.join(dir, 'adapter.yaml')), `missing adapter.yaml: ${code}`);
    assert.ok(fs.existsSync(path.join(dir, 'render.js')), `missing render.js: ${code}`);
    assert.ok(fs.existsSync(path.join(dir, 'README.md')), `missing README.md: ${code}`);
  }
});

test('top-level docs present', () => {
  for (const f of ['README.md', 'LICENSE', 'CHANGELOG.md', 'ARCH.md', 'ROSTER.md', 'DECISIONS.md', 'package.json']) {
    assert.ok(fs.existsSync(path.join(KIT, f)), `missing top-level: ${f}`);
  }
});

test('CLI binary path resolves', () => {
  const pkg = require(path.join(KIT, 'package.json'));
  assert.ok(pkg.bin && pkg.bin['wize-dev-kit'], 'package.bin.wize-dev-kit not set');
  assert.ok(fs.existsSync(path.join(KIT, pkg.bin['wize-dev-kit'])), 'CLI file does not exist');
});

test('schemas exist', () => {
  for (const f of ['agent.schema.json', 'workflow.schema.json', 'skill.schema.json', 'module.schema.json']) {
    assert.ok(fs.existsSync(path.join(KIT, 'schemas', f)), `missing schema: ${f}`);
  }
});

test('all overlays declare overlay_of: method', () => {
  for (const overlay of ['web-overlay', 'app-overlay']) {
    const yaml = fs.readFileSync(path.join(KIT, 'src', overlay, 'module.yaml'), 'utf-8');
    assert.match(yaml, /overlay_of:\s+method/, `${overlay} should declare overlay_of: method`);
  }
});
