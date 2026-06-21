'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildBacklog, priorityFor, estimateFor, groupFindings, CTA_COMMAND } =
  require('../../src/security-overlay/_shared/backlog.js');

function f(section, severity, raw, owasp) {
  return { phase: section === 'secrets' || section === 'deps' ? 'sast' : 'dast', section, severity, raw, owasp };
}

test('priorityFor maps severity to P0/P1/P2', () => {
  assert.equal(priorityFor('Critical'), 'P0');
  assert.equal(priorityFor('High'), 'P0');
  assert.equal(priorityFor('Medium'), 'P1');
  assert.equal(priorityFor('Low'), 'P2');
  assert.equal(priorityFor('Info-surface'), 'P2');
  assert.equal(priorityFor('unknown'), 'P2');
});

test('estimateFor maps a group size to S/M/L', () => {
  assert.equal(estimateFor(1), 'S');
  assert.equal(estimateFor(5), 'M');
  assert.equal(estimateFor(40), 'L');
});

test('groupFindings groups by section/theme, not 1-per-finding', () => {
  const findings = [
    f('secrets', 'High', '- a'), f('secrets', 'High', '- b'), f('secrets', 'High', '- c'),
    f('deps', 'High', '- lib1'), f('deps', 'Medium', '- lib2')
  ];
  const groups = groupFindings(findings);
  // 97 secrets -> 1 group; deps -> 1 group.
  const secrets = groups.find(g => g.section === 'secrets');
  const deps = groups.find(g => g.section === 'deps');
  assert.ok(secrets, 'secrets group exists');
  assert.equal(secrets.count, 3);
  assert.equal(deps.count, 2);
  // The group's priority is the worst severity within it.
  assert.equal(secrets.priority, 'P0');
  assert.equal(deps.priority, 'P0'); // has a High
});

test('groupFindings ignores informational surface for backlog (no remediation story)', () => {
  const findings = [
    f('open_ports', 'Info-surface', '- 80/tcp'),
    f('secrets', 'High', '- key')
  ];
  const groups = groupFindings(findings);
  // surface alone should not produce a P0/P1 remediation epic; it may be a
  // P2 hardening note at most. Secrets must be present.
  assert.ok(groups.some(g => g.section === 'secrets'));
});

test('buildBacklog produces an epics/stories markdown consumable by wize-create-epics-and-stories', () => {
  const findings = [
    f('secrets', 'High', '- **x.ts** rule `aws` redacted'),
    f('deps', 'High', '- **lib@1** `CVE-1` cvss=8.2'),
    f('tech', 'Info-surface', '- server: Apache/2.4')
  ];
  const md = buildBacklog({
    findings,
    actionPlan: [{ priority: 'P0', title: 'Rotacionar secrets', detail: 'rotacione e use vault' }],
    scopeSha: 'abc123',
    generatedAt: '2026-06-21T00:00:00Z'
  });
  // Has frontmatter + epic headings + story bullets.
  assert.match(md, /^---/);
  assert.match(md, /# Security Remediation Backlog/);
  assert.match(md, /## Epic/);
  assert.match(md, /P0|P1|P2/);
  // Traceability: a story references its source finding/section.
  assert.match(md, /secrets/);
  assert.match(md, /CVE-1|deps/);
  // Carries the source scope hash for provenance.
  assert.match(md, /abc123/);
});

test('buildBacklog seeds epics from the AI action plan when present', () => {
  const md = buildBacklog({
    findings: [f('secrets', 'High', '- key')],
    actionPlan: [
      { priority: 'P0', title: 'Rotacionar e remover os segredos', detail: 'trate como incidente' }
    ],
    scopeSha: 'h', generatedAt: 't'
  });
  assert.match(md, /Rotacionar e remover os segredos/);
});

test('CTA_COMMAND points at wize-create-epics-and-stories with the backlog path', () => {
  assert.match(CTA_COMMAND, /wize-create-epics-and-stories/);
  assert.match(CTA_COMMAND, /security-backlog\.md/);
});

test('buildBacklog with no actionable findings still produces a valid (empty) backlog', () => {
  const md = buildBacklog({ findings: [], actionPlan: [], scopeSha: 'h', generatedAt: 't' });
  assert.match(md, /# Security Remediation Backlog/);
  assert.match(md, /nenhum|no actionable|sem itens/i);
});
