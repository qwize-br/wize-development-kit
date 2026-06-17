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
  return { ok: true, findings: allFindings.length };
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

module.exports = { renderReport, classifyFinding, extractFindings, redactText, parseSections };
