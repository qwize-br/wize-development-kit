'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const {
  loadScope,
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

function mkScopeDir(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-gate-'));
  const file = path.join(dir, 'scope.md');
  fs.writeFileSync(file, contents);
  return { dir, file };
}

const VALID_BODY = `## allowlist
hosts:
  - localhost
  - 127.0.0.1
urls:
  - https://staging.example.internal/api/
paths:
  - /api

## dast_target
url: http://localhost:3000

## notes
Test scope for the security-overlay gate.
`;

// --- happy path: targets in scope ---------------------------------------

test('host in allowlist returns true (AC-E02-2 happy path)', () => {
  const { dir, file } = mkScopeDir(signedScope({ body: VALID_BODY }));
  const scope = loadScope(file);
  const ok = assertTargetInScope(scope, { host: 'localhost' }, { refusalsDir: dir });
  assert.equal(ok, true);
});

test('URL with path in allowlist returns true', () => {
  const { dir, file } = mkScopeDir(signedScope({ body: VALID_BODY }));
  const scope = loadScope(file);
  const ok = assertTargetInScope(scope, { url: 'https://staging.example.internal/api/v1/users' }, { refusalsDir: dir });
  assert.equal(ok, true);
});

test('path in allowlist returns true', () => {
  const { dir, file } = mkScopeDir(signedScope({ body: VALID_BODY }));
  const scope = loadScope(file);
  const ok = assertTargetInScope(scope, { path: '/api' }, { refusalsDir: dir });
  assert.equal(ok, true);
});

// --- refusals ------------------------------------------------------------

test('host outside allowlist returns false and logs refusal (AC-E02-2)', () => {
  const { dir, file } = mkScopeDir(signedScope({ body: VALID_BODY }));
  const scope = loadScope(file);
  const ok = assertTargetInScope(scope, { host: 'evil.example.com' }, { refusalsDir: dir });
  assert.equal(ok, false);

  const log = path.join(dir, '.refusals.log');
  assert.ok(fs.existsSync(log), 'refusals.log should be created');
  const content = fs.readFileSync(log, 'utf8');
  assert.match(content, /evil\.example\.com/);
  assert.match(content, /host not in allowlist/);
  // ISO-8601 timestamp
  assert.match(content, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

test('URL with path outside allowlist returns false and logs refusal', () => {
  const { dir, file } = mkScopeDir(signedScope({ body: VALID_BODY }));
  const scope = loadScope(file);
  const ok = assertTargetInScope(scope, { url: 'https://staging.example.internal/admin/users' }, { refusalsDir: dir });
  assert.equal(ok, false);
  const log = path.join(dir, '.refusals.log');
  const content = fs.readFileSync(log, 'utf8');
  assert.match(content, /path not in allowlist|url not in allowlist/);
});

test('refusals.log is append-only across multiple calls', () => {
  const { dir, file } = mkScopeDir(signedScope({ body: VALID_BODY }));
  const scope = loadScope(file);
  assertTargetInScope(scope, { host: 'evil1.example.com' }, { refusalsDir: dir });
  assertTargetInScope(scope, { host: 'evil2.example.com' }, { refusalsDir: dir });
  const content = fs.readFileSync(path.join(dir, '.refusals.log'), 'utf8');
  assert.match(content, /evil1\.example\.com/);
  assert.match(content, /evil2\.example\.com/);
});

// --- scope validation propagates -----------------------------------------

test('assertTargetInScope with tampered scope throws ScopeError(HASH_MISMATCH)', () => {
  const { dir, file } = mkScopeDir(signedScope({ body: VALID_BODY }));
  const scope = loadScope(file);
  scope.body = scope.body + '\nattacker-extra-line\n';
  assert.throws(() => assertTargetInScope(scope, { host: 'localhost' }, { refusalsDir: dir }), err => {
    return err instanceof ScopeError && err.code === 'HASH_MISMATCH';
  });
});

// --- logRefusal helper ---------------------------------------------------

test('logRefusal creates .refusals.log with YAML line entry', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-refusal-'));
  logRefusal(dir, { host: 'evil.com' }, 'host not in allowlist');
  const content = fs.readFileSync(path.join(dir, '.refusals.log'), 'utf8');
  assert.match(content, /timestamp:/);
  assert.match(content, /host: evil\.com/);
  assert.match(content, /reason: host not in allowlist/);
});

test('logRefusal appends, does not overwrite', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-refusal2-'));
  logRefusal(dir, { host: 'a.com' }, 'first');
  logRefusal(dir, { host: 'b.com' }, 'second');
  const content = fs.readFileSync(path.join(dir, '.refusals.log'), 'utf8');
  assert.match(content, /a\.com/);
  assert.match(content, /b\.com/);
});

// --- no side effects: assertTargetInScope must not call execFile ---------

test('assertTargetInScope does not invoke any subprocess (AC-E02-2 — no tool runs on refusal)', () => {
  // We can't easily mock execFile from inside the gate, but we can prove the
  // gate only writes one file: .refusals.log. Any other file appearing in
  // the directory would mean side effects leaked.
  const { dir, file } = mkScopeDir(signedScope({ body: VALID_BODY }));
  const scope = loadScope(file);
  const before = new Set(fs.readdirSync(dir));
  assertTargetInScope(scope, { host: 'evil.example.com' }, { refusalsDir: dir });
  const after = new Set(fs.readdirSync(dir));
  const created = [...after].filter(n => !before.has(n));
  assert.deepEqual(created, ['.refusals.log'], 'gate must only create .refusals.log');
});
