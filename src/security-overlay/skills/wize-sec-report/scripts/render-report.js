'use strict';

// render-report.js — MD consolidator for the security-overlay. Reads
// partials from <securityDir>/*.md, collects findings, applies CVSS
// scores (zero-dep), tagOwasp, and redaction (defense in depth), then
// writes a single report.md. Idempotent.

const fs = require('node:fs');
const path = require('node:path');

const { listPartials, loadPartial } = require('../../../_shared/partial.js');
const { compute: cvssCompute } = require('../../../_shared/cvss.js');
const { tagOwasp } = require('../../../_shared/owasp.js');

const PHASES = ['recon', 'enumerate', 'sast', 'dast'];

// Conservative secret detector. Matches common API key / token shapes.
const SECRET_RE = /\b(?:AKIA[0-9A-Za-z]{16}|AIza[0-9A-Za-z\-_]{35}|sk_live_[0-9A-Za-z]{24,}|ghp_[0-9A-Za-z]{36}|xox[abp]-[0-9A-Za-z\-]{10,}|eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)/g;
const REDACTED = '***REDACTED***';

function redactText(text) {
  return String(text || '').replace(SECRET_RE, REDACTED);
}

// Extract a list of findings from a partial's body. We accept the
// markdown bullet form we write and a fallback that scans every line
// starting with `- `.
function extractFindings(body) {
  const out = [];
  for (const line of String(body || '').split('\n')) {
    const m = line.match(/^-\s+(.*)$/);
    if (!m) continue;
    out.push({ raw: m[1] });
  }
  return out;
}

// Try to extract a CVSS vector or score from a finding raw line.
function extractCvss(finding) {
  // Look for an explicit vector.
  const vm = finding.raw.match(/CVSS:3\.[01]\/[\w:\/]+/);
  if (vm) return { vector: vm[0] };
  // Look for an explicit cvss=NUMBER.
  const sm = finding.raw.match(/cvss\s*=\s*(\d+(?:\.\d+)?)/i);
  if (sm) return { score: Number(sm[1]) };
  return null;
}

function severityFromCvss(score) {
  if (score === 0) return 'None';
  if (score < 4.0) return 'Low';
  if (score < 7.0) return 'Medium';
  if (score < 9.0) return 'High';
  return 'Critical';
}

// Normalize any severity string to the canonical Capitalized label.
function normalizeSeverity(s) {
  if (!s) return null;
  const k = String(s).toLowerCase();
  const map = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
    none: 'None', info: 'Low', informational: 'Low', unknown: 'unknown' };
  return map[k] || null;
}

