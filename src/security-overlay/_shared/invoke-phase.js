'use strict';

// invoke-phase.js — single point that spawns a phase skill as a Node
// subprocess. The orchestrator (wize-sec-pentest) calls invokePhase to
// run each phase in sequence. Failures return {ok:false, code} — the
// orchestrator decides whether to continue or abort.
//
// Security invariants (enforced by the canary test in
// test/security-overlay/invoke-phase.test.js):
//   - NEVER uses shell:true (no command-injection escape).
//   - Skill names cannot escape the kit root via path traversal.

const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per phase

// resolvePhaseScript(skill, { kitRoot }) -> absolute path.
// Convention: src/security-overlay/skills/<skill>/scripts/<last-segment>.js
// E.g. wize-sec-recon -> .../skills/wize-sec-recon/scripts/recon.js.
// The path is computed even if the file does not exist (callers that want
// to verify existence should call fs.existsSync on the result).
function resolvePhaseScript(skill, opts = {}) {
  if (typeof skill !== 'string' || !skill) return null;
  // Reject anything that tries to escape via ../
  if (skill.includes('..') || skill.includes('/') || skill.includes('\\') || path.isAbsolute(skill)) {
    throw new Error(`phase-skill-name-traversal: refused ${JSON.stringify(skill)}`);
  }
  const kitRoot = opts.kitRoot || path.resolve(__dirname, '..', '..', '..');
  // Convention: src/security-overlay/skills/<skill>/scripts/<scriptName>
  // where scriptName is the explicit opts.scriptName (must include .js)
  // if given, otherwise 'run-<lastSegment>.js'.
  const scriptName = opts.scriptName || `run-${skill.split('-').pop()}.js`;
  return path.join(kitRoot, 'src', 'security-overlay', 'skills', skill, 'scripts', scriptName);
}

// invokePhase(skill, opts) -> Promise<{ok, code, stdout, stderr, error?}>.
// opts: { kitRoot?, active?, extraArgs?: string[], timeout?: ms }
// Does NOT throw on subprocess failure — returns {ok:false, code, error}.
function invokePhase(skill, opts = {}) {
  return new Promise(resolve => {
    let script;
    try {
      script = resolvePhaseScript(skill, opts);
    } catch (e) {
      return resolve({ ok: false, code: -1, stdout: '', stderr: '', error: String(e.message || e) });
    }
    if (!script || !fs.existsSync(script)) {
      return resolve({ ok: false, code: -1, stdout: '', stderr: '', error: `phase script not found for ${skill}` });
    }

    const argv = [];
    if (opts.active) argv.push('--active');
    if (opts.securityDir) argv.push(`--securityDir=${opts.securityDir}`);
    if (opts.scopePath) argv.push(`--scope=${opts.scopePath}`);
    if (Array.isArray(opts.extraArgs)) argv.push(...opts.extraArgs);

    const child = spawn(process.execPath, [script, ...argv], {
      stdio: ['ignore', 'pipe', 'pipe'],
      // shell: false is the default in spawn(); we do not set it.
      timeout: opts.timeout || DEFAULT_TIMEOUT_MS
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });

    child.on('error', err => {
      resolve({ ok: false, code: -1, stdout, stderr, error: String(err.message || err) });
    });
    child.on('close', code => {
      resolve({ ok: code === 0, code: code == null ? -1 : code, stdout, stderr });
    });
  });
}

// Exposed for tests that need to introspect the spawn call.
function _spawnForTest(...args) { return spawn(...args); }

module.exports = {
  invokePhase,
  resolvePhaseScript,
  _spawnForTest
};
