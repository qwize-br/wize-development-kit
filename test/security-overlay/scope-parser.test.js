'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const {
  parseScope,
  validateScope,
  computeScopeSha256,
  loadScope,
  ScopeError
} = require('../../src/security-overlay/_shared/scope-parser.js');

// --- helpers --------------------------------------------------------------

function mkTempScope(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-scope-'));
  const file = path.join(dir, 'scope.md');
  fs.writeFileSync(file, contents);
  return { dir, file };
}

function signedScope({ body, acceptedBy = 'andrefrd', acceptedAt = '2026-06-17T12:00:00Z' } = {}) {
  // Body bytes here are what the user signs. The parser will return the body
  // starting AFTER the "---\n" separator — which means the file's blank line
  // between the closing --- and the body is part of the signed bytes. So the
  // hash is taken on "\n<body>", not just "<body>".
  const signedBody = '\n' + body;
  const hash = crypto.createHash('sha256').update(signedBody, 'utf8').digest('hex');
  const fm = `accepted_by: ${acceptedBy}\naccepted_at: ${acceptedAt}\nscope_sha256: ${hash}\n`;
  return `---\n${fm}---\n${signedBody}`;
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
Test scope for the security-overlay parser.
`;

// --- parseScope -----------------------------------------------------------

test('parseScope returns frontmatter and body for a well-formed scope.md', () => {
  const text = signedScope({ body: VALID_BODY });
  const out = parseScope(text);
  assert.equal(out.frontmatter.accepted_by, 'andrefrd');
  assert.equal(out.frontmatter.accepted_at, '2026-06-17T12:00:00Z');
  assert.match(out.frontmatter.scope_sha256, /^[0-9a-f]{64}$/);
  assert.match(out.body, /## allowlist/);
});

test('parseScope throws on missing frontmatter', () => {
  assert.throws(() => parseScope('## allowlist\nhosts: []'), /frontmatter/i);
});

// --- validateScope --------------------------------------------------------

test('validateScope returns true for a well-formed scope (AC-E02-3 happy path)', () => {
  const text = signedScope({ body: VALID_BODY });
  const scope = parseScope(text);
  assert.equal(validateScope(scope), true);
});

test('validateScope throws ScopeError(MISSING_FIELDS) for missing accepted_by', () => {
  const body = VALID_BODY;
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  const text = `---\naccepted_at: 2026-06-17T12:00:00Z\nscope_sha256: ${hash}\n---\n\n${body}`;
  const scope = parseScope(text);
  assert.throws(() => validateScope(scope), err => {
    return err instanceof ScopeError && err.code === 'MISSING_FIELDS' && err.field === 'accepted_by';
  });
});

test('validateScope throws ScopeError(MISSING_FIELDS) for missing accepted_at', () => {
  const body = VALID_BODY;
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  const text = `---\naccepted_by: andrefrd\nscope_sha256: ${hash}\n---\n\n${body}`;
  const scope = parseScope(text);
  assert.throws(() => validateScope(scope), err => {
    return err instanceof ScopeError && err.code === 'MISSING_FIELDS' && err.field === 'accepted_at';
  });
});

test('validateScope throws ScopeError(MISSING_FIELDS) for missing scope_sha256', () => {
  const text = `---\naccepted_by: andrefrd\naccepted_at: 2026-06-17T12:00:00Z\n---\n\n${VALID_BODY}`;
  const scope = parseScope(text);
  assert.throws(() => validateScope(scope), err => {
    return err instanceof ScopeError && err.code === 'MISSING_FIELDS' && err.field === 'scope_sha256';
  });
});

test('validateScope throws ScopeError(HASH_MISMATCH) when body was edited after signing', () => {
  const text = signedScope({ body: VALID_BODY });
  const scope = parseScope(text);
  scope.body = scope.body + '\n## extra\nattacker notes\n';
  assert.throws(() => validateScope(scope), err => {
    return err instanceof ScopeError && err.code === 'HASH_MISMATCH';
  });
});

test('validateScope does NOT throw for accepted_at in the future (warning only)', () => {
  const future = '2099-01-01T00:00:00Z';
  const text = signedScope({ body: VALID_BODY, acceptedAt: future });
  const scope = parseScope(text);
  assert.equal(validateScope(scope), true);
});

// --- computeScopeSha256 ---------------------------------------------------

test('computeScopeSha256 returns a stable hex SHA-256 for a body', () => {
  const body = 'hello world\n';
  const expected = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  assert.equal(computeScopeSha256(body), expected);
  // Determinism: same input → same output.
  assert.equal(computeScopeSha256(body), computeScopeSha256(body));
});

// --- loadScope ------------------------------------------------------------

test('loadScope returns parsed+validated scope for a valid file', () => {
  const { file } = mkTempScope(signedScope({ body: VALID_BODY }));
  const scope = loadScope(file);
  assert.equal(scope.frontmatter.accepted_by, 'andrefrd');
});

test('loadScope throws ScopeError(MISSING_FILE) when scope.md is absent (AC-E02-1)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-scope-empty-'));
  const file = path.join(dir, 'scope.md'); // not created
  assert.throws(() => loadScope(file), err => {
    return err instanceof ScopeError && err.code === 'MISSING_FILE' && /scope\.md/.test(err.message);
  });
});

test('ScopeError instances carry .code, .field, and a helpful .message', () => {
  const e = new ScopeError('MISSING_FIELDS', 'accepted_by');
  assert.equal(e.code, 'MISSING_FIELDS');
  assert.equal(e.field, 'accepted_by');
  assert.match(e.message, /accepted_by/);
});
