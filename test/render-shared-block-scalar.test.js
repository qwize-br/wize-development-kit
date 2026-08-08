'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { collectAssets, readFrontmatter } = require('../tools/installer/render-shared.js');

// ── helpers ────────────────────────────────────────────────────────────────

function buildAgentKit(descriptionField) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-render-block-'));
  const dir = path.join(root, 'src', 'core', 'agents', 'an-agent');
  fs.mkdirSync(dir, { recursive: true });
  const yaml = [
    'code: wize-agent-example',
    'name: Example Persona',
    'title: Example Title',
    descriptionField,
    'style:',
    '  voice: "terse"',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'agent.yaml'), yaml);
  fs.writeFileSync(path.join(dir, 'persona.md'), '# Example\n\nbody\n');
  return root;
}

function buildSkillKit(frontmatter) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-render-fm-'));
  const dir = path.join(root, 'src', 'core', 'skills', 'a-skill');
  fs.mkdirSync(dir, { recursive: true });
  const content = `---\n${frontmatter}\n---\n\n# A Skill\n\nbody\n`;
  fs.writeFileSync(path.join(dir, 'skill.md'), content);
  return root;
}

// ── readYamlField (agent.yaml) — existing coverage ─────────────────────────

test('readYamlField reads literal block scalars (description: |)', () => {
  const kit = buildAgentKit('description: |\n  First line of the description.\n  Second line continues.');
  const asset = collectAssets(kit, { profiles: ['core'] }).find(a => a.code === 'wize-agent-example');
  assert.ok(asset, 'agent asset collected');
  assert.equal(asset.description, 'First line of the description.\nSecond line continues.');
  assert.ok(!asset.description.includes('|'), 'description must not render the block-scalar indicator');
});

test('rendered agent description never collapses to "— |"', () => {
  const kit = buildAgentKit('description: |\n  Something meaningful here.');
  const asset = collectAssets(kit, { profiles: ['core'] }).find(a => a.code === 'wize-agent-example');
  const rendered = `${asset.name} (${asset.title}) — ${asset.description}`;
  assert.ok(!/—\s*\|\s*$/.test(rendered), 'rendered line must not end in "— |"');
  assert.match(rendered, /Something meaningful here\./);
});

test('readYamlField still reads inline and quoted scalars', () => {
  const inline = buildAgentKit('description: A plain inline description.');
  const a1 = collectAssets(inline, { profiles: ['core'] }).find(a => a.code === 'wize-agent-example');
  assert.equal(a1.description, 'A plain inline description.');

  const quoted = buildAgentKit('description: "A quoted description."');
  const a2 = collectAssets(quoted, { profiles: ['core'] }).find(a => a.code === 'wize-agent-example');
  assert.equal(a2.description, 'A quoted description.');
});

// ── readFrontmatter (skill.md / workflow.md) — new coverage ─────────────────

test('readFrontmatter parses literal block scalar (|)', () => {
  const fm = [
    'code: wize-test-skill',
    'name: Test Skill',
    'description: |',
    '  First line.',
    '  Second line.',
    'module: core'
  ].join('\n');
  const out = readFrontmatter(`---\n${fm}\n---\n\nbody`);
  assert.equal(out.code, 'wize-test-skill');
  assert.equal(out.name, 'Test Skill');
  assert.equal(out.description, 'First line.\nSecond line.');
  assert.equal(out.module, 'core');
});

test('readFrontmatter parses folded block scalar (>)', () => {
  const fm = [
    'code: wize-test-skill',
    'name: Test Skill',
    'description: >',
    '  First line.',
    '  Second line.',
    'module: core'
  ].join('\n');
  const out = readFrontmatter(`---\n${fm}\n---\n\nbody`);
  assert.equal(out.description, 'First line. Second line.');
});

test('readFrontmatter parses inline scalar (regression)', () => {
  const fm = [
    'code: wize-test-skill',
    'name: Test Skill',
    'description: A plain inline description.',
    'module: core'
  ].join('\n');
  const out = readFrontmatter(`---\n${fm}\n---\n\nbody`);
  assert.equal(out.description, 'A plain inline description.');
});

test('readFrontmatter parses quoted scalar (regression)', () => {
  const fm = [
    'code: wize-test-skill',
    'name: Test Skill',
    'description: "A quoted description."',
    'module: core'
  ].join('\n');
  const out = readFrontmatter(`---\n${fm}\n---\n\nbody`);
  assert.equal(out.description, 'A quoted description.');
});

