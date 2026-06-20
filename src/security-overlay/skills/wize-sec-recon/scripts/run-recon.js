'use strict';

// run-recon.js — the nmap portion of the wize-sec-recon skill.
// SAST (gitleaks, osv/grype) is implemented in E05 and lives in
// scripts/run-sast.js (sibling). The orchestrator (wize-sec-pentest) and
// any caller can invoke either script directly; this file only handles
// recon.

const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { assertTargetInScope, ScopeError } = require('../../../_shared/scope-gate.js');
const { filterArgs } = require('../../../_shared/allowlist.js');
const { writePartial } = require('../../../_shared/partial.js');

// Default argument list for nmap. filterArgs() will drop anything not in
// the tool-allowlist, so this list is intentionally explicit and minimal.
function defaultArgs(active) {
  const args = ['-Pn', '-T4'];
  if (active) args.push('-sV');
  else args.push('-sn'); // passive: ping scan only — no port scan, no service detection.
  return args;
}

// Parse a greppable nmap stdout into a markdown list. We only care about
// lines that look like `PORT/PROTO  SERVICE  VERSION`. Ports whose service
// nmap could not fingerprint (`?`, unknown, tcpwrapped, or empty version)
// are flagged for manual investigation — an unidentified open port is a
// medium-priority unknown, not just inventory.
function parseNmapGreppable(stdout) {
  const lines = String(stdout || '').split('\n');
  const out = [];
  for (const line of lines) {
    const m = line.match(/^(\d+\/[a-z]+)\s+(\S+)\s+(.*)$/);
    if (!m) continue;
    const port = m[1];
    const service = m[2];
    const version = m[3].trim();
    const unidentified = /\?$/.test(service) || /^(unknown|tcpwrapped)$/i.test(service) || version === '';
    if (unidentified) {
      out.push(`- **${port}** \`${service}\` — ⚠️ serviço não identificado. **Investigar:** \`lsof -i :${port.split('/')[0]}\` · \`docker ps\` · \`ss -tulpn | grep ${port.split('/')[0]}\``);
    } else {
      out.push(`- **${port}** \`${service}\` — ${version}`);
    }
  }
  return out.join('\n');
}

// runRecon({ securityDir, scope, target, active, execFn?, detectFn? }) ->
//   { ok, partialStatus, mode }
// dependencies are injectable for tests.
async function runRecon(opts = {}) {
  const sec = opts.securityDir;
  const scope = opts.scope;
  const target = opts.target;
  const active = opts.active === true;

  const execFn = opts.execFn || ((bin, args, opt) => {
    return execFileSync(bin, args, { encoding: 'utf8', timeout: 60_000 });
  });
  const detectFn = opts.detectFn || require('../../../_shared/detect.js').detectTools;

  // Gate — propagates ScopeError if scope is invalid.
  const tools = detectFn(['nmap'], { cacheDir: sec });
  const nmapTool = tools.nmap || { present: false };

  // 1. nmap missing -> degraded partial, exit 0.
  if (!nmapTool.present) {
    writePartial({
      securityDir: sec,
      phase: 'recon',
      mode: active ? 'active' : 'passive',
      scope,
      status: 'incomplete',
      tools,
      sections: {
        degraded_checks: 'nmap ausente — instale nmap e re-rode a fase para resultados completos.'
      }
    });
    return { ok: true, partialStatus: 'incomplete', mode: active ? 'active' : 'passive' };
  }

  // 2. target out of scope -> degraded partial, ok=false (gate refused).
  const inScope = assertTargetInScope(scope, { host: target }, { refusalsDir: sec });
  if (!inScope) {
    writePartial({
      securityDir: sec,
      phase: 'recon',
      mode: active ? 'active' : 'passive',
      scope,
      status: 'incomplete',
      tools,
      sections: {
        degraded_checks: `target ${target} recusado pelo gate (host not in allowlist) — ver .wize/security/.refusals.log`
      }
    });
    return { ok: false, partialStatus: 'incomplete', mode: active ? 'active' : 'passive' };
  }

  // 3. happy path: filterArgs + execFile.
  const args = filterArgs('nmap', [...defaultArgs(active), target]);
  const out = execFn('nmap', args, { timeout: 60_000 });
  const portsText = parseNmapGreppable(out && out.stdout ? out.stdout : out);
  const body = portsText || '_(nmap returned no parseable ports)_';

  writePartial({
    securityDir: sec,
    phase: 'recon',
    mode: active ? 'active' : 'passive',
    scope,
    status: 'complete',
    tools,
    sections: { open_ports: body }
  });
  return { ok: true, partialStatus: 'complete', mode: active ? 'active' : 'passive' };
}

// --- CLI entrypoint ------------------------------------------------------

function parseArgv(argv) {
  const out = { active: false, securityDir: null, scopePath: null, target: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--active') out.active = true;
    else if (a === '--target' && argv[i + 1]) { out.target = argv[i + 1]; i++; }
    else if (a.startsWith('--target=')) out.target = a.slice('--target='.length);
    else if (a === '--scope' && argv[i + 1]) { out.scopePath = argv[i + 1]; i++; }
    else if (a.startsWith('--scope=')) out.scopePath = a.slice('--scope='.length);
    else if (a === '--securityDir' && argv[i + 1]) { out.securityDir = argv[i + 1]; i++; }
    else if (a.startsWith('--securityDir=')) out.securityDir = a.slice('--securityDir='.length);
  }
  if (!out.securityDir) out.securityDir = path.join(process.cwd(), '.wize', 'security');
  if (!out.scopePath) out.scopePath = path.join(process.cwd(), '.wize', 'security', 'scope.md');
  if (!out.target) {
    // Default to scope.md dast_target.url host if available.
    out.target = 'localhost';
  }
  return out;
}

async function main() {
  const args = parseArgv(process.argv.slice(2));
  const { loadScope } = require('../../../_shared/scope-gate.js');
  const scope = loadScope(args.scopePath);
  const r = await runRecon({
    securityDir: args.securityDir,
    scope,
    target: args.target,
    active: args.active
  });
  console.log(`recon: partial_status=${r.partialStatus} mode=${r.mode}`);
  process.exit(r.ok ? 0 : 1);
}

if (require.main === module) {
  main().catch(err => {
    console.error('✖ wize-sec-recon:', err && err.message ? err.message : err);
    process.exit(2);
  });
}

module.exports = { runRecon, defaultArgs, parseNmapGreppable };