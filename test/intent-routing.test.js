/*
 * E09-S03: Intent-based routing tests.
 * Validates that the intent routing table in wize-help/skill.md
 * correctly maps user phrases to skills.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');
const HELP_SKILL = path.join(KIT, 'src/orchestrator-skills/wize-help/skill.md');
const WIZE_SKILL = path.join(KIT, 'src/orchestrator-skills/wize/skill.md');
const PERSONA = path.join(KIT, 'src/orchestrator-skills/wize-orchestrator/persona.md');

function readFile(p) {
  return fs.readFileSync(p, 'utf-8');
}

// Extract the intent table section from the skill.md content.
// Returns the raw text between "### Intent routing table" and the next "## " heading.
function extractIntentTableSection(content) {
  const lines = content.split('\n');
  let inTable = false;
  const tableLines = [];

  for (const line of lines) {
    if (line.includes('### Intent routing table')) {
      inTable = true;
      continue;
    }
    if (inTable && /^##\s/.test(line)) {
      break;
    }
    if (inTable) {
      tableLines.push(line);
    }
  }
  return tableLines.join('\n');
}

// Check that a phrase maps to a skill by verifying both appear on the same table row.
function assertRoute(tableText, phrase, skill) {
  const lines = tableText.split('\n');
  for (const line of lines) {
    if (!line.includes('wize-')) continue;
    const lower = line.toLowerCase();
    if (lower.includes(phrase.toLowerCase()) && line.includes(skill)) {
      return true;
    }
  }
  return false;
}

// ── Structural tests ──

test('wize-help/skill.md contains intent routing table', () => {
  const content = readFile(HELP_SKILL);
  assert.ok(content.includes('### Intent routing table'), 'missing intent routing table section');
  assert.ok(content.includes('intent-based routing'), 'missing intent-based routing section');
  assert.ok(content.includes('phase heuristic'), 'missing phase heuristic fallback section');
});

test('wize/skill.md references intent routing table', () => {
  const content = readFile(WIZE_SKILL);
  assert.ok(content.includes('intent routing table'), 'wize alias missing intent routing reference');
  assert.ok(content.includes('intent-based routing'), 'wize alias missing intent-based routing');
  assert.ok(content.includes('phase heuristic'), 'wize alias missing phase heuristic fallback');
});

test('persona.md includes intent-based routing principle', () => {
  const content = readFile(PERSONA);
  assert.ok(content.includes('Route by intent'), 'persona missing intent routing principle');
  assert.ok(content.includes('intent routing table'), 'persona missing intent table reference');
  assert.ok(content.includes('Harness-aware interaction'), 'persona missing harness-aware principle');
});

// ── Intent mapping tests ──

const tableText = extractIntentTableSection(readFile(HELP_SKILL));

test('intent table section is non-empty', () => {
  assert.ok(tableText.length > 500, `table section too short: ${tableText.length} chars`);
});

test('"quero pesquisar concorrência" routes to wize-market-research', () => {
  assert.ok(assertRoute(tableText, 'concorrência', 'wize-market-research'));
});

test('"cria um PRD" routes to wize-create-prd', () => {
  assert.ok(assertRoute(tableText, 'PRD', 'wize-create-prd'));
});

test('"corrige um bug" routes to wize-quick-dev', () => {
  assert.ok(assertRoute(tableText, 'corrigir bug', 'wize-quick-dev'));
});

test('"roda um pentest" routes to wize-sec-pentest', () => {
  assert.ok(assertRoute(tableText, 'pentest', 'wize-sec-pentest'));
});

test('"me ajuda" (ambiguous) has no direct intent match', () => {
  // "ajuda" is in the meta section, not routing to a skill
  const lines = tableText.split('\n');
  let foundAsSkill = false;
  for (const line of lines) {
    if (!line.includes('wize-')) continue;
    if (line.toLowerCase().includes('ajuda') && line.includes('wize-')) {
      foundAsSkill = true;
    }
  }
  assert.ok(!foundAsSkill, '"ajuda" should not route to a skill — it is a meta action');
});

test('"pesquisar" (genérico) routes to wize-research dispatcher', () => {
  assert.ok(assertRoute(tableText, 'pesquisar', 'wize-research'));
});

test('"arquitetura" routes to wize-create-architecture', () => {
  assert.ok(assertRoute(tableText, 'arquitetura', 'wize-create-architecture'));
});

test('"NFR" routes to wize-nfr-principles', () => {
  assert.ok(assertRoute(tableText, 'NFR', 'wize-nfr-principles'));
});

test('"e2e" routes to wize-qa-generate-e2e-tests', () => {
  assert.ok(assertRoute(tableText, 'e2e', 'wize-qa-generate-e2e-tests'));
});

test('"retrospective" routes to wize-retrospective', () => {
  assert.ok(assertRoute(tableText, 'retrospective', 'wize-retrospective'));
});

test('"implementar story" routes to wize-dev-story', () => {
  assert.ok(assertRoute(tableText, 'implementar story', 'wize-dev-story'));
});

test('"code review" routes to wize-code-review', () => {
  assert.ok(assertRoute(tableText, 'code review', 'wize-code-review'));
});

test('"investigar" routes to wize-investigate', () => {
  assert.ok(assertRoute(tableText, 'investigar', 'wize-investigate'));
});

test('"tech vision" routes to wize-tech-vision', () => {
  assert.ok(assertRoute(tableText, 'tech vision', 'wize-tech-vision'));
});

test('"epics" routes to wize-create-epics-and-stories', () => {
  assert.ok(assertRoute(tableText, 'epics', 'wize-create-epics-and-stories'));
});

test('"ux design" routes to wize-ux-design', () => {
  assert.ok(assertRoute(tableText, 'ux design', 'wize-ux-design'));
});

test('"cenários de UX" routes to wize-ux-scenarios', () => {
  assert.ok(assertRoute(tableText, 'cenários de UX', 'wize-ux-scenarios'));
});

test('"product brief" routes to wize-product-brief', () => {
  assert.ok(assertRoute(tableText, 'product brief', 'wize-product-brief'));
});

test('"validar prd" routes to wize-validate-prd', () => {
  assert.ok(assertRoute(tableText, 'validar prd', 'wize-validate-prd'));
});

test('"editar prd" routes to wize-edit-prd', () => {
  assert.ok(assertRoute(tableText, 'editar prd', 'wize-edit-prd'));
});

test('"domain research" routes to wize-domain-research', () => {
  assert.ok(assertRoute(tableText, 'domain research', 'wize-domain-research'));
});

test('"tech research" routes to wize-technical-research', () => {
  assert.ok(assertRoute(tableText, 'tech research', 'wize-technical-research'));
});

test('"risk profile" routes to wize-tea-risk', () => {
  assert.ok(assertRoute(tableText, 'risk profile', 'wize-tea-risk'));
});

test('"gate decision" routes to wize-tea-gate', () => {
  assert.ok(assertRoute(tableText, 'gate decision', 'wize-tea-gate'));
});

test('"test design" routes to wize-tea-design', () => {
  assert.ok(assertRoute(tableText, 'test design', 'wize-tea-design'));
});

test('"grill" routes to wize-grill', () => {
  assert.ok(assertRoute(tableText, 'grill', 'wize-grill'));
});

test('"brainstorm" routes to wize-brainstorming', () => {
  assert.ok(assertRoute(tableText, 'brainstorm', 'wize-brainstorming'));
});

test('"documentar projeto" routes to wize-document-project', () => {
  assert.ok(assertRoute(tableText, 'documentar projeto', 'wize-document-project'));
});

test('"trigger map" routes to wize-trigger-map', () => {
  assert.ok(assertRoute(tableText, 'trigger map', 'wize-trigger-map'));
});

test('"PR/FAQ" routes to wize-prfaq', () => {
  assert.ok(assertRoute(tableText, 'PR/FAQ', 'wize-prfaq'));
});

test('"sprint planning" routes to wize-sprint-planning', () => {
  assert.ok(assertRoute(tableText, 'sprint planning', 'wize-sprint-planning'));
});

test('"correct course" routes to wize-correct-course', () => {
  assert.ok(assertRoute(tableText, 'correct course', 'wize-correct-course'));
});

test('"security recon" routes to wize-sec-recon', () => {
  assert.ok(assertRoute(tableText, 'security recon', 'wize-sec-recon'));
});

test('"enumerate" routes to wize-sec-enumerate', () => {
  assert.ok(assertRoute(tableText, 'enumerate', 'wize-sec-enumerate'));
});

test('"design system" routes to wize-design-system', () => {
  assert.ok(assertRoute(tableText, 'design system', 'wize-design-system'));
});

test('"project context" routes to wize-project-context', () => {
  assert.ok(assertRoute(tableText, 'project context', 'wize-project-context'));
});

test('"readiness" routes to wize-check-implementation-readiness', () => {
  assert.ok(assertRoute(tableText, 'readiness', 'wize-check-implementation-readiness'));
});

test('"checkpoint" routes to wize-checkpoint-preview', () => {
  assert.ok(assertRoute(tableText, 'checkpoint', 'wize-checkpoint-preview'));
});

test('"criar story" routes to wize-create-story', () => {
  assert.ok(assertRoute(tableText, 'criar story', 'wize-create-story'));
});

test('"traceability" routes to wize-tea-trace', () => {
  assert.ok(assertRoute(tableText, 'traceability', 'wize-tea-trace'));
});

test('"story review" routes to wize-tea-review', () => {
  assert.ok(assertRoute(tableText, 'story review', 'wize-tea-review'));
});

test('"NFR assessment" routes to wize-tea-nfr', () => {
  assert.ok(assertRoute(tableText, 'NFR assessment', 'wize-tea-nfr'));
});

test('"refresh knowledge" routes to wize-refresh-knowledge', () => {
  assert.ok(assertRoute(tableText, 'refresh knowledge', 'wize-refresh-knowledge'));
});

test('"adversarial review" routes to wize-review-adversarial', () => {
  assert.ok(assertRoute(tableText, 'adversarial review', 'wize-review-adversarial'));
});

test('"edge case" routes to wize-review-edge-case-hunter', () => {
  assert.ok(assertRoute(tableText, 'edge case', 'wize-review-edge-case-hunter'));
});

test('"editorial" routes to wize-editorial-review-prose', () => {
  assert.ok(assertRoute(tableText, 'editorial', 'wize-editorial-review-prose'));
});

test('"editorial structure" routes to wize-editorial-review-structure', () => {
  assert.ok(assertRoute(tableText, 'editorial structure', 'wize-editorial-review-structure'));
});

test('"index docs" routes to wize-index-docs', () => {
  assert.ok(assertRoute(tableText, 'index docs', 'wize-index-docs'));
});

test('"shard doc" routes to wize-shard-doc', () => {
  assert.ok(assertRoute(tableText, 'shard doc', 'wize-shard-doc'));
});

test('"customize" routes to wize-customize', () => {
  assert.ok(assertRoute(tableText, 'customize', 'wize-customize'));
});

test('"create agent" routes to wize-create-agent', () => {
  assert.ok(assertRoute(tableText, 'create agent', 'wize-create-agent'));
});

test('"create skill" routes to wize-create-skill', () => {
  assert.ok(assertRoute(tableText, 'create skill', 'wize-create-skill'));
});

test('"create workflow" routes to wize-create-workflow', () => {
  assert.ok(assertRoute(tableText, 'create workflow', 'wize-create-workflow'));
});

test('"onboarding" routes to wize-onboarding', () => {
  assert.ok(assertRoute(tableText, 'onboarding', 'wize-onboarding'));
});

test('"party mode" routes to wize-party-mode', () => {
  assert.ok(assertRoute(tableText, 'party mode', 'wize-party-mode'));
});

test('"spec" routes to wize-spec', () => {
  assert.ok(assertRoute(tableText, 'spec', 'wize-spec'));
});

// ── Coverage: every installed skill has at least one intent phrase ──

test('all installed skills have intent table coverage', () => {
  // Collect all skill codes from src/
  const { walk } = require('../tools/installer/validators/walk.js');

  const allWorkflows = [
    ...walk(path.join(KIT, 'src/method-skills'), name => name === 'workflow.md'),
    ...walk(path.join(KIT, 'src/tea-skills'), name => name === 'workflow.md'),
    ...walk(path.join(KIT, 'src/orchestrator-skills'), name => name === 'workflow.md'),
    ...walk(path.join(KIT, 'src/builder-skills'), name => name === 'workflow.md'),
    ...walk(path.join(KIT, 'src/web-overlay'), name => name === 'workflow.md'),
    ...walk(path.join(KIT, 'src/app-overlay'), name => name === 'workflow.md'),
  ];

  const secSkills = [
    ...walk(path.join(KIT, 'src/security-overlay'), name => name === 'skill.md'),
  ];

  const allSkillCodes = new Set();

  for (const file of allWorkflows) {
    const content = readFile(file);
    const m = content.match(/^code:\s+(wize-[a-z-]+)/m);
    if (m) allSkillCodes.add(m[1]);
  }
  for (const file of secSkills) {
    const content = readFile(file);
    const m = content.match(/^code:\s+(wize-[a-z-]+)/m);
    if (m) allSkillCodes.add(m[1]);
  }

  // Skills intentionally not in the intent table:
  const expectedMissing = new Set([
    'wize-help',        // this is the orchestrator itself
    'wize',             // alias for wize-help
    'wize-sprint-status', // covered by "status" meta action
    'wize-sec-red-teamer', // persona, not a direct skill
    'wize-advanced-elicitation', // covered by "grill" + "elicitation"
    // Overlay scaffold/deploy skills — triggered by phase heuristic, not user intent
    'wize-web-scaffold',
    'wize-web-deploy',
    'wize-web-seo-audit',
    'wize-app-scaffold',
    'wize-app-release-channels',
    'wize-app-store-listing',
    'wize-sec-scope',    // security overlay — triggered by phase heuristic, not user intent
  ]);

  const uncovered = [];
  for (const code of allSkillCodes) {
    if (expectedMissing.has(code)) continue;
    if (!tableText.includes(code)) {
      uncovered.push(code);
    }
  }

  assert.deepStrictEqual(uncovered, [],
    `Skills without intent table coverage: ${uncovered.join(', ')}`);
});
