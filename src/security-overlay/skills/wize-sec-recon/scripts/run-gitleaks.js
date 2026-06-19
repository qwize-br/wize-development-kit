'use strict';

// run-gitleaks.js — SAST secrets via gitleaks. Runs inside the
// wize-sec-recon skill (per the architecture decision that recon hosts
// the no-app-running checks). Writes a redaction into sast.md and stores
// the full gitleaks report in the security dir for the user to inspect.

const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const { filterArgs } = require('../../../_shared/allowlist.js');
const { writePartial, loadPartial } = require('../../../_shared/partial.js');

const REDACTED = '***REDACTED***';

// runGitleaks({ securityDir, scope, active, execFn?, detectFn?, reportFilename? })
//   -> { ok, partialStatus, findingsCount }
async function runGitleaks(opts = {}) {
  const sec = opts.securityDir;
  const scope = opts.scope;
  const active = opts.active === true;
  const reportFilename = opts.reportFilename || 'gitleaks-report.json';

  const execFn = opts.execFn || ((bin, args) => {
    return execFileSync(bin, args, { encoding: 'utf8', timeout: 5 * 60 * 1000 });
  });
  const detectFn = opts.detectFn || require('../../../_shared/detect.js').detectTools;

  const tools = detectFn(['gitleaks']);
  const present = !!(tools.gitleaks && tools.gitleaks.present);

  if (!present) {
    // Update or create sast.md with the degraded_checks entry.
    mergeSast(sec, scope, active, tools, {
      degraded: '- secrets: gitleaks ausente — instale gitleaks e re-rode para scan completo.'
    });
    return { ok: true, partialStatus: 'incomplete', findingsCount: 0 };
  }

  const reportPath = path.join(sec, reportFilename);
  const args = filterArgs('gitleaks', [
    'detect', '--no-banner', '-f', '.', '-r', reportPath
  ]);
  execFn('gitleaks', args, { timeout: 5 * 60 * 1000 });

  // Read the JSON report gitleaks wrote. It is an array of findings.
  let findings = [];
  if (fs.existsSync(reportPath)) {
    try {
      findings = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    } catch (_) {
      findings = [];
    }
  }

  // Build the secrets section from findings — ONLY redacted values.
  const secretLines = findings.map(f => {
    const file = f.File || f.file || '<unknown>';
    const line = f.StartLine || f.startLine || '?';
    const rule = f.RuleID || f.ruleID || 'unknown';
    return `- **${file}** line ${line} rule \`${rule}\` — redacted_value: \`${REDACTED}\``;
  });

  // Merge into existing sast.md (preserve other sections like deps from E05-S02).
  mergeSast(sec, scope, active, tools, {
    secrets: secretLines.length ? secretLines.join('\n') : '_(nenhum secret encontrado)_'
  });
  return { ok: true, partialStatus: secretLines.length ? 'complete' : 'incomplete', findingsCount: secretLines.length };
}

// Helper: load existing sast.md, update the relevant section, and write back.
// Preserves sections that other SAST scripts (e.g. run-osv) added.
function mergeSast(sec, scope, active, tools, update) {
  const existing = loadPartial({ securityDir: sec, phase: 'sast' });
  const sections = {};
  if (existing && existing.body) {
    // Extract known section bodies from the existing partial.
    const re = /## ([a-z_]+)\n\n([\s\S]*?)(?=\n## |$)/g;
    let m;
    while ((m = re.exec(existing.body)) !== null) {
      sections[m[1]] = m[2].trim();
    }
  }
  // Apply updates.
  if (update.degraded) {
    // Append to degraded_checks if present, else create.
    if (sections.degraded_checks) sections.degraded_checks += '\n' + update.degraded;
    else sections.degraded_checks = update.degraded;
  }
  if (update.secrets !== undefined) sections.secrets = update.secrets;

  const status = sections.degraded_checks ? 'incomplete' : 'complete';
  writePartial({
    securityDir: sec,
    phase: 'sast',
    mode: active ? 'active' : 'passive',
    scope,
    status,
    tools,
    sections
  });
}

module.exports = { runGitleaks, mergeSast, REDACTED };

if (require.main === module) {
  require('../../../_shared/cli-runner.js').runFromArgv({
    fn: ({ securityDir, scopePath, active, reportFilename } = {}) => {
      const { loadScope } = require('../../../_shared/scope-gate.js');
      const scope = loadScope(scopePath);
      return runGitleaks({ securityDir, scope, active, reportFilename });
    },
    argMap: { 'securityDir': 'securityDir', 'scope': 'scopePath', 'active': 'active', 'reportFilename': 'reportFilename' }
  });
}
