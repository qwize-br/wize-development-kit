'use strict';

// scope-gate.js — single point that decides whether an offensive tool may run
// against a given target. ADR-001: this module is THE gate; skills must call
// assertTargetInScope before any execFile.
//
// Refusals (returns false) are logged to .wize/security/.refusals.log with
// ISO-8601 timestamp + target + reason. Scope validation errors (ScopeError)
// propagate — they signal an invalid scope, not a refused action.

const fs = require('node:fs');
const path = require('node:path');

const {
  parseScope,
  validateScope,
  ScopeError
} = require('./scope-parser.js');

const REFSUAL_LOG_FILENAME = '.refusals.log';

// --- body parsing --------------------------------------------------------

// Parse the body of a scope.md into a structured allowlist. We accept the
// shape defined in ADR-002:
//
//   ## allowlist
//   hosts:
//     - localhost
//     - 127.0.0.1
//   urls:
//     - https://staging.example.internal/api/
//   paths:
//     - /api
//
// Zero-dep: each list block is matched line-by-line under its `## allowlist`
// heading until the next `##` heading or EOF. Empty / missing blocks yield
// empty arrays (which makes EVERY target fail the allowlist — fail-closed).
function parseAllowlist(body) {
  const out = { hosts: [], urls: [], paths: [] };
  const lines = String(body || '').split('\n');
  let section = null;
  let key = null;
  for (const line of lines) {
    const h = line.match(/^##\s+([a-zA-Z_][a-zA-Z0-9_-]*)/);
    if (h) {
      section = h[1] === 'allowlist' ? 'allowlist' : null;
      key = null;
      continue;
    }
    if (section !== 'allowlist') continue;
    const km = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*$/);
    if (km) {
      const k = km[1];
      if (k === 'hosts' || k === 'urls' || k === 'paths') key = k;
      else key = null;
      continue;
    }
    const lm = line.match(/^\s+-\s+(.+?)\s*$/);
    if (lm && key) {
      out[key].push(lm[1]);
    }
  }
  return out;
}

// --- matching ------------------------------------------------------------

function matchHost(allowlist, host) {
  return allowlist.hosts.some(h => h === host);
}

function matchUrl(allowlist, url) {
  // The URL must start with one of the allowlisted URL prefixes.
  return allowlist.urls.some(prefix => url.startsWith(prefix));
}

function matchPath(allowlist, p) {
  // The path must equal or start with one of the allowlisted paths.
  return allowlist.paths.some(ap => p === ap || p.startsWith(ap.endsWith('/') ? ap : ap + '/'));
}

// --- public api ----------------------------------------------------------

// loadScope(scopePath) — load + parse + validate. On error: log refusal
// (best-effort) and rethrow. The caller (a skill) aborts on throw.
function loadScope(scopePath) {
  if (!fs.existsSync(scopePath)) {
    // Cannot log refusal without a known scope directory; rely on caller.
    throw new ScopeError('MISSING_FILE', null,
      `scope.md ausente em ${scopePath} — crie e assine em .wize/security/scope.md antes de rodar o pipeline`);
  }
  const text = fs.readFileSync(scopePath, 'utf8');
  const scope = parseScope(text);
  validateScope(scope);
  return scope;
}

// assertTargetInScope(scope, target, { refusalsDir }) -> boolean.
// On refusal, writes a line to <refusalsDir>/.refusals.log and returns false.
// Throws ScopeError if `scope` itself is invalid (HASH_MISMATCH, etc.) —
// callers should treat that as abort-the-pipeline.
function assertTargetInScope(scope, target, opts = {}) {
  const refusalsDir = opts.refusalsDir || path.join(process.cwd(), '.wize', 'security');

  // Validate the scope up front so any tampering is surfaced loudly. We
  // also log the attempt before re-throwing — an invalid scope is itself
  // a refusal event that must appear in the audit trail.
  try {
    validateScope(scope);
  } catch (err) {
    if (err && err.code) {
      logRefusal(refusalsDir, target || {}, `${err.code}: ${String(err.message || '').slice(0, 200)}`);
    }
    throw err;
  }

  const allowlist = parseAllowlist(scope.body);

  // Evaluate each provided dimension of the target. A dimension is "in scope"
  // iff it matches an allowlist entry. If the caller provides multiple
  // dimensions (e.g. {host, url}), all of them must match.
  const checks = [];
  if (target.host) checks.push({ ok: matchHost(allowlist, target.host), why: 'host not in allowlist' });
  if (target.url)  checks.push({ ok: matchUrl(allowlist, target.url),   why: 'url not in allowlist' });
  if (target.path) checks.push({ ok: matchPath(allowlist, target.path), why: 'path not in allowlist' });

  if (checks.length === 0) {
    // Defensive: refusing a target we can't classify is the safe default.
    logRefusal(refusalsDir, target, 'no target dimension provided');
    return false;
  }

  const allIn = checks.every(c => c.ok);
  if (!allIn) {
    const reason = checks.filter(c => !c.ok).map(c => c.why).join('; ');
    logRefusal(refusalsDir, target, reason);
    return false;
  }
  return true;
}

// logRefusal(refusalsDir, target, reason) — append a YAML line to
// .wize/security/.refusals.log. Best-effort: never throws (a logging failure
// must not mask the refusal that caused it).
function logRefusal(refusalsDir, target, reason) {
  try {
    fs.mkdirSync(refusalsDir, { recursive: true });
    const file = path.join(refusalsDir, REFSUAL_LOG_FILENAME);
    const entry = [
      '-',
      `  timestamp: ${new Date().toISOString()}`,
      ...Object.entries(target || {}).map(([k, v]) => `  ${k}: ${String(v).replace(/\n/g, ' ')}`),
      `  reason: ${String(reason || 'unspecified').replace(/\n/g, ' ')}`
    ].join('\n') + '\n';
    fs.appendFileSync(file, entry, 'utf8');
  } catch (_) {
    // Intentionally swallow — refusing to crash the caller is more important
    // than refusing to log. The gate decision (return false) is what matters.
  }
}

module.exports = {
  loadScope,
  assertTargetInScope,
  logRefusal,
  parseAllowlist,
  ScopeError
};