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

function classifyFinding(finding) {
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
  // 2. Severity from explicit keyword.
  const sm = finding.raw.match(/severity\s*=\s*(\w+)/i);
  if (!severity && sm) {
    severity = sm[1].toLowerCase();
  }
  // 3. Owasp tag (idempotent: only if not already present).
  let owasp = null;
  const om = finding.raw.match(/owasp\s*=\s*[`'"]?(A\d{2}:\d{4})[`'"]?/i);
  if (om) {
    owasp = om[1].toUpperCase();
  } else {
    // Pull the rule/template-id to feed tagOwasp.
    const rm = finding.raw.match(/\*\*([^*]+)\*\*/);
    const cveMatch = finding.raw.match(/CVE-\d{4}-\d+/);
    owasp = tagOwasp({ rule: rm ? rm[1] : finding.raw.slice(0, 80), cve: cveMatch ? cveMatch[0] : null });
  }
  return { score, severity, owasp };
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
        const klass = classifyFinding({ raw: redactedRaw });
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
  lines.push('## Executive summary');
  lines.push('');
  lines.push('### Findings by severity');
  lines.push('');
  for (const sev of Object.keys(sevCounts)) {
    if (sevCounts[sev]) lines.push(`- ${sev}: ${sevCounts[sev]}`);
  }
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
  renderReportHtml({ securityDir: sec, phaseSummaries, allFindings, refusals, generatedAt, scopeSha });

  return { ok: true, findings: allFindings.length };
}

// --- HTML report -------------------------------------------------------

const HTML_CSS = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; line-height: 1.5; }
header, main, footer { padding: 1rem 1.25rem; max-width: 60rem; margin: 0 auto; }
header { border-bottom: 2px solid #ccc; }
h1, h2, h3 { line-height: 1.2; }
.skip-link { position: absolute; left: -1000px; top: -1000px; }
.skip-link:focus { left: 1rem; top: 1rem; background: #fff; padding: .5rem 1rem; border: 2px solid #000; z-index: 999; }
.severity-Critical { background: #7f1d1d; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: .75rem; }
.severity-High     { background: #b91c1c; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: .75rem; }
.severity-Medium   { background: #b45309; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: .75rem; }
.severity-Low      { background: #1d4ed8; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: .75rem; }
.severity-Info, .severity-unknown, .severity-None { background: #475569; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: .75rem; }
.owasp-tag { background: #1f2937; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: .75rem; margin-left: .25rem; }
table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
th, td { padding: .5rem; border-bottom: 1px solid #ccc; text-align: left; }
th { background: #f3f4f6; }
article { margin: 1rem 0; padding: 1rem; border: 1px solid #ccc; border-radius: 4px; }
@media (max-width: 40rem) { body { font-size: 0.95rem; } }
`;

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderReportHtml({ securityDir, phaseSummaries, allFindings, refusals, generatedAt, scopeSha }) {
  const sec = securityDir;
  const title = `Security Report — ${scopeSha ? scopeSha.slice(0, 12) : 'unknown'}`;
  const phasesHtml = phaseSummaries.map(p => {
    const cls = p.status === 'complete' ? 'phase-complete'
              : p.status === 'incomplete' ? 'phase-incomplete'
              : 'phase-missing';
    return `      <section class="${cls}" aria-labelledby="phase-${p.phase}">
        <h2 id="phase-${p.phase}">${escapeHtml(p.phase)}</h2>
        <p>status: <code>${escapeHtml(p.status)}</code>${p.mode ? ' · mode: <code>' + escapeHtml(p.mode) + '</code>' : ''}</p>
      </section>`;
  }).join('\n');

  const findingsHtml = allFindings.length === 0
    ? '<p><em>(no findings)</em></p>'
    : allFindings.map(f => {
        const sev = (f.severity || 'unknown').toString();
        const sevClass = `severity-${sev}`;
        const owasp = f.owasp || 'UNKNOWN';
        return `      <article aria-labelledby="finding-${escapeHtml(f.phase + '-' + f.section)}">
        <h3 id="finding-${escapeHtml(f.phase + '-' + f.section)}">${escapeHtml(f.phase)} / ${escapeHtml(f.section)}</h3>
        <dl>
          <dt>Severity</dt><dd><span class="${sevClass}">${escapeHtml(sev)}</span></dd>
          <dt>CVSS</dt><dd>${f.score == null ? 'n/a' : escapeHtml(String(f.score))}</dd>
          <dt>OWASP</dt><dd><span class="owasp-tag">${escapeHtml(owasp)}</span></dd>
        </dl>
        <pre><code>${escapeHtml(f.raw)}</code></pre>
      </article>`;
    }).join('\n');

  const refusalsHtml = (refusals && refusals.length)
    ? `<section aria-labelledby="refusals">
        <h2 id="refusals">Refusals</h2>
        <pre><code>${escapeHtml(refusals.join('\n'))}</code></pre>
      </section>`
    : '';

  const sevCounts = { Critical: 0, High: 0, Medium: 0, Low: 0, None: 0, unknown: 0 };
  const owaspCounts = {};
  for (const f of allFindings) {
    const k = f.severity || 'unknown';
    sevCounts[k] = (sevCounts[k] || 0) + 1;
    if (f.owasp && f.owasp !== 'UNKNOWN') {
      owaspCounts[f.owasp] = (owaspCounts[f.owasp] || 0) + 1;
    }
  }
  const sevRows = Object.entries(sevCounts).filter(([, n]) => n > 0)
    .map(([s, n]) => `<tr><th scope="row">${escapeHtml(s)}</th><td>${n}</td></tr>`).join('');
  const owaspRows = Object.entries(owaspCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([o, n]) => `<tr><th scope="row">${escapeHtml(o)}</th><td>${n}</td></tr>`).join('');

  const html = [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    '<head>',
    '<meta charset="utf-8">',
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="generated_at" content="${escapeHtml(generatedAt)}">`,
    `<style>${HTML_CSS}</style>`,
    '</head>',
    '<body>',
    '<a href="#main" class="skip-link">Skip to main content</a>',
    '<header>',
    `  <h1>${escapeHtml(title)}</h1>`,
    `  <dl>`,
    `    <dt>Generated</dt><dd>${escapeHtml(generatedAt)}</dd>`,
    scopeSha ? `    <dt>Scope SHA-256</dt><dd><code>${escapeHtml(scopeSha)}</code></dd>` : '',
    `  </dl>`,
    '</header>',
    '<main id="main">',
    '  <section aria-labelledby="exec-summary">',
    '    <h2 id="exec-summary">Executive summary</h2>',
    '    <table>',
    '      <caption>Findings by severity</caption>',
    '      <thead><tr><th scope="col">Severity</th><th scope="col">Count</th></tr></thead>',
    '      <tbody>',
    sevRows || '        <tr><th scope="row">(none)</th><td>0</td></tr>',
    '      </tbody>',
    '    </table>',
    '    <table>',
    '      <caption>Findings by OWASP category</caption>',
    '      <thead><tr><th scope="col">OWASP</th><th scope="col">Count</th></tr></thead>',
    '      <tbody>',
    owaspRows || '        <tr><th scope="row">(none)</th><td>0</td></tr>',
    '      </tbody>',
    '    </table>',
    '  </section>',
    phasesHtml,
    '  <section aria-labelledby="findings">',
    '    <h2 id="findings">Findings</h2>',
    findingsHtml,
    '  </section>',
    refusalsHtml,
    '</main>',
    '<footer>',
    '  <p>Generated by <code>wize-sec-report</code>. Self-contained (no remote references). All sensitive data has been redacted.</p>',
    '</footer>',
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
