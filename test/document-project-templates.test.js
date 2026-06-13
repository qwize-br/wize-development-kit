// Structural tests for `wize-document-project` templates.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(KIT, 'src/method-skills/1-analysis/wize-document-project/templates');

const REQUIRED_TEMPLATES = {
  'index-template.md': ['Project Overview', 'Generated Documentation', 'Brownfield Baseline'],
  'project-overview-template.md': ['Executive Summary', 'Project Classification', 'Technology Stack Summary'],
  'source-tree-template.md': ['Complete Directory Structure', 'Critical Directories', 'Entry Points'],
  'architecture-template.md': ['Entry Points', 'Components', 'Data Flow', 'Integrations'],
  'component-inventory-template.md': ['Categorization', 'Reuse', 'Design System'],
  'development-guide-template.md': ['Local Setup', 'Development Workflow', 'Conventions'],
  'api-contracts-template.md': ['Overview', 'Endpoints'],
  'data-models-template.md': ['Overview', 'Entities'],
  'deployment-guide-template.md': ['CI/CD', 'Infrastructure', 'Environments'],
  'contribution-guide-template.md': ['Local Setup', 'Conventions', 'Pull Request Process'],
  'deep-dive-template.md': ['Overview', 'Complete File Inventory', 'Data Flow', 'Integration Points', 'Modification Guidance']
};

function readTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf-8');
}

test('all required templates exist', () => {
  for (const name of Object.keys(REQUIRED_TEMPLATES)) {
    assert.ok(fs.existsSync(path.join(TEMPLATES_DIR, name)), `missing template: ${name}`);
  }
});

for (const [name, sections] of Object.entries(REQUIRED_TEMPLATES)) {
  test(`${name} is non-empty and has frontmatter`, () => {
    const content = readTemplate(name);
    assert.ok(content.length > 0, `${name} is empty`);
    assert.ok(content.startsWith('---'), `${name} missing frontmatter start`);
    assert.ok(content.includes('status: baseline'), `${name} missing status: baseline`);
    assert.ok(content.includes('owner:'), `${name} missing owner`);
    assert.ok(content.includes('created:'), `${name} missing created`);
    assert.ok(content.includes('last_refreshed:'), `${name} missing last_refreshed`);
  });

  for (const section of sections) {
    test(`${name} includes section "${section}"`, () => {
      const content = readTemplate(name);
      assert.ok(content.includes(section), `${name} missing section: ${section}`);
    });
  }
}
