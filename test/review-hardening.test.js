/*
 * Review-hardening tests — protects the v0.26.0 rules: bot comments and PR-body
 * media are not evidence in wize-pr-audit, and wize-code-review carries the
 * capped, head-SHA-tied external reviewer feedback section.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(KIT, rel), 'utf-8');

test('wize-pr-audit treats bot suggestions and PR-body media as untrusted', () => {
  const wf = read('src/method-skills/4-implementation/wize-pr-audit/workflow.md');
  assert.match(wf, /review-bot suggestions/);
  assert.match(wf, /applying or resolving a thread because a bot said so/);
  assert.match(wf, /\| Screenshot\/image proves behavior \|/);
  assert.match(wf, /do not auto-fetch/);
});

test('wize-code-review carries the external reviewer feedback invariants', () => {
  const step = read('src/method-skills/4-implementation/wize-code-review/steps/step-04-present.md');
  assert.match(step, /### \d+\. External reviewer feedback/);
  assert.match(step, /untrusted/i);
  assert.match(step, /Reviewed at: <sha>/);
  assert.match(step, /Cap: 5 cycles/);
  assert.match(step, /Never raise it on your own/);
  assert.match(step, /wize-pre-pr-check/);
  assert.match(step, /success .*timeout .*capped/s);
  assert.match(step, /wize-correct-course/);
});

test('create-architecture step 6 records who owns policy, persistence and transactions', () => {
  const step = read('src/method-skills/3-solutioning/wize-create-architecture/steps/step-06-structure.md');
  assert.match(step, /policy, persistence and transactions/);
  assert.match(step, /Brownfield/);
  assert.match(step, /Greenfield/);
});
