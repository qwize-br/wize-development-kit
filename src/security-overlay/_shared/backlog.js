'use strict';

// backlog.js — turns classified security findings into a remediation
// backlog (epics + stories) that wize-create-epics-and-stories can consume.
//
// Design (per brief-post-scan):
//   - Group findings by theme/section, NOT 1-story-per-finding (97 secrets
//     => 1 "rotate secrets" story, not 97).
//   - Priority P0/P1/P2 derived from the worst severity in the group.
//   - Each story keeps traceability to the source findings + scope hash.
//   - Seed epics from the AI action plan (ai-insights.json) when present.
//   - Zero-dep, file-first. The overlay never invokes a skill — it prints
//     a clear CTA command for the user/agent to run.

const CTA_COMMAND = '/wize-create-epics-and-stories --from .wize/security/security-backlog.md';

// Severity -> remediation priority.
function priorityFor(severity) {
  switch (severity) {
    case 'Critical':
    case 'High':
      return 'P0';
    case 'Medium':
      return 'P1';
    default:
      return 'P2'; // Low, Info-surface, None, unknown
  }
}

// Group size -> rough estimate.
function estimateFor(count) {
  if (count <= 2) return 'S';
  if (count <= 10) return 'M';
  return 'L';
}

// Human label + remediation intent per section.
const SECTION_THEME = {
  secrets: { theme: 'Rotacionar e remover segredos expostos', owasp: 'A07:2021' },
  deps: { theme: 'Atualizar dependências vulneráveis', owasp: 'A06:2021' },
  nuclei: { theme: 'Corrigir vulnerabilidades detectadas (nuclei)', owasp: null },
  nikto: { theme: 'Hardening de servidor web (nikto)', owasp: 'A05:2021' },
  sqlmap: { theme: 'Corrigir injeção SQL', owasp: 'A03:2021' },
  ffuf: { theme: 'Revisar endpoints/arquivos descobertos', owasp: 'A05:2021' },
  tech: { theme: 'Hardening: ocultar fingerprinting de versões', owasp: 'A05:2021' },
  open_ports: { theme: 'Revisar exposição de portas/serviços', owasp: 'A05:2021' },
  surface: { theme: 'Revisar superfície HTTP exposta', owasp: 'A05:2021' }
};

// Severity rank for "worst in group".
const SEV_RANK = { Critical: 5, High: 4, Medium: 3, Low: 2, 'Info-surface': 1, None: 0, unknown: 0 };

// groupFindings(findings) -> [{ section, theme, owasp, count, priority,
//   worstSeverity, findings: [...] }] sorted by priority then count.
function groupFindings(findings) {
  const bySection = {};
  for (const f of findings || []) {
    const s = f.section || 'unknown';
    if (!bySection[s]) bySection[s] = [];
    bySection[s].push(f);
  }
  const groups = [];
  for (const [section, fs] of Object.entries(bySection)) {
    let worst = 'unknown';
    for (const f of fs) {
      if ((SEV_RANK[f.severity] || 0) > (SEV_RANK[worst] || 0)) worst = f.severity;
    }
    const theme = (SECTION_THEME[section] && SECTION_THEME[section].theme) || `Revisar findings de ${section}`;
    const owasp = SECTION_THEME[section] && SECTION_THEME[section].owasp;
    groups.push({
      section,
      theme,
      owasp,
      count: fs.length,
      worstSeverity: worst,
      priority: priorityFor(worst),
      findings: fs
    });
  }
  // Order: P0 first, then by count desc.
  const pOrder = { P0: 0, P1: 1, P2: 2 };
  groups.sort((a, b) => (pOrder[a.priority] - pOrder[b.priority]) || (b.count - a.count));
  return groups;
}

function escapeMd(s) {
  return String(s == null ? '' : s);
}

