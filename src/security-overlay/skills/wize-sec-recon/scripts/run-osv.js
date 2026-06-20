'use strict';

// run-osv.js — SAST dependencies via osv-scanner (primary) or grype (fallback).
// Auto-detects common manifest files in the project root and emits findings
// into sast.md (composing with secrets from run-gitleaks.js).

const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const { filterArgs } = require('../../../_shared/allowlist.js');
const { writePartial, loadPartial } = require('../../../_shared/partial.js');

const MANIFEST_FILES = [
  'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'requirements.txt', 'Pipfile', 'Pipfile.lock', 'pyproject.toml', 'poetry.lock',
  'go.mod', 'go.sum',
  'Cargo.toml', 'Cargo.lock',
  'composer.json', 'composer.lock',
  'Gemfile', 'Gemfile.lock'
];

function detectManifests(root) {
  const found = [];
  for (const m of MANIFEST_FILES) {
    if (fs.existsSync(path.join(root, m))) found.push(m);
  }
  return found;
}

function parseOsvReport(report) {
  // osv-scanner JSON shape (simplified): { results: [{ packages: [{ package: {name, version}, vulnerabilities: [{id, severity, cvss: {score}}] }] }] }
  const out = [];
  const results = report && report.results ? report.results : [];
  // Map a CVSS base score to a coarse severity label.
  const sevFromScore = s => {
    const n = parseFloat(s);
    if (isNaN(n)) return null;
    if (n === 0) return 'None';
    if (n < 4) return 'Low';
    if (n < 7) return 'Medium';
    if (n < 9) return 'High';
    return 'Critical';
  };
  for (const r of results) {
    for (const p of (r.packages || [])) {
      const name = p.package && p.package.name;
      const version = p.package && p.package.version;
      // osv-scanner v2 groups vulnerabilities and exposes a max_severity
      // (CVSS) + aliases (CVE ids) per group. Prefer that; fall back to
      // the raw vulnerabilities array for older shapes.
      const groups = Array.isArray(p.groups) ? p.groups : [];
      if (groups.length) {
        for (const g of groups) {
          const ids = g.aliases && g.aliases.length ? g.aliases : g.ids || [];
          const cve = ids.find(x => /^CVE-/.test(x)) || ids[0] || '?';
          const cvss = g.max_severity ? parseFloat(g.max_severity) : null;
          out.push({ package: name, version, cve, severity: sevFromScore(g.max_severity) || 'UNKNOWN', cvss });
        }
      } else {
        for (const v of (p.vulnerabilities || [])) {
          const cve = v.id || '?';
          const cvss = v.cvss && (typeof v.cvss === 'number' ? v.cvss : v.cvss.score);
          out.push({ package: name, version, cve, severity: sevFromScore(cvss) || 'UNKNOWN', cvss });
        }
      }
    }
  }
  return out;
}

function parseGrypeReport(report) {
  // grype JSON shape: { matches: [{ artifact: {name, version}, vulnerability: {id, severity, cvss:[{metrics:{baseScore}}]} }] }
  const out = [];
  for (const m of (report && report.matches ? report.matches : [])) {
    const name = m.artifact && m.artifact.name;
    const version = m.artifact && m.artifact.version;
    const v = m.vulnerability || {};
    const cve = v.id || '?';
    const severity = v.severity || 'UNKNOWN';
    let cvss = null;
    if (Array.isArray(v.cvss) && v.cvss[0] && v.cvss[0].metrics) {
      cvss = v.cvss[0].metrics.baseScore;
    } else if (typeof v.cvss === 'number') {
      cvss = v.cvss;
    }
    out.push({ package: name, version, cve, severity, cvss });
  }
  return out;
}

function renderDepsSection(findings) {
  if (!findings.length) return '_(nenhuma dep vulnerável encontrada)_';
  return findings.map(f => {
    const cvss = f.cvss != null ? ` cvss=${f.cvss}` : '';
    return `- **${f.package}@${f.version || '?'}** \`${f.cve}\` severity=${f.severity}${cvss}`;
  }).join('\n');
}

