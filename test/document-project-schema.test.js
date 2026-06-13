// Structural tests for project-scan-report JSON schema.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(KIT, 'src/method-skills/1-analysis/wize-document-project/templates/project-scan-report-schema.json');

function loadSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
}

function validateRequired(schema, data) {
  for (const key of schema.required) {
    if (data[key] === undefined) return `missing required: ${key}`;
  }
  return null;
}

test('schema file exists and is valid JSON', () => {
  const schema = loadSchema();
  assert.ok(schema.$schema);
  assert.ok(Array.isArray(schema.required));
});

test('schema requires core fields', () => {
  const schema = loadSchema();
  for (const field of ['workflow_version', 'timestamps', 'mode', 'scan_level', 'completed_steps', 'current_step']) {
    assert.ok(schema.required.includes(field), `missing required field: ${field}`);
  }
});

test('schema supports optional sections', () => {
  const schema = loadSchema();
  for (const field of ['findings', 'outputs_generated', 'resume_instructions', 'validation_status', 'deep_dive_targets']) {
    assert.ok(schema.properties[field], `missing optional property: ${field}`);
  }
});

test('valid state passes required check', () => {
  const schema = loadSchema();
  const valid = {
    workflow_version: '0.3.1',
    timestamps: { started: new Date().toISOString(), last_updated: new Date().toISOString() },
    mode: 'quick',
    scan_level: 'quick',
    completed_steps: [],
    current_step: 'step_1'
  };
  assert.strictEqual(validateRequired(schema, valid), null);
});

test('invalid state missing required fields fails', () => {
  const schema = loadSchema();
  assert.notStrictEqual(validateRequired(schema, {}), null);
  assert.notStrictEqual(validateRequired(schema, { workflow_version: '0.3.1' }), null);
});