test('readFrontmatter parses mixed inline + block scalars', () => {
  const fm = [
    'code: wize-test-skill',
    'name: Test Skill',
    'description: |',
    '  Block scalar description.',
    '  Multiple lines.',
    'module: core',
    'status: ready',
    'overlay: security'
  ].join('\n');
  const out = readFrontmatter(`---\n${fm}\n---\n\nbody`);
  assert.equal(out.code, 'wize-test-skill');
  assert.equal(out.name, 'Test Skill');
  assert.equal(out.description, 'Block scalar description.\nMultiple lines.');
  assert.equal(out.module, 'core');
  assert.equal(out.status, 'ready');
  assert.equal(out.overlay, 'security');
});

test('readFrontmatter block scalar with blank lines inside', () => {
  const fm = [
    'code: wize-test-skill',
    'description: |',
    '  First paragraph.',
    '',
    '  Second paragraph.',
    'module: core'
  ].join('\n');
  const out = readFrontmatter(`---\n${fm}\n---\n\nbody`);
  assert.equal(out.description, 'First paragraph.\n\nSecond paragraph.');
});

test('readFrontmatter block scalar with chomp indicator (|-)', () => {
  const fm = [
    'code: wize-test-skill',
    'description: |-',
    '  Single line.',
    'module: core'
  ].join('\n');
  const out = readFrontmatter(`---\n${fm}\n---\n\nbody`);
  assert.equal(out.description, 'Single line.');
});

test('readFrontmatter block scalar with indent indicator (|2)', () => {
  const fm = [
    'code: wize-test-skill',
    'description: |2',
    '  Indented content.',
    '  More content.',
    'module: core'
  ].join('\n');
  const out = readFrontmatter(`---\n${fm}\n---\n\nbody`);
  assert.equal(out.description, 'Indented content.\nMore content.');
});

test('readFrontmatter returns empty object for no frontmatter', () => {
  assert.deepEqual(readFrontmatter('just body'), {});
  assert.deepEqual(readFrontmatter('---\n---\nbody'), {});
});

// ── validator: rendered output must not contain "— |" ──────────────────────

function validateNoBarePipe(rendered) {
  return !/—\s*\|\s*$/.test(rendered) && !/—\s*\|/.test(rendered);
}

test('validator rejects "— |" in rendered output', () => {
  assert.ok(!validateNoBarePipe('Pepper Potts (Business Analyst) — |'));
  assert.ok(!validateNoBarePipe('Shuri (Senior Developer) — |'));
  assert.ok(!validateNoBarePipe('Some Agent (Title) — | extra'));
});

test('validator accepts valid rendered output', () => {
  assert.ok(validateNoBarePipe('Pepper Potts (Business Analyst) — Runs Phase 1 analysis.'));
  assert.ok(validateNoBarePipe('Shuri (Senior Developer) — Implements stories.'));
  assert.ok(validateNoBarePipe('wize-spec — core skill: Spec'));
});

// ── integration: collectAssets with skill.md using block scalar ────────────

test('collectAssets reads skill.md with block scalar description', () => {
  const fm = [
    'code: wize-test-skill',
    'name: Test Skill',
    'module: core',
    'description: |',
    '  A block scalar description.',
    '  Second line.'
  ].join('\n');
  const kit = buildSkillKit(fm);
  const asset = collectAssets(kit, { profiles: ['core'] }).find(a => a.code === 'wize-test-skill');
  assert.ok(asset, 'skill asset collected');
  assert.equal(asset.description, 'A block scalar description.\nSecond line.');
  assert.equal(asset.name, 'Test Skill');
});

test('collectAssets reads workflow.md with block scalar description', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-render-wf-'));
  const dir = path.join(root, 'src', 'core', 'workflows', 'a-workflow');
  fs.mkdirSync(dir, { recursive: true });
  const fm = [
    'code: wize-test-workflow',
    'name: Test Workflow',
    'phase: 4-implementation',
    'owner: wize-agent-dev',
    'description: |',
    '  A block scalar description.',
    '  Second line.'
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'workflow.md'), `---\n${fm}\n---\n\n# A Workflow\n\nbody\n`);
  const asset = collectAssets(root, { profiles: ['core'] }).find(a => a.code === 'wize-test-workflow');
  assert.ok(asset, 'workflow asset collected');
  assert.equal(asset.description, 'A block scalar description.\nSecond line.');
  assert.equal(asset.name, 'Test Workflow');
});
