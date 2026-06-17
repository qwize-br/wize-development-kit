'use strict';

// scope-refusal.test.js — the safety net for the security-overlay's most
// important NFR (Security #3 — every refusal is audited) and the AC-E02-5
// contract: when an out-of-scope target is requested, the gate must refuse
// AND log AND never invoke a tool. The test suite covers three scenarios
// end-to-end: host outside, URL with path outside, and an invalid scope.
//
// This file is the test that the gate `risk` once-after-architecture must
// validate as present (see .wize/config/tea.toml and ADR-001).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const {
  assertTargetInScope,
  logRefusal,
  ScopeError
} = require('../../src/security-overlay/_shared/scope-gate.js');

// --- helpers --------------------------------------------------------------

function signedScope({ body, acceptedBy = 'andrefrd', acceptedAt = '2026-06-17T12:00:00Z' } = {}) {
  const signedBody = '\n' + body;
  const hash = crypto.createHash('sha256').update(signedBody, 'utf8').digest('hex');
  const fm = `accepted_by: ${acceptedBy}\naccepted_at: ${acceptedAt}\nscope_sha256: ${hash}\n`;
  return `---\n${fm}---\n${signedBody}`;
}

function mkScopeDir(scopeText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-refusal-'));
  fs.writeFileSync(path.join(dir, 'scope.md'), scopeText);
  return dir;
}

const EMPTY_ALLOWLIST_BODY = `## allowlist
hosts:
urls:
paths:

## dast_target
url: http://localhost:3000
`;

const RESTRICTIVE_BODY = `## allowlist
hosts:
  - localhost
urls:
  - https://staging.example.internal/api/
paths:
  - /api

## dast_target
url: http://localhost:3000
`;

// --- AC-E02-5: refusal end-to-end with empty allowlist --------------------

test('AC-E02-5: empty allowlist refuses evil host + logs + no tool runs', () => {
  const dir = mkScopeDir(signedScope({ body: EMPTY_ALLOWLIST_BODY }));
  // loadScope would need the file; we re-parse to get a scope object.
  const { loadScope } = require('../../src/security-overlay/_shared/scope-gate.js');
  const scope = loadScope(path.join(dir, 'scope.md'));

  const ok = assertTargetInScope(scope, { host: 'evil.example.com' }, { refusalsDir: dir });
  assert.equal(ok, false, 'gate must refuse out-of-scope target');

  const logPath = path.join(dir, '.refusals.log');
  assert.ok(fs.existsSync(logPath), 'refusals.log must be created');
  const content = fs.readFileSync(logPath, 'utf8');
  assert.match(content, /reason: host not in allowlist/, 'refusal log must record the reason');
  assert.match(content, /host: evil\.example\.com/, 'refusal log must record the target');
  // ISO-8601 with seconds precision (e.g. 2026-06-17T17:30:00.000Z or ...Z)
  assert.match(content, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'refusal log must include an ISO-8601 timestamp');
});

// --- URL with path outside the allowlist ----------------------------------

test('URL with path outside allowlist is refused and logged (AC-E02-5 variant)', () => {
  const dir = mkScopeDir(signedScope({ body: RESTRICTIVE_BODY }));
  const { loadScope } = require('../../src/security-overlay/_shared/scope-gate.js');
  const scope = loadScope(path.join(dir, 'scope.md'));

  const ok = assertTargetInScope(scope, { url: 'https://staging.example.internal/admin/users' }, { refusalsDir: dir });
  assert.equal(ok, false);

  const content = fs.readFileSync(path.join(dir, '.refusals.log'), 'utf8');
  assert.match(content, /url: https:\/\/staging\.example\.internal\/admin\/users/);
  assert.match(content, /reason:.*url/);
});

// --- Tampered scope: must throw, must log INVALID_SCOPE --------------------

test('tampered scope (HASH_MISMATCH) is rejected loudly and logs INVALID_SCOPE', () => {
  const dir = mkScopeDir(signedScope({ body: RESTRICTIVE_BODY }));
  const { loadScope } = require('../../src/security-overlay/_shared/scope-gate.js');
  const scope = loadScope(path.join(dir, 'scope.md'));

  // Tamper the body in memory.
  scope.body = scope.body + '\nattacker note: also pwn finance\n';

  assert.throws(() => {
    assertTargetInScope(scope, { host: 'localhost' }, { refusalsDir: dir });
  }, err => {
    return err instanceof ScopeError && err.code === 'HASH_MISMATCH';
  });

  // The gate must also write a refusal line so the audit trail captures
  // the tampering attempt, not just the silent throw.
  const logPath = path.join(dir, '.refusals.log');
  assert.ok(fs.existsSync(logPath), 'tampered-scope attempt must be logged');
  const content = fs.readFileSync(logPath, 'utf8');
  assert.match(content, /HASH_MISMATCH/);
});

// --- canary: scope-gate.js must not import child_process ------------------

test('canary: scope-gate.js does not import child_process (no execFile leak vector)', () => {
  // The gate is a pure module: it must NEVER spawn a process. If a future
  // change adds `require('node:child_process')` or imports execFile, the
  // test fails before any malicious code path can run.
  //
  // We strip JS comments before checking so the docstring's references
  // to "execFile" in the comment header don't trip the canary.
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'security-overlay', '_shared', 'scope-gate.js'),
    'utf8'
  );
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
    .replace(/\/\/[^\n]*/g, '');        // line comments
  assert.doesNotMatch(stripped, /require\(['"]node:child_process['"]\)/);
  assert.doesNotMatch(stripped, /require\(['"]child_process['"]\)/);
  assert.doesNotMatch(stripped, /\bexecFile\b/);
  assert.doesNotMatch(stripped, /\bspawn\b/);
  assert.doesNotMatch(stripped, /\bexec\b/);
});
