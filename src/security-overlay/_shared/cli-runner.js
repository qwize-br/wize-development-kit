'use strict';

// cli-runner.js — small helper so each phase script can be invoked
// either as a module (import + call) or as a CLI (with --securityDir /
// --scope / --active argv). The invoke-phase helper spawns the script
// as a Node subprocess; this module bridges that to the per-phase
// `runX` function exported by each script.
//
// Usage from a script:
//   const { runX } = require('./run-x');
//   module.exports = { runX };
//   if (require.main === module) {
//     require('../../../_shared/cli-runner.js').runFromArgv({
//       fn: runX,
//       argMap: { securityDir: 'securityDir', scopePath: 'scopePath', active: 'active' }
//     });
//   }
//
// argv shape: --securityDir=PATH --scope=PATH --active [script-specific]
// The function `fn` is called with the parsed object spread.

function parseArgv(argv) {
  const out = {};
  for (let i = 0; i < (argv || []).length; i++) {
    const a = argv[i];
    if (a === '--active') { out.active = true; continue; }
    const eq = a.indexOf('=');
    if (eq > 0) {
      const key = a.slice(0, eq).replace(/^--/, '');
      const val = a.slice(eq + 1);
      out[camel(key)] = val;
      continue;
    }
    if (a.startsWith('--') && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      out[camel(a.slice(2))] = argv[i + 1];
      i++;
    }
  }
  return out;
}

function camel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

async function runFromArgv({ fn, argMap = {} }) {
  const argv = process.argv.slice(2);
  const parsed = parseArgv(argv);
  // Map --securityDir -> securityDir, --scope -> scopePath, etc.
  const opts = {};
  for (const [cliKey, optKey] of Object.entries(argMap)) {
    if (cliKey in parsed) opts[optKey] = parsed[cliKey];
  }
  // Also accept any unprefixed camelCase keys directly.
  for (const [k, v] of Object.entries(parsed)) {
    if (!(k in opts)) opts[k] = v;
  }
  if (!('active' in opts)) opts.active = false;
  // The phase script may also export its own CLI flags (--target for recon).
  // We forward remaining --flags as a target-agnostic extraArgs-style list.
  const extras = {};
  for (const a of argv) {
    if (a === '--active') continue;
    const m = a.match(/^--([a-z0-9-]+)/);
    if (m && !argMap[m[1]] && !argMap[camel(m[1])]) {
      // Stash any flag the script might want to read itself.
      extras[m[1]] = a.includes('=') ? a.slice(a.indexOf('=') + 1) : true;
    }
  }
  Object.assign(opts, extras);
  try {
    const r = await fn(opts);
    if (r && typeof r === 'object') {
      // Print a one-line summary the orchestrator can show in its summary.
      const summary = r.partialStatus
        ? `${process.argv[1].split('/').pop().replace(/\.js$/, '')}: partial_status=${r.partialStatus} mode=${r.mode || 'passive'}`
        : '';
      if (summary) process.stdout.write(summary + '\n');
    }
    process.exit(0);
  } catch (e) {
    process.stderr.write(`✖ ${process.argv[1]}: ${e && e.message ? e.message : e}\n`);
    process.exit(2);
  }
}

module.exports = { parseArgv, runFromArgv };