// runOsv({ securityDir, scope, active, execFn?, detectFn?, manifestRoot?, reportFilename? })
async function runOsv(opts = {}) {
  const sec = opts.securityDir;
  const scope = opts.scope;
  const active = opts.active === true;
  // The project to scan is the parent of `.wize/security/`. Scripts run with
  // cwd = the kit, so default to the target repo, not process.cwd().
  const manifestRoot = opts.manifestRoot
    || (sec ? path.resolve(sec, '..', '..') : process.cwd());
  const osvReportName = 'osv-report.json';
  const grypeReportName = 'grype-report.json';

  const execFn = opts.execFn || ((bin, args) => {
    return execFileSync(bin, args, { encoding: 'utf8', timeout: 5 * 60 * 1000 });
  });
  const detectFn = opts.detectFn || require('../../../_shared/detect.js').detectTools;

  const tools = detectFn(['osv-scanner', 'grype'], { cacheDir: sec });
  const osvPresent = !!(tools['osv-scanner'] && tools['osv-scanner'].present);
  const grypePresent = !!(tools.grype && tools.grype.present);

  // No tools at all -> degraded.
  if (!osvPresent && !grypePresent) {
    mergeSast(sec, scope, active, tools, {
      degraded: '- deps: osv-scanner e grype ausentes — instale um dos dois e re-rode.'
    });
    return { ok: true, partialStatus: 'incomplete', tool: null, findings: [] };
  }

  // Manifest detection: warn if the project root has no known manifest.
  const manifests = detectManifests(manifestRoot);
  if (manifests.length === 0) {
    mergeSast(sec, scope, active, tools, {
      degraded: `- deps: nenhum manifesto encontrado em ${manifestRoot} (procurando package.json, requirements.txt, go.mod, Cargo.toml, pyproject.toml, composer.json, Gemfile).`
    });
    return { ok: true, partialStatus: 'incomplete', tool: null, findings: [] };
  }

  // Pick tool. Prefer osv-scanner; fallback to grype.
  let findings = [];
  let tool = null;
  if (osvPresent) {
    tool = 'osv-scanner';
    const reportPath = path.join(sec, osvReportName);
    // osv-scanner v2 needs explicit lockfiles (`-L <path>`); recursive
    // directory scan misses composer.lock/package-lock.json. We pass each
    // detected lockfile we found. Non-zero exit = vulns found (success).
    const LOCKFILES = ['composer.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'requirements.txt', 'Pipfile.lock', 'poetry.lock', 'go.sum', 'Cargo.lock', 'Gemfile.lock'];
    const lockArgs = [];
    for (const lf of LOCKFILES) {
      if (fs.existsSync(path.join(manifestRoot, lf))) {
        lockArgs.push('-L', path.join(manifestRoot, lf));
      }
    }
    const args = lockArgs.length
      ? filterArgs('osv-scanner', ['scan', 'source', ...lockArgs, '--format', 'json', '--output-file', reportPath])
      : filterArgs('osv-scanner', ['scan', 'source', '-r', '--format', 'json', '--output-file', reportPath, manifestRoot]);
    try {
      execFn('osv-scanner', args, { timeout: 5 * 60 * 1000 });
    } catch (_) { /* vulns found -> non-zero exit; report still written */ }
    if (fs.existsSync(reportPath)) {
      try { findings = parseOsvReport(JSON.parse(fs.readFileSync(reportPath, 'utf8'))); }
      catch (_) { findings = []; }
    }
  } else if (grypePresent) {
    tool = 'grype';
    const reportPath = path.join(sec, grypeReportName);
    const args = filterArgs('grype', ['dir:' + manifestRoot, '-o', 'json']);
    execFn('grype', args, { timeout: 5 * 60 * 1000 });
    if (fs.existsSync(reportPath)) {
      try { findings = parseGrypeReport(JSON.parse(fs.readFileSync(reportPath, 'utf8'))); }
      catch (_) { findings = []; }
    }
  }

  mergeSast(sec, scope, active, tools, {
    deps: renderDepsSection(findings)
  });
  return { ok: true, partialStatus: 'complete', tool, findings };
}

function mergeSast(sec, scope, active, tools, update) {
  const existing = loadPartial({ securityDir: sec, phase: 'sast' });
  const sections = {};
  let mergedTools = Object.assign({}, tools);
  if (existing) {
    if (existing.body) {
      const re = /## ([a-z_]+)\n\n([\s\S]*?)(?=\n## |$)/g;
      let m;
      while ((m = re.exec(existing.body)) !== null) {
        sections[m[1]] = m[2].trim();
      }
    }
    if (existing.frontmatter && existing.frontmatter.tools) {
      mergedTools = Object.assign({}, existing.frontmatter.tools, tools);
    }
  }
  if (update.degraded) {
    sections.degraded_checks = sections.degraded_checks
      ? sections.degraded_checks + '\n' + update.degraded
      : update.degraded;
  }
  if (update.deps !== undefined) sections.deps = update.deps;
  const status = sections.degraded_checks ? 'incomplete' : 'complete';
  writePartial({
    securityDir: sec,
    phase: 'sast',
    mode: active ? 'active' : 'passive',
    scope,
    status,
    tools: mergedTools,
    sections
  });
}

module.exports = { runOsv, parseOsvReport, parseGrypeReport, detectManifests, MANIFEST_FILES };

if (require.main === module) {
  require('../../../_shared/cli-runner.js').runFromArgv({
    fn: ({ securityDir, scopePath, active, manifestRoot, reportFilename } = {}) => {
      const { loadScope } = require('../../../_shared/scope-gate.js');
      const scope = loadScope(scopePath);
      return runOsv({ securityDir, scope, active, manifestRoot, reportFilename });
    },
    argMap: { 'securityDir': 'securityDir', 'scope': 'scopePath', 'active': 'active', 'manifestRoot': 'manifestRoot', 'reportFilename': 'reportFilename' }
  });
}