// buildBacklog({ findings, actionPlan, scopeSha, generatedAt }) -> markdown.
function buildBacklog({ findings = [], actionPlan = [], scopeSha = '', generatedAt = '' } = {}) {
  const groups = groupFindings(findings);
  const lines = [];

  lines.push('---');
  lines.push('kind: security-remediation-backlog');
  lines.push('owner: red-teamer');
  lines.push(`source_scope_sha256: ${escapeMd(scopeSha)}`);
  lines.push(`generated_at: ${escapeMd(generatedAt)}`);
  lines.push('consumed_by: wize-create-epics-and-stories');
  lines.push('---');
  lines.push('');
  lines.push('# Security Remediation Backlog');
  lines.push('');
  lines.push('Backlog de correção derivado do scan de segurança. Cada epic agrupa findings por tema; cada story rastreia os findings de origem. Prioridade vem da severidade (P0 = Critical/High, P1 = Medium, P2 = Low/informativo).');
  lines.push('');
  lines.push(`> **Próximo passo:** rode \`${CTA_COMMAND}\` para transformar este backlog em stories formais.`);
  lines.push('');

  // Action plan summary (from AI insights) — the executive framing.
  if (actionPlan && actionPlan.length) {
    lines.push('## Plano de ação (resumo)');
    lines.push('');
    for (const a of actionPlan) {
      lines.push(`- **[${escapeMd(a.priority)}] ${escapeMd(a.title)}** — ${escapeMd(a.detail)}`);
    }
    lines.push('');
  }

  // Build a lookup from action plan title keywords to attach detail to epics.
  const planByTheme = {};
  for (const a of (actionPlan || [])) planByTheme[(a.title || '').toLowerCase()] = a;

  const actionable = groups.filter(g => g.worstSeverity !== 'Info-surface' || g.priority !== 'P2' ? true : true);

  if (groups.length === 0) {
    lines.push('## (sem itens)');
    lines.push('');
    lines.push('_Nenhum finding acionável neste scan — no actionable findings._');
    return lines.join('\n');
  }

  // One epic per group.
  let epicN = 0;
  for (const g of groups) {
    epicN++;
    const est = estimateFor(g.count);
    // Find a matching action-plan detail by theme keyword overlap.
    let planDetail = '';
    for (const [title, a] of Object.entries(planByTheme)) {
      const key = g.section;
      if (title.includes(key) || (key === 'secrets' && title.includes('segredo')) ||
          (key === 'deps' && (title.includes('depend') || title.includes('dep'))) ||
          (key === 'tech' && title.includes('fingerprint'))) {
        planDetail = a.detail; break;
      }
    }
    lines.push(`## Epic ${String(epicN).padStart(2, '0')}: ${g.theme} [${g.priority}]`);
    lines.push('');
    lines.push(`- **Prioridade:** ${g.priority} (pior severidade: ${g.worstSeverity})`);
    lines.push(`- **Findings cobertos:** ${g.count}`);
    if (g.owasp) lines.push(`- **OWASP:** ${g.owasp}`);
    lines.push(`- **Estimativa:** ${est}`);
    if (planDetail) lines.push(`- **Como corrigir:** ${planDetail}`);
    lines.push('');
    lines.push('### Stories');
    lines.push('');
    // For large groups, a single remediation story + a verification story.
    lines.push(`- **${g.theme}** (${g.priority}, est ${est}) — corrigir os ${g.count} finding(s) de \`${g.section}\`. _Origem: ${g.section} (${g.count} findings, ${g.worstSeverity})._`);
    lines.push(`- **Verificar correção de ${g.section}** (${g.priority}, est S) — re-rodar \`/wize-sec-pentest\` e confirmar que os findings de \`${g.section}\` sumiram (DoD).`);
    lines.push('');
    // Sample of source findings for traceability (cap at 5).
    const sample = g.findings.slice(0, 5);
    lines.push('<details><summary>Findings de origem (amostra)</summary>');
    lines.push('');
    for (const f of sample) {
      lines.push(`- ${escapeMd(f.raw)}`);
    }
    if (g.findings.length > sample.length) {
      lines.push(`- _… e mais ${g.findings.length - sample.length}._`);
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = { buildBacklog, priorityFor, estimateFor, groupFindings, CTA_COMMAND };
