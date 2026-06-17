/*
 * Onboarding handoff — Wizer-driven triage after install.
 *
 * Stub: in v0.1 this just prints the first action Wizer would take.
 * In a real run this would be a workflow executed by the active IDE adapter.
 */
'use strict';

function compose(detection, profiles) {
  const lines = [
    '',
    '╭─ Wizer ─────────────────────────────────────╮',
    '│ Welcome back. What are we working on?       │',
    '╰─────────────────────────────────────────────╯'
  ];
  if (detection.brownfield) {
    lines.push('');
    lines.push('I see this repo already has code. I can ask Pepper and Peggy to baseline it before we plan.');
    lines.push('  → /wize-document-project');
  }
  lines.push('');
  lines.push('When ready, name the next step:');
  lines.push('  → /wize-product-brief          (Pepper)');
  lines.push('  → /wize-create-prd             (Maria Hill, if brief exists)');
  lines.push('  → /wize-create-architecture    (Tony, if PRD exists)');
  lines.push('  → /wize-quick-dev              (Shuri, for small fixes)');
  if (profiles.find(p => p.code === 'web-overlay')) lines.push('  → /wize-web-scaffold           (overlay)');
  if (profiles.find(p => p.code === 'app-overlay')) lines.push('  → /wize-app-scaffold           (overlay)');
  if (profiles.find(p => p.code === 'security-overlay')) lines.push('  → /wize-sec-pentest         (overlay)');
  return lines.join('\n');
}

module.exports = { compose };