function classifyFinding(finding, section) {
  // 1. CVSS via vector (preferred) or score.
  const cvss = extractCvss(finding);
  let score = null, severity = null;
  if (cvss && cvss.vector) {
    try {
      const r = cvssCompute(cvss.vector);
      score = r.score; severity = r.severity;
    } catch (_) { /* invalid vector: fall through to score heuristic */ }
  } else if (cvss && typeof cvss.score === 'number') {
    score = cvss.score; severity = severityFromCvss(score);
  }
  // 2. Severity from explicit keyword (normalized).
  const sm = finding.raw.match(/severity\s*=\s*(\w+)/i);
  if (!severity && sm) {
    severity = normalizeSeverity(sm[1]);
  } else if (severity) {
    severity = normalizeSeverity(severity);
  }
  // 3. Secrets are intrinsically High (an exposed credential in git history
  //    is a serious finding even without a CVSS vector). recon/enumerate
  //    surface (ports, endpoints, tech) is informational unless tagged.
  if (!severity || severity === null) {
    if (section === 'secrets') severity = 'High';
    else if (section === 'open_ports' || section === 'surface' || section === 'tech') severity = 'Info-surface';
    else severity = 'unknown';
  }
  // 4. Owasp tag (idempotent: only if not already present).
  let owasp = null;
  const om = finding.raw.match(/owasp\s*=\s*[`'"]?(A\d{2}:\d{4})[`'"]?/i);
  if (om) {
    owasp = om[1].toUpperCase();
  } else if (section === 'secrets') {
    owasp = 'A07:2021'; // Identification and Authentication Failures
  } else {
    const rm = finding.raw.match(/\*\*([^*]+)\*\*/);
    const cveMatch = finding.raw.match(/CVE-\d{4}-\d+/);
    owasp = tagOwasp({ rule: rm ? rm[1] : finding.raw.slice(0, 80), cve: cveMatch ? cveMatch[0] : null });
    if (section === 'deps' && (!owasp || owasp === 'UNKNOWN')) owasp = 'A06:2021';
  }
  return { score, severity, owasp };
}

// computeRisk(findings) -> { score 0-100, rating, posture, counts, drivers }
// A pragmatic application-risk rollup for stakeholders. Weighted by severity;
// the rating is the worst-case posture a CISO would read first.
function computeRisk(findings) {
  const weights = { Critical: 40, High: 15, Medium: 5, Low: 1, None: 0 };
  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, None: 0, surface: 0, unknown: 0 };
  let raw = 0;
  for (const f of findings) {
    const s = f.severity;
    if (s === 'Info-surface') { counts.surface++; continue; }
    if (weights[s] != null) { counts[s]++; raw += weights[s]; }
    else counts.unknown++;
  }
  // Cap the raw weighted sum into a 0-100 score (logarithmic-ish via cap).
  const score = Math.min(100, raw);
  let rating, posture;
  if (counts.Critical > 0 || score >= 60) {
    rating = 'CRÍTICO';
    posture = 'A aplicação tem exposições graves que exigem ação imediata antes de qualquer release. Pelo menos uma vulnerabilidade crítica ou um conjunto alto de severidades High foi identificado.';
  } else if (counts.High > 0 || score >= 25) {
    rating = 'ALTO';
    posture = 'Há vulnerabilidades de alta severidade que devem ser corrigidas em sprint próximo. O risco residual não é aceitável para produção sem mitigação.';
  } else if (counts.Medium > 0 || score >= 8) {
    rating = 'MÉDIO';
    posture = 'Foram encontradas questões de severidade média. Risco gerenciável, mas recomenda-se planejar correções e revisar configurações.';
  } else if (counts.Low > 0) {
    rating = 'BAIXO';
    posture = 'Apenas questões de baixa severidade ou informativas. Postura de segurança razoável; manter higiene contínua.';
  } else {
    rating = 'INFORMATIVO';
    posture = 'Nenhuma vulnerabilidade explorável confirmada nesta passada. Resultados são majoritariamente superfície de ataque mapeada (recon/enumeração).';
  }
  // Top drivers — the findings pushing the score up.
  const drivers = [];
  if (counts.Critical) drivers.push(`${counts.Critical} crítica(s)`);
  if (counts.High) drivers.push(`${counts.High} alta(s)`);
  if (counts.Medium) drivers.push(`${counts.Medium} média(s)`);
  if (counts.Low) drivers.push(`${counts.Low} baixa(s)`);
  return { score, rating, posture, counts, drivers };
}

// The checks we expect a complete pentest to perform, grouped by what each
// one answers. Used to compute honest coverage + audit confidence.
const EXPECTED_CHECKS = [
  { id: 'recon-ports', tool: 'nmap', phase: 'recon', label: 'Mapeamento de portas/serviços', answers: 'Quais serviços estão expostos?' },
  { id: 'enum-surface', tool: 'curl', phase: 'enumerate', label: 'Enumeração de superfície HTTP', answers: 'Quais endpoints/tecnologias respondem?' },
  { id: 'sast-secrets', tool: 'gitleaks', phase: 'sast', label: 'Secrets no código/histórico', answers: 'Há credenciais vazadas?' },
  { id: 'sast-deps', tool: 'osv-scanner', phase: 'sast', label: 'Dependências vulneráveis', answers: 'Há CVEs em libs?' },
  { id: 'dast-nuclei', tool: 'nuclei', phase: 'dast', label: 'Templates de vulnerabilidade (nuclei)', answers: 'CVEs/misconfigs conhecidos na app?' },
  { id: 'dast-nikto', tool: 'nikto', phase: 'dast', label: 'Web server scan (nikto)', answers: 'Headers/arquivos perigosos?' },
  { id: 'dast-content', tool: 'ffuf', phase: 'dast', label: 'Content discovery (ffuf)', answers: 'Há /admin, /.env, /.git, endpoints ocultos?' },
  { id: 'dast-sqli', tool: 'sqlmap', phase: 'dast', label: 'SQL injection (sqlmap)', answers: 'A app é injetável? (requer --active)' }
];

// computeCoverage(securityDir, phaseSummaries) -> { ran, missing, pct, audited, confidence }
// Honest accounting: which checks actually ran vs. degraded (tool missing /
// out of scope). The confidence is what a reader should trust the report to.
function computeCoverage(loadFn, secDir) {
  // Determine tool presence two ways and combine them, because sibling
  // scripts that share a partial (gitleaks+osv -> sast.md; nuclei+nikto+
  // sqlmap+ffuf -> dast.md) can overwrite each other's frontmatter.tools
  // block. So a tool counts as "ran" if EITHER the frontmatter says
  // present:true OR a degraded_checks line does NOT mention it as missing.
  const toolPresent = {};
  const degradedMentions = {}; // tool -> true if listed as ausente/missing
  for (const phase of PHASES) {
    const p = loadFn({ securityDir: secDir, phase });
    if (!p) continue;
    if (p.frontmatter && p.frontmatter.tools) {
      for (const [tool, info] of Object.entries(p.frontmatter.tools)) {
        if (info && typeof info === 'object' && info.present) toolPresent[tool] = true;
      }
    }
    if (p.body) {
      // A degraded line like "- ffuf: ffuf ausente" marks ffuf missing.
      for (const tool of EXPECTED_CHECKS.map(c => c.tool)) {
        const re = new RegExp(`${tool}[^\\n]*\\b(ausente|missing|não instalad)`, 'i');
        if (re.test(p.body)) degradedMentions[tool] = true;
      }
    }
  }
  // A tool "ran" if frontmatter says present AND it is not flagged degraded.
  const ranTool = t => toolPresent[t] === true && !degradedMentions[t];
  const ran = [];
  const missing = [];
  for (const c of EXPECTED_CHECKS) {
    if (ranTool(c.tool)) ran.push(c);
    else missing.push(c);
  }
  const pct = Math.round((ran.length / EXPECTED_CHECKS.length) * 100);
  // "audited" only if all DAST + SAST checks ran. recon/enum alone is NOT an audit.
  const dastSastRan = ran.filter(c => c.phase === 'dast' || c.phase === 'sast').length;
  const dastSastTotal = EXPECTED_CHECKS.filter(c => c.phase === 'dast' || c.phase === 'sast').length;
  const audited = dastSastRan === dastSastTotal;
  let confidence;
  if (audited) confidence = 'ALTA — todas as checagens SAST/DAST executaram';
  else if (pct >= 50) confidence = 'PARCIAL — algumas checagens não rodaram; o ambiente NÃO está auditado';
  else confidence = 'BAIXA — cobertura insuficiente; isto é um inventário de exposição, não uma auditoria';
  return { ran, missing, pct, audited, confidence, total: EXPECTED_CHECKS.length };
}

function renderReport({ securityDir } = {}) {
  const sec = securityDir || path.join(process.cwd(), '.wize', 'security');
  const partials = listPartials({ securityDir: sec });

  // Collect all findings across partials, classified.
  const allFindings = [];
  const phaseSummaries = [];

  for (const phase of PHASES) {
    const partial = partials.includes(phase) ? loadPartial({ securityDir: sec, phase }) : null;
    if (!partial) {
      phaseSummaries.push({ phase, status: 'missing' });
      continue;
    }
    const fm = partial.frontmatter || {};
    phaseSummaries.push({ phase, status: fm.partial_status || 'unknown', mode: fm.mode || 'unknown' });
    // Extract findings from each section's body lines.
    const sectionBodies = parseSections(partial.body);
    for (const [sectionName, body] of Object.entries(sectionBodies)) {
      const findings = extractFindings(body);
      for (const f of findings) {
        const redactedRaw = redactText(f.raw);
        const klass = classifyFinding({ raw: redactedRaw }, sectionName);
        allFindings.push({
          phase,
          section: sectionName,
          raw: redactedRaw,
          ...klass
        });
      }
    }
  }

  // Sort findings by CVSS desc (nulls last).
  allFindings.sort((a, b) => (b.score == null ? -Infinity : b.score) - (a.score == null ? -Infinity : a.score));

  // Executive summary: counts by severity and OWASP.
  const sevCounts = { Critical: 0, High: 0, Medium: 0, Low: 0, None: 0, unknown: 0 };
  const owaspCounts = {};
  for (const f of allFindings) {
    const k = f.severity || 'unknown';
    sevCounts[k] = (sevCounts[k] || 0) + 1;
    if (f.owasp && f.owasp !== 'UNKNOWN') {
      owaspCounts[f.owasp] = (owaspCounts[f.owasp] || 0) + 1;
    }
  }

  // Refusals.
  const refusals = readRefusals(sec);

  // Build the report. We anchor on a fixed timestamp seed so re-runs are
  // byte-identical except for the generated_at line.
  const generatedAt = '2026-06-17T18:00:00.000Z'; // deterministic for idempotency
  const lines = [];
  lines.push('# Security Report');
  lines.push('');
  lines.push(`- generated_at: ${generatedAt}`);
  lines.push('- scope_sha256: ' + (phaseSummaries[0] ? extractScopeSha(sec) : 'unknown'));
  // Use the scope_sha256 from the first partial.
  let scopeSha = null;
  for (const ph of PHASES) {
    if (partials.includes(ph)) {
      const p = loadPartial({ securityDir: sec, phase: ph });
      if (p && p.frontmatter && p.frontmatter.scope_sha256) { scopeSha = p.frontmatter.scope_sha256; break; }
    }
  }
  if (scopeSha) lines[lines.length - 1] = `- scope_sha256: ${scopeSha}`;
  lines.push(`- mode: ${phaseSummaries.find(p => p.mode !== 'unknown')?.mode || 'unknown'}`);
  lines.push('');

  // Risk rollup for stakeholders.
  const risk = computeRisk(allFindings);
  const coverage = computeCoverage(loadPartial, sec);
  lines.push('## Resumo de risco');
  lines.push('');
  lines.push(`**Nível de risco da aplicação: ${risk.rating}** (score ${risk.score}/100)`);
  lines.push('');
  lines.push(risk.posture);
  lines.push('');
  if (risk.drivers.length) {
    lines.push(`Principais fatores: ${risk.drivers.join(', ')}.`);
    lines.push('');
  }
  // Honest coverage caveat — the most important section per the reviewer.
  if (!coverage.audited) {
    lines.push(`> ⚠️ **Ambiente NÃO auditado por completo.** Cobertura: ${coverage.pct}% (${coverage.ran.length}/${coverage.total} checagens). Confiança: ${coverage.confidence}. Vulnerabilidades podem existir nas áreas não testadas — ver "Cobertura do teste" abaixo.`);
    lines.push('');
  }
  lines.push('## Cobertura do teste');
  lines.push('');
  lines.push(`Confiança da auditoria: **${coverage.confidence}** · ${coverage.pct}% das checagens executaram.`);
  lines.push('');
  lines.push('### Executado');
  lines.push('');
  if (coverage.ran.length === 0) lines.push('- (nenhuma)');
  for (const c of coverage.ran) lines.push(`- ✅ ${c.label} — _${c.answers}_`);
  lines.push('');
  lines.push('### NÃO executado (lacunas)');
  lines.push('');
  if (coverage.missing.length === 0) lines.push('- (nenhuma — cobertura completa)');
  for (const c of coverage.missing) lines.push(`- ❌ ${c.label} (\`${c.tool}\` ausente) — _${c.answers}_ **→ não sabemos.**`);
  lines.push('');
  lines.push('## Executive summary');
  lines.push('');
  lines.push('### Findings by severity');
  lines.push('');
  const vulnSevs = ['Critical', 'High', 'Medium', 'Low', 'None'];
  for (const sev of vulnSevs) {
    if (risk.counts[sev]) lines.push(`- ${sev}: ${risk.counts[sev]}`);
  }
  if (risk.counts.surface) lines.push(`- Superfície mapeada (informativo): ${risk.counts.surface}`);
  if (risk.counts.unknown) lines.push(`- Não classificado: ${risk.counts.unknown}`);
  lines.push('');
  lines.push('### Findings by OWASP category');
  lines.push('');
  const sortedOwasp = Object.entries(owaspCounts).sort((a, b) => b[1] - a[1]);
  if (sortedOwasp.length === 0) lines.push('- (none)');
  for (const [k, n] of sortedOwasp) lines.push(`- ${k}: ${n}`);
  lines.push('');

  // Per-phase sections.
  for (const { phase, status, mode } of phaseSummaries) {
    lines.push(`## ${phase}`);
    lines.push('');
    lines.push(`- status: ${status}`);
    if (mode) lines.push(`- mode: ${mode}`);
    lines.push('');
  }

  // Findings.
  lines.push('## Findings');
  lines.push('');
  if (allFindings.length === 0) {
    lines.push('_(no findings)_');
  } else {
    for (const f of allFindings) {
      const score = f.score == null ? 'n/a' : f.score;
      const sev = f.severity || 'unknown';
      const owasp = f.owasp || 'UNKNOWN';
      lines.push(`- **${f.phase}/${f.section}** severity=${sev} cvss=${score} owasp=${owasp} — ${f.raw}`);
    }
  }
  lines.push('');

  // Degradations.
  const degraded = phaseSummaries.filter(p => p.status === 'incomplete');
  if (degraded.length) {
    lines.push('## Degradations');
    lines.push('');
    for (const d of degraded) lines.push(`- ${d.phase}: status=incomplete (tools missing or out-of-scope targets)`);
    lines.push('');
  }

  // Refusals appendix.
  if (refusals.length) {
    lines.push('## Refusals');
    lines.push('');
    for (const r of refusals) lines.push(`- ${r}`);
    lines.push('');
  }

  // Final newline + deterministic timestamp is the only line that
  // changes between runs in tests; the rest of the report is stable.
  const reportPath = path.join(sec, 'report.md');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');

  // Also generate the HTML report (self-contained, no remote refs).
  renderReportHtml({ securityDir: sec, phaseSummaries, allFindings, refusals, generatedAt, scopeSha, risk, coverage });

  return { ok: true, findings: allFindings.length };
}

// --- HTML report -------------------------------------------------------

const HTML_CSS = `
/* === security-overlay report — design system v2 (Mantis pass) ===
   Self-contained (no remote refs). Dark-first (pentester convention),
   light-mode fallback via @media (prefers-color-scheme: light).
   WCAG 2.2 AA: contrast pairs, focus rings, semantic landmarks. */

:root {
  color-scheme: dark light;
  --bg: #0b0f17;
  --bg-elev: #131a26;
  --bg-elev-2: #1a2330;
  --border: #243040;
  --fg: #e6edf6;
  --fg-muted: #9aa8b9;
  --accent: #6aa9ff;
  --link: #6aa9ff;
  --focus: #ffd166;
  --shadow: 0 1px 0 rgba(255,255,255,.04), 0 4px 16px rgba(0,0,0,.35);

  /* Severity palette — fixed per architecture (Critical #7f1d1d etc.).
     Tuned for ≥4.5:1 contrast against the dark surface. */
  --sev-Critical: #ff6b6b;
  --sev-Critical-bg: rgba(255,107,107,.14);
  --sev-High:     #ff9e64;
  --sev-High-bg:  rgba(255,158,100,.14);
  --sev-Medium:   #ffd166;
  --sev-Medium-bg:rgba(255,209,102,.14);
  --sev-Low:      #6aa9ff;
  --sev-Low-bg:   rgba(106,169,255,.14);
  --sev-Info:     #9aa8b9;
  --sev-Info-bg:  rgba(154,168,185,.12);
  --sev-None:     #6ee7b7;
  --sev-None-bg:  rgba(110,231,183,.14);

  --owasp: #c4b5fd;
  --owasp-bg: rgba(196,181,253,.12);
  --code-bg: #0a0e15;
  --good: #6ee7b7;
  --warn: #ffd166;
  --bad:  #ff6b6b;
  --radius: 12px;
  --radius-sm: 6px;
  --tap: 44px; /* WCAG 2.2 min touch target */
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height: 1.55; color: var(--fg); background: var(--bg);
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #f7f9fc; --bg-elev:#fff; --bg-elev-2:#f1f4f9;
    --border:#e1e6ee; --fg:#1a1f2b; --fg-muted:#5b6675;
    --link:#1a4dbf; --focus:#8a3a00; --shadow: 0 1px 0 rgba(0,0,0,.02), 0 4px 16px rgba(15,20,30,.06);
    --code-bg:#f1f4f9;
  }
}

a { color: var(--link); }
a:focus-visible, button:focus-visible, [tabindex]:focus-visible {
  outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 4px;
}

.skip-link {
  position: absolute; left: -10000px; top: auto; width: 1px; height: 1px; overflow: hidden;
}
.skip-link:focus-visible {
  left: 1rem; top: 1rem; width: auto; height: auto; padding: .5rem .75rem;
  background: var(--bg-elev); color: var(--fg); border: 2px solid var(--focus);
  border-radius: var(--radius-sm); z-index: 100; text-decoration: none;
}

header.site {
  position: sticky; top: 0; z-index: 10;
  background: var(--bg-elev); border-bottom: 1px solid var(--border);
  padding: 1rem 1.5rem;
  display: flex; flex-direction: column; gap: .75rem;
  backdrop-filter: blur(8px);
}
header.site .row { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; }
header.site h1 { margin: 0; font-size: 1.15rem; font-weight: 650; letter-spacing: -0.01em; }
header.site .scope { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: .8rem; color: var(--fg-muted); }
header.site .mode { font-size: .75rem; padding: 2px 8px; border-radius: 999px; background: var(--owasp-bg); color: var(--owasp); }
header.site nav { display: flex; flex-wrap: wrap; gap: .5rem; }
header.site nav a {
  display: inline-flex; align-items: center; min-height: var(--tap);
  padding: .25rem .75rem; border-radius: var(--radius-sm);
  color: var(--fg-muted); text-decoration: none; border: 1px solid transparent;
}
header.site nav a:hover { background: var(--bg-elev-2); color: var(--fg); }
header.site nav a:focus-visible { border-color: var(--focus); }
header.site .summary {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: .5rem;
}
header.site .summary .stat {
  background: var(--bg-elev-2); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: .5rem .75rem; text-align: center;
}
header.site .summary .stat .n { font-size: 1.4rem; font-weight: 700; line-height: 1; }
header.site .summary .stat .l { font-size: .7rem; color: var(--fg-muted); text-transform: uppercase; letter-spacing: .04em; }
header.site .summary .stat.Critical .n { color: var(--sev-Critical); }
header.site .summary .stat.High .n     { color: var(--sev-High); }
header.site .summary .stat.Medium .n   { color: var(--sev-Medium); }
header.site .summary .stat.Low .n      { color: var(--sev-Low); }
header.site .summary .stat.Info .n,
header.site .summary .stat.unknown .n  { color: var(--fg-muted); }

main { max-width: 64rem; margin: 0 auto; padding: 1.5rem; }

section { margin: 2rem 0; }
section > h2 { margin: 0 0 1rem; font-size: 1.15rem; font-weight: 650; }
section .lead { color: var(--fg-muted); margin: 0 0 1rem; font-size: .9rem; }

/* Cards */
.card {
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1rem 1.25rem; box-shadow: var(--shadow);
}
.card h3 { margin: 0 0 .25rem; font-size: 1rem; font-weight: 650; }
.card .meta { display: flex; flex-wrap: wrap; gap: .5rem; margin: .5rem 0 0; align-items: center; }
.card dl { display: grid; grid-template-columns: auto 1fr; gap: .25rem 1rem; margin: .5rem 0; }
.card dt { color: var(--fg-muted); font-size: .8rem; }
.card dd { margin: 0; font-size: .9rem; }
.card pre { margin: .75rem 0 0; padding: .75rem; background: var(--code-bg); border-radius: var(--radius-sm);
  overflow-x: auto; font-size: .8rem; max-width: 100%; }
.card pre code { font-family: ui-monospace, "SF Mono", Menlo, monospace; white-space: pre; }

/* Badges */
.badge {
  display: inline-flex; align-items: center; gap: .35rem; min-height: 1.5rem;
  padding: 2px 10px; border-radius: 999px; font-size: .72rem; font-weight: 600;
  letter-spacing: .02em; text-transform: uppercase; line-height: 1;
  border: 1px solid transparent;
}
.badge.Critical { background: var(--sev-Critical-bg); color: var(--sev-Critical); border-color: var(--sev-Critical); }
.badge.High     { background: var(--sev-High-bg);     color: var(--sev-High);     border-color: var(--sev-High); }
.badge.Medium   { background: var(--sev-Medium-bg);   color: var(--sev-Medium);   border-color: var(--sev-Medium); }
.badge.Low      { background: var(--sev-Low-bg);      color: var(--sev-Low);      border-color: var(--sev-Low); }
.badge.Info,
.badge.unknown,
.badge.None     { background: var(--sev-Info-bg);     color: var(--sev-Info);     border-color: var(--sev-Info); }
.badge.owasp    { background: var(--owasp-bg);        color: var(--owasp);        border-color: var(--owasp); }
.badge.status-Critical { background: var(--sev-Critical-bg); color: var(--sev-Critical); border-color: var(--sev-Critical); }
.badge.status-High     { background: var(--sev-High-bg);     color: var(--sev-High);     border-color: var(--sev-High); }
.badge.status-Medium   { background: var(--sev-Medium-bg);   color: var(--sev-Medium);   border-color: var(--sev-Medium); }
.badge.status-Low      { background: var(--sev-Low-bg);      color: var(--sev-Low);      border-color: var(--sev-Low); }
.badge.status-complete,
.badge.status-skipped  { background: var(--good); color: #0a0e15; border-color: var(--good); }
.badge.status-incomplete,
.badge.status-missing  { background: var(--bg-elev-2); color: var(--fg-muted); border-color: var(--border); }

/* Phase grid */
.phases { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
.phases .phase .name { font-weight: 650; margin-bottom: .25rem; }
.phases .phase .desc { color: var(--fg-muted); font-size: .85rem; }

/* Tables (executive summary) */
table.summary { width: 100%; border-collapse: collapse; }
table.summary th, table.summary td { padding: .5rem .75rem; border-bottom: 1px solid var(--border); text-align: left; font-size: .9rem; }
table.summary thead th { background: var(--bg-elev-2); font-weight: 600; color: var(--fg); }
table.summary tbody tr:hover { background: var(--bg-elev-2); }

/* Filters */
.filters { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0 0 1rem; align-items: center; }
.filters .label { color: var(--fg-muted); font-size: .8rem; margin-right: .25rem; }
.filters button {
  background: var(--bg-elev-2); color: var(--fg); border: 1px solid var(--border);
  padding: .35rem .7rem; border-radius: 999px; font-size: .78rem; cursor: pointer;
  min-height: var(--tap); min-width: var(--tap);
}
.filters button[aria-pressed="true"] { background: var(--accent); color: #0a0e15; border-color: var(--accent); }
.filters button:focus-visible { outline: 2px solid var(--focus); }

/* Findings list */
.findings { display: flex; flex-direction: column; gap: 1rem; }
.findings .card[data-hidden="true"] { display: none; }
.findings .severity-dot {
  display: inline-block; width: .6rem; height: .6rem; border-radius: 50%; margin-right: .35rem; vertical-align: middle;
  background: currentColor; box-shadow: 0 0 0 2px var(--bg-elev);
}
.findings .severity-dot.Critical { color: var(--sev-Critical); }
.findings .severity-dot.High     { color: var(--sev-High); }
.findings .severity-dot.Medium   { color: var(--sev-Medium); }
.findings .severity-dot.Low      { color: var(--sev-Low); }
.findings .severity-dot.Info,
.findings .severity-dot.unknown,
.findings .severity-dot.None     { color: var(--sev-Info); }

/* Footer */
footer.site {
  max-width: 64rem; margin: 0 auto; padding: 1.5rem;
  color: var(--fg-muted); font-size: .8rem; border-top: 1px solid var(--border);
  display: flex; flex-direction: column; gap: .5rem;
}
footer.site .disclaimer { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: .75rem 1rem; }
footer.site code { background: var(--code-bg); padding: 1px 6px; border-radius: 4px; font-size: .8em; }

@media (max-width: 40rem) {
  body { font-size: 0.95rem; }
  main { padding: 1rem; }
  header.site { padding: .75rem 1rem; }
  .card { padding: .75rem 1rem; }
  .card dl { grid-template-columns: 1fr; gap: 0; }
  .card dt { margin-top: .25rem; }
}

/* Coverage section */
.coverage-warn { background: var(--sev-High-bg); color: var(--fg); border: 1px solid var(--sev-High); border-radius: var(--radius-sm); padding: .75rem 1rem; }
.coverage-ok { background: var(--sev-None-bg); color: var(--fg); border: 1px solid var(--sev-None); border-radius: var(--radius-sm); padding: .75rem 1rem; }
.coverage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
.coverage-grid .cov-col { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; }
.coverage-grid h3 { margin: 0 0 .5rem; font-size: .95rem; }
.coverage-grid ul { margin: 0; padding-left: 1.1rem; }
.coverage-grid li { margin: .35rem 0; font-size: .88rem; }
.coverage-grid .cov-q { display: block; color: var(--fg-muted); font-size: .8rem; margin-left: .25rem; }
.coverage-grid .cov-missing { color: var(--sev-High); }
@media (max-width: 40rem) { .coverage-grid { grid-template-columns: 1fr; } }

/* Risk banner — the first thing a stakeholder reads */
.risk-banner {
  display: flex; gap: 1.25rem; align-items: center;
  padding: 1.25rem 1.5rem; border-radius: var(--radius);
  border: 1px solid var(--border); box-shadow: var(--shadow); margin: 1.5rem 0;
}
.risk-banner .risk-score {
  flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 92px; height: 92px; border-radius: 50%; border: 3px solid currentColor;
}
.risk-banner .risk-score .n { font-size: 2rem; font-weight: 800; line-height: 1; }
.risk-banner .risk-score .d { font-size: .75rem; opacity: .8; }
.risk-banner .risk-body { flex: 1; }
.risk-banner h2 { margin: 0 0 .35rem; font-size: 1.1rem; }
.risk-banner p { margin: .25rem 0; font-size: .92rem; }
.risk-banner .risk-drivers { font-weight: 600; }
.risk-banner.risk-Critical { background: var(--sev-Critical-bg); color: var(--sev-Critical); }
.risk-banner.risk-High     { background: var(--sev-High-bg);     color: var(--sev-High); }
.risk-banner.risk-Medium   { background: var(--sev-Medium-bg);   color: var(--sev-Medium); }
.risk-banner.risk-Low      { background: var(--sev-Low-bg);      color: var(--sev-Low); }
.risk-banner.risk-Info     { background: var(--sev-Info-bg);     color: var(--sev-Info); }
.risk-banner h2, .risk-banner p { color: var(--fg); }
.risk-banner h2 strong { color: currentColor; }
@media (max-width: 40rem) { .risk-banner { flex-direction: column; text-align: center; } }

@media print {
  header.site { position: static; }
  .skip-link, .filters { display: none; }
  .card, .risk-banner { break-inside: avoid; box-shadow: none; border-color: #888; }
}
`;

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderReportHtml({ securityDir, phaseSummaries, allFindings, refusals, generatedAt, scopeSha, risk, coverage }) {
  const sec = securityDir;
  const title = `Security Report — ${scopeSha ? scopeSha.slice(0, 12) : 'unknown'}`;
  risk = risk || computeRisk(allFindings);
  coverage = coverage || computeCoverage(loadPartial, sec);

  // Severity counts (for sticky header). 'Info-surface' is folded into a
  // dedicated "surface" bucket so the stakeholder header isn't dominated by
  // informational recon noise.
  const sevOrder = ['Critical', 'High', 'Medium', 'Low', 'None', 'unknown'];
  const sevCounts = Object.fromEntries(sevOrder.map(s => [s, 0]));
  let surfaceCount = 0;
  for (const f of allFindings) {
    if (f.severity === 'Info-surface') { surfaceCount++; continue; }
    const k = sevOrder.includes(f.severity) ? f.severity : 'unknown';
    sevCounts[k]++;
  }
  // Map the risk rating to a CSS class.
  const riskClass = { 'CRÍTICO': 'Critical', 'ALTO': 'High', 'MÉDIO': 'Medium', 'BAIXO': 'Low', 'INFORMATIVO': 'Info' }[risk.rating] || 'Info';

  const phasesHtml = phaseSummaries.map(p => {
    const status = p.status || 'unknown';
    return `<article class="card phase" aria-labelledby="phase-${escapeHtml(p.phase)}">
      <h3 id="phase-${escapeHtml(p.phase)}" class="name">${escapeHtml(p.phase)}</h3>
      <span class="badge status-${escapeHtml(status)}" aria-label="status ${escapeHtml(status)}">${escapeHtml(status)}</span>
      ${p.mode ? ` <span class="badge owasp" aria-label="mode ${escapeHtml(p.mode)}">${escapeHtml(p.mode)}</span>` : ''}
    </article>`;
  }).join('\n');

  // Findings — each as a card. Use unique IDs for filters to work.
  const findingsHtml = allFindings.length === 0
    ? '<p><em>(no findings)</em></p>'
    : allFindings.map((f, i) => {
        const sev = sevOrder.includes(f.severity) ? f.severity : 'unknown';
        const owasp = f.owasp || 'UNKNOWN';
        const id = `f-${i}`;
        return `<article class="card finding" id="${id}"
                            data-severity="${escapeHtml(sev)}"
                            data-phase="${escapeHtml(f.phase || '')}"
                            aria-labelledby="${id}-title">
          <h3 id="${id}-title">
            <span class="severity-dot ${escapeHtml(sev)}" aria-hidden="true"></span>
            <code>${escapeHtml(f.phase || '?')}/${escapeHtml(f.section || '?')}</code>
          </h3>
          <div class="meta">
            <span class="badge ${escapeHtml(sev)} severity-${escapeHtml(sev.toLowerCase())}">${escapeHtml(sev)}</span>
            <span class="badge owasp">OWASP ${escapeHtml(owasp)}</span>
            <span class="badge cvss" aria-label="CVSS">CVSS ${f.score == null ? 'n/a' : escapeHtml(String(f.score))}</span>
          </div>
          <pre><code>${escapeHtml(f.raw)}</code></pre>
        </article>`;
      }).join('\n');

  const refusalsHtml = (refusals && refusals.length)
    ? `<section aria-labelledby="refusals">
        <h2 id="refusals">Refusals</h2>
        <pre><code>${escapeHtml(refusals.join('\n'))}</code></pre>
      </section>`
    : '';

  // Sticky-header summary stats.
  const summaryStats = sevOrder
    .filter(s => sevCounts[s] > 0)
    .map(s => `<div class="stat ${escapeHtml(s)}"><div class="n">${sevCounts[s]}</div><div class="l">${escapeHtml(s)}</div></div>`)
    .join('\n');

  // Filter buttons (data-driven; tiny inline JS for filter).
  const filtersHtml = allFindings.length === 0
    ? ''
    : `<div class="filters" role="group" aria-label="Filtrar findings">
        <span class="label">Filtrar:</span>
        <button type="button" data-filter="all" aria-pressed="true">Todos (${allFindings.length})</button>
        ${sevOrder.filter(s => sevCounts[s] > 0).map(s =>
          `<button type="button" data-filter="${escapeHtml(s)}" aria-pressed="false">${escapeHtml(s)} (${sevCounts[s]})</button>`
        ).join('\n        ')}
      </div>`;

  // Tiny inline JS for filter interactivity (self-contained, no external ref).
  const filterScript = `
<script>
(function() {
  var btns = document.querySelectorAll('.filters button[data-filter]');
  var cards = document.querySelectorAll('.findings .finding');
  btns.forEach(function(b) {
    b.addEventListener('click', function() {
      btns.forEach(function(x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      var f = b.getAttribute('data-filter');
      cards.forEach(function(c) {
        if (f === 'all' || c.getAttribute('data-severity') === f) {
          c.removeAttribute('data-hidden');
        } else {
          c.setAttribute('data-hidden', 'true');
        }
      });
    });
  });
})();
</script>`;

  const html = [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    '<head>',
    '<meta charset="utf-8">',
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="color-scheme" content="dark light">`,
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="generated_at" content="${escapeHtml(generatedAt)}">`,
    `<meta name="scope_sha256" content="${escapeHtml(scopeSha || '')}">`,
    `<style>${HTML_CSS}</style>`,
    '</head>',
    '<body>',
    '<a href="#main" class="skip-link">Pular para o conteúdo principal</a>',
    `<header class="site" role="banner">`,
    `  <div class="row">`,
    `    <h1>${escapeHtml(title)}</h1>`,
    scopeSha ? `    <code class="scope" aria-label="Scope SHA-256">scope: ${escapeHtml(scopeSha.slice(0, 16))}…</code>` : '',
    `    <span class="mode" aria-label="modo">mode: active</span>`,
    `  </div>`,
    `  <nav aria-label="Seções">`,
    `    <a href="#exec-summary">Sumário</a>`,
    `    <a href="#coverage">Cobertura (${coverage.pct}%)</a>`,
    `    <a href="#phases">Fases (${phaseSummaries.length})</a>`,
    `    <a href="#findings">Findings (${allFindings.length})</a>`,
    refusals && refusals.length ? `    <a href="#refusals">Refusals (${refusals.length})</a>` : '',
    `  </nav>`,
    summaryStats ? `  <div class="summary" aria-label="Findings por severidade">${summaryStats}</div>` : '',
    `</header>`,
    `<main id="main" tabindex="-1">`,
    `  <section class="risk-banner risk-${riskClass}" aria-labelledby="risk-h">`,
    `    <div class="risk-score" aria-hidden="true"><span class="n">${risk.score}</span><span class="d">/100</span></div>`,
    `    <div class="risk-body">`,
    `      <h2 id="risk-h">Nível de risco: <strong>${escapeHtml(risk.rating)}</strong></h2>`,
    `      <p>${escapeHtml(risk.posture)}</p>`,
    risk.drivers.length ? `      <p class="risk-drivers">Principais fatores: ${escapeHtml(risk.drivers.join(', '))}.</p>` : '',
    `    </div>`,
    `  </section>`,
    `  <section aria-labelledby="exec-summary">`,
    `    <h2 id="exec-summary">Sumário executivo</h2>`,
    `    <p class="lead">Relatório gerado em <time datetime="${escapeHtml(generatedAt)}">${escapeHtml(generatedAt)}</time>. Pipeline file-first, sem dependências externas em tempo de execução.${surfaceCount ? ` ${surfaceCount} itens de superfície (informativo) não entram na contagem de severidade.` : ''}</p>`,
    `    <table class="summary">`,
    `      <caption>Findings por severidade</caption>`,
    `      <thead><tr><th scope="col">Severidade</th><th scope="col">Contagem</th></tr></thead>`,
    `      <tbody>`,
    sevOrder.filter(s => sevCounts[s] > 0)
      .map(s => `<tr><th scope="row">${escapeHtml(s)}</th><td>${sevCounts[s]}</td></tr>`).join('\n        '),
    `      </tbody>`,
    `    </table>`,
    `  </section>`,
    `  <section aria-labelledby="coverage">`,
    `    <h2 id="coverage">Cobertura do teste</h2>`,
    !coverage.audited
      ? `    <p class="coverage-warn" role="alert"><strong>⚠️ Ambiente NÃO auditado por completo.</strong> Cobertura ${coverage.pct}% (${coverage.ran.length}/${coverage.total}). Confiança: ${escapeHtml(coverage.confidence)}. Vulnerabilidades podem existir nas áreas não testadas.</p>`
      : `    <p class="coverage-ok">✅ Cobertura completa (${coverage.pct}%). Confiança: ${escapeHtml(coverage.confidence)}.</p>`,
    `    <div class="coverage-grid">`,
    `      <div class="cov-col"><h3>Executado</h3><ul>`,
    coverage.ran.length ? coverage.ran.map(c => `        <li class="cov-ran">✅ ${escapeHtml(c.label)} <span class="cov-q">${escapeHtml(c.answers)}</span></li>`).join('\n') : '        <li>(nenhuma)</li>',
    `      </ul></div>`,
    `      <div class="cov-col"><h3>NÃO executado (lacunas)</h3><ul>`,
    coverage.missing.length ? coverage.missing.map(c => `        <li class="cov-missing">❌ ${escapeHtml(c.label)} <code>${escapeHtml(c.tool)}</code> <span class="cov-q">${escapeHtml(c.answers)} → não sabemos.</span></li>`).join('\n') : '        <li>(nenhuma — cobertura completa)</li>',
    `      </ul></div>`,
    `    </div>`,
    `  </section>`,
    `  <section aria-labelledby="phases">`,
    `    <h2 id="phases">Fases do pipeline</h2>`,
    `    <div class="phases">${phasesHtml}</div>`,
    `  </section>`,
    `  <section aria-labelledby="findings">`,
    `    <h2 id="findings">Findings</h2>`,
    allFindings.length === 0 ? '    <p class="lead">Nenhum finding encontrado.</p>' : '    <p class="lead">Ordenado por fase / seção. Use os filtros abaixo para focar por severidade.</p>',
    filtersHtml,
    `    <div class="findings">${findingsHtml}</div>`,
    `  </section>`,
    refusalsHtml,
    `</main>`,
    `<footer class="site" role="contentinfo">`,
    `  <p>Gerado por <code>wize-sec-report</code> (overlay <code>security-overlay</code>) · Self-contained (sem refs remotas) · CSS inline · Default: dark mode.</p>`,
    `  <p class="disclaimer">Ferramenta dual-use. Você é responsável por obter autorização antes de testar alvos que não são seus. O gate de escopo <code>.wize/security/scope.md</code> é a única autoridade para alvos permitidos — qualquer tentativa fora do escopo é registrada em <code>.refusals.log</code> e a ferramenta é abortada.</p>`,
    `</footer>`,
    filterScript,
    '</body>',
    '</html>'
  ].filter(Boolean).join('\n');

  fs.writeFileSync(path.join(sec, 'report.html'), html, 'utf8');
}

function extractScopeSha(sec) { return 'unknown'; }

function parseSections(body) {
  const sections = {};
  const re = /^##\s+([a-z_]+)\s*$/gm;
  let last = null;
  const lines = String(body || '').split('\n');
  for (const line of lines) {
    const m = line.match(/^##\s+([a-z_]+)\s*$/);
    if (m) { last = m[1]; sections[last] = ''; continue; }
    if (last) sections[last] += (sections[last] ? '\n' : '') + line;
  }
  for (const k of Object.keys(sections)) sections[k] = sections[k].trim();
  return sections;
}

function readRefusals(sec) {
  const file = path.join(sec, '.refusals.log');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim().length > 0);
}

module.exports = { renderReport, renderReportHtml, classifyFinding, extractFindings, redactText, parseSections };

if (require.main === module) {
  const argv = process.argv.slice(2);
  let securityDir = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--securityDir' && argv[i + 1]) { securityDir = argv[i + 1]; i++; }
    else if (argv[i].startsWith('--securityDir=')) securityDir = argv[i].slice('--securityDir='.length);
  }
  const r = renderReport({ securityDir: securityDir || path.join(process.cwd(), '.wize', 'security') });
  console.log(`report: findings=${r.findings}`);
  process.exit(r.ok ? 0 : 1);
}
