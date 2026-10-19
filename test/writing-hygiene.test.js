/*
 * Writing-hygiene tests — protects the v0.25.0 rules: dev text is in scope for
 * wize-no-ai-slop, Shuri carries the skill, pre-pr-check runs it as advisory,
 * and the pattern count lives in one place only.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(KIT, rel), 'utf-8');
const SLOP = 'src/core-skills/wize-no-ai-slop/skill.md';

test('no-ai-slop covers agent-written dev text and keeps artifacts out', () => {
  const text = read(SLOP);
  assert.match(text, /commit messages, PR titles and bodies, code comments, review replies/);
  assert.match(text, /PRD, ADR, story and gate keep their own conventions/);
  assert.match(text, /## Dev text/);
  assert.match(text, /Never touch prose the agent did not write/);
  assert.match(text, /Conventional Commits format and the dev-story PR template stay/);
});

test('no-ai-slop has the chatbot-artifact pattern, actor line and header-list clause', () => {
  const text = read(SLOP);
  assert.match(text, /\n18\. \*\*Chatbot artifacts and sycophancy\*\*/);
  assert.match(text, /\*\*Name the actor\.\*\*/);
  assert.match(text, /bold lead-in ending in a period/);
  assert.ok(!/\b17 patterns\b/.test(text), 'self-check must not hard-code the pattern count');
  assert.match(text, /unslop\]\(https:\/\/github\.com\/michaelshimeles\/skills\/tree\/main\/unslop\)/);
});

test('pattern count stays consistent with the numbered list', () => {
  const text = read(SLOP);
  const n = Math.max(...[...text.matchAll(/^(\d+)\. \*\*/gm)].map((m) => Number(m[1])));
  assert.match(read('src/core-skills/module.yaml'), new RegExp(`removes ${n} AI-generated patterns`));
});

test('Shuri carries no-ai-slop and pre-pr-check runs it as advisory', () => {
  assert.match(read('src/method-skills/4-implementation/wize-agent-dev/agent.yaml'), /^\s+- wize-no-ai-slop/m);
  const pre = read('src/core-skills/wize-pre-pr-check/skill.md');
  assert.match(pre, /Consultivo, nunca bloqueia/);
  assert.ok(pre.includes('wize-no-ai-slop'));
});

test('READMEs credit unslop next to No AI Slop', () => {
  for (const f of ['README.md', 'README.pt-BR.md', 'README.es.md']) {
    const text = read(f);
    assert.match(text, /\[unslop\]\(https:\/\/github\.com\/michaelshimeles\/skills\/tree\/main\/unslop\) (by|por) Lauren Tan \(MIT\)/, f);
  }
});
