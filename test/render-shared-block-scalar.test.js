'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { collectAssets } = require('../tools/installer/render-shared.js');

// Regression guard for the block-scalar bug: agent.yaml uses `description: |`
// (literal block scalar). The old single-line readYamlField captured the bare
// "|", so every adapter rendered "Name (Title) — |". These tests assert the
// block body is read in full.
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
