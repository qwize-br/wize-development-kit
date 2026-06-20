'use strict';

// run-enumerate.js — second phase: HTTP probing + tech inference from
// the recon partial. Doesn't run any active tools by default.

const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { assertTargetInScope } = require('../../../_shared/scope-gate.js');
const { filterArgs } = require('../../../_shared/allowlist.js');
const { writePartial, loadPartial } = require('../../../_shared/partial.js');

// Parse the recon.md partial's open_ports section into a list of {port, service, version}
// tuples. We accept both the markdown bullet form we write (- **80/tcp** `http` — nginx)
// and a raw `PORT/PROTO SERVICE VERSION` form.
function parseOpenPorts(body) {
  const out = [];
  for (const line of String(body || '').split('\n')) {
    // Markdown bullet form
    let m = line.match(/^- \*\*(\d+\/tcp)\*\* `(\S+)` — (.+?)$/);
    if (m) { out.push({ port: m[1], service: m[2], version: m[3].trim() }); continue; }
    // Raw form
    m = line.match(/^(\d+\/tcp)\s+(\S+)\s+(.+?)$/);
    if (m) out.push({ port: m[1], service: m[2], version: m[3].trim() });
  }
  return out;
}

// Build the URL the enumerator will probe given a port. We don't know the
// protocol from nmap alone; assume http for well-known ports, https for
// 443, otherwise default to http.
function urlForPort(port, host) {
  const portNum = parseInt(port.split('/')[0], 10);
  const scheme = (portNum === 443 || portNum === 8443) ? 'https' : 'http';
  return `${scheme}://${host}:${portNum}/`;
}

// Parse a curl -sI response into a { status, headers } object. We split
// on `\r\n` (curl's default).
function parseCurlHead(stdout) {
  const lines = String(stdout || '').split(/\r?\n/).filter(Boolean);
  const status = (lines[0] || '').trim();
  const headers = {};
  for (const line of lines.slice(1)) {
    const m = line.match(/^([A-Za-z0-9-]+):\s*(.*?)\s*$/);
    if (m) headers[m[1].toLowerCase()] = m[2];
  }
  return { status, headers };
}

// runEnumerate({securityDir, scope, active, execFn?, detectFn?}) ->
//   { ok, partialStatus }
async function runEnumerate(opts = {}) {
  const sec = opts.securityDir;
  const scope = opts.scope;
  const active = opts.active === true;

  const execFn = opts.execFn || ((bin, args) => {
    return execFileSync(bin, args, { encoding: 'utf8', timeout: 10_000 });
  });
  const detectFn = opts.detectFn || require('../../../_shared/detect.js').detectTools;

  const tools = detectFn(['curl', 'nuclei'], { cacheDir: sec });
  const curlPresent = !!(tools.curl && tools.curl.present);
  const nucleiPresent = !!(tools.nuclei && tools.nuclei.present);

  // Load recon.md if it exists.
  const recon = loadPartial({ securityDir: sec, phase: 'recon' });
  const openPorts = recon ? parseOpenPorts(recon.body) : [];

  // Determine which hosts to probe from the scope body. We accept the
  // allowlist block as defined by scope-parser: `## allowlist` then a
  // `hosts:` line followed by `  - value` items.
  const hostAllowlist = (() => {
    const lines = (scope.body || '').split('\n');
    const hosts = [];
    let inHosts = false;
    for (const line of lines) {
      if (/^hosts:\s*$/.test(line)) { inHosts = true; continue; }
      if (inHosts) {
        const m = line.match(/^\s+-\s+(.+?)\s*$/);
        if (m) hosts.push(m[1]);
        else if (line.trim() !== '' && !/^\s/.test(line)) inHosts = false;
      }
    }
    return hosts;
  })();

  // Degraded paths: missing recon OR no tools.
  const degraded = [];
  if (!recon) degraded.push('recon.md ausente — sem superfície para enumerar');
  if (!curlPresent && !nucleiPresent) degraded.push('curl e nuclei ausentes — sem probing HTTP possível');

  if (degraded.length && openPorts.length === 0) {
    writePartial({
      securityDir: sec,
      phase: 'enumerate',
      mode: active ? 'active' : 'passive',
      scope,
      status: 'incomplete',
      tools,
      dependsOn: ['recon'],
      sections: {
        degraded_checks: degraded.join('\n')
      }
    });
    return { ok: true, partialStatus: 'incomplete' };
  }

  // Probe each host:port from the recon.
  const surfaceLines = [];
  const techHits = new Set();
  let anyProbed = false;
  let refusedCount = 0;

  if (curlPresent && openPorts.length > 0) {
    for (const host of hostAllowlist) {
      for (const p of openPorts) {
        // Gate: refuse out-of-scope targets BEFORE any probing.
        const inScope = assertTargetInScope(scope, { host, port: p.port }, { refusalsDir: sec });
        if (!inScope) { refusedCount++; continue; }

        const url = urlForPort(p.port, host);
        const args = filterArgs('curl', ['-sI', url]);
        try {
          const out = execFn('curl', args, { timeout: 10_000 });
          const { status, headers } = parseCurlHead(out && out.stdout ? out.stdout : out);
          surfaceLines.push(`- **${url}** — ${status || 'no status'}`);
          if (headers.server) {
            techHits.add(`server: ${headers.server}`);
            surfaceLines.push(`  - server: ${headers.server}`);
          }
          if (headers['x-powered-by']) {
            techHits.add(`x-powered-by: ${headers['x-powered-by']}`);
            surfaceLines.push(`  - x-powered-by: ${headers['x-powered-by']}`);
          }
          if (headers['set-cookie']) {
            surfaceLines.push(`  - set-cookie: ${headers['set-cookie']}`);
          }
          anyProbed = true;
        } catch (_) {
          surfaceLines.push(`- **${url}** — probe failed`);
        }
      }
    }
  }

  // nuclei passive (only if present) — we don't fully parse nuclei output here;
  // the report renderer will include the JSON dump if found.
  const partialStatus = (anyProbed && refusedCount === 0 && degraded.length === 0) ? 'complete' : 'incomplete';

  writePartial({
    securityDir: sec,
    phase: 'enumerate',
    mode: active ? 'active' : 'passive',
    scope,
    status: partialStatus,
    tools,
    dependsOn: ['recon'],
    sections: {
      surface: surfaceLines.length ? surfaceLines.join('\n') : '_(nenhuma superfície enumerada)_',
      tech: techHits.size ? Array.from(techHits).map(t => `- ${t}`).join('\n') : '_(tech não inferida — curl ausente ou nenhum host acessível)_',
      ...(degraded.length ? { degraded_checks: degraded.join('\n') } : {})
    }
  });
  return { ok: true, partialStatus };
}

module.exports = { runEnumerate, parseOpenPorts, parseCurlHead, urlForPort };

if (require.main === module) {
  require('../../../_shared/cli-runner.js').runFromArgv({
    fn: ({ securityDir, scopePath, active, target } = {}) => {
      const { loadScope } = require('../../../_shared/scope-gate.js');
      const scope = loadScope(scopePath);
      return runEnumerate({ securityDir, scope, active, target });
    },
    argMap: { 'securityDir': 'securityDir', 'scope': 'scopePath', 'active': 'active', 'target': 'target' }
  });
}