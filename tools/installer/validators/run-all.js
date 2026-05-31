/*
 * Validators — schema + lint + dry-run for kit assets.
 *
 * v0.1 scaffold: minimal structural checks. Real schema validation should
 * use Ajv (json-schema) once a dependency budget is approved.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { walkAgents, walkWorkflows, walkSkills } = require('./walk.js');

function checkAgent(file) {
  const content = fs.readFileSync(file, 'utf-8');
  const errs = [];
  if (!/^code:\s+wize-/m.test(content)) errs.push('missing or invalid "code:" prefix');
  if (!/^name:/m.test(content))         errs.push('missing "name:"');
  if (!/^title:/m.test(content))        errs.push('missing "title:"');
  if (!/^description:/m.test(content))  errs.push('missing "description:"');
  return errs;
}

function checkWorkflow(file) {
  const content = fs.readFileSync(file, 'utf-8');
  const errs = [];
  if (!/^---\s*$/m.test(content))    errs.push('missing YAML frontmatter');
  if (!/^code:\s+wize-/m.test(content)) errs.push('missing or invalid "code:" prefix');
  if (!/^name:/m.test(content))      errs.push('missing "name:"');
  if (!/^owner:/m.test(content) && !/^module:/m.test(content)) errs.push('missing "owner:" or "module:"');
  return errs;
}

function runAll(kitRoot) {
  const KIT = kitRoot || path.resolve(__dirname, '..', '..', '..');
  let failures = 0, checked = 0;

  console.log('\nValidating agents...');
  for (const file of walkAgents(KIT)) {
    checked++;
    const errs = checkAgent(file);
    if (errs.length) {
      failures += errs.length;
      console.log(`  ✖ ${path.relative(KIT, file)}`);
      errs.forEach(e => console.log(`     - ${e}`));
    }
  }

  console.log('\nValidating workflows...');
  for (const file of walkWorkflows(KIT)) {
    checked++;
    const errs = checkWorkflow(file);
    if (errs.length) {
      failures += errs.length;
      console.log(`  ✖ ${path.relative(KIT, file)}`);
      errs.forEach(e => console.log(`     - ${e}`));
    }
  }

  console.log('\nValidating skills...');
  for (const file of walkSkills(KIT)) {
    checked++;
    const errs = checkWorkflow(file);   // same minimal shape
    if (errs.length) {
      failures += errs.length;
      console.log(`  ✖ ${path.relative(KIT, file)}`);
      errs.forEach(e => console.log(`     - ${e}`));
    }
  }

  console.log(`\nChecked ${checked} files.`);
  if (failures) {
    console.log(`✖ ${failures} issue(s) found.`);
    process.exit(1);
  }
  console.log('✓ All structural checks passed.');
}

if (require.main === module) {
  runAll();
}

module.exports = runAll;
