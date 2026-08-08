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
  signScope,
  ScopeError
} = require('../../src/security-overlay/_shared/scope-parser.js');

const {
  generateScope,
  buildBody
} = require('../../src/security-overlay/skills/wize-sec-scope/scripts/generate-scope.js');

// --- helpers --------------------------------------------------------------

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wize-sign-'));
}

function signedScope({ body, acceptedBy = 'andrefrd', acceptedAt = '2026-06-17T12:00:00Z' } = {}) {
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
Test scope for sign-scope.
`;

// --- signScope ------------------------------------------------------------

test('signScope recomputes scope_sha256 and rewrites the file (AC-E09-S05)', () => {
  const dir = mkTempDir();
  const file = path.join(dir, 'scope.md');

  // Write a scope with a deliberately wrong hash.
  const body = VALID_BODY;
  const signedBody = '\n' + body;
  const wrongHash = '0'.repeat(64);
  const fm = `accepted_by: andrefrd\naccepted_at: 2026-06-17T12:00:00Z\nscope_sha256: ${wrongHash}\n`;
  fs.writeFileSync(file, `---\n${fm}---\n${signedBody}`);

  const result = signScope(file);
  const expectedHash = crypto.createHash('sha256').update(signedBody, 'utf8').digest('hex');

  assert.equal(result.sha256, expectedHash);
  assert.equal(result.accepted_by, 'andrefrd');
  assert.equal(result.path, file);

  // Verify the file was rewritten correctly.
  const scope = parseScope(fs.readFileSync(file, 'utf8'));
  assert.equal(scope.frontmatter.scope_sha256, expectedHash);
  assert.equal(validateScope(scope), true);
});

test('signScope is idempotent — running twice on the same body produces the same hash', () => {
  const dir = mkTempDir();
  const file = path.join(dir, 'scope.md');
  fs.writeFileSync(file, signedScope({ body: VALID_BODY }));

  const r1 = signScope(file);
  const r2 = signScope(file);

  assert.equal(r1.sha256, r2.sha256);
  assert.equal(validateScope(parseScope(fs.readFileSync(file, 'utf8'))), true);
});

test('signScope updates hash after body edit', () => {
  const dir = mkTempDir();
  const file = path.join(dir, 'scope.md');
  fs.writeFileSync(file, signedScope({ body: VALID_BODY }));

  const r1 = signScope(file);

  // Edit the body.
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('Test scope for sign-scope.', 'EDITED — attacker added a host.');
  fs.writeFileSync(file, content);

  const r2 = signScope(file);

  assert.notEqual(r1.sha256, r2.sha256, 'hash must change after body edit');
  assert.equal(validateScope(parseScope(fs.readFileSync(file, 'utf8'))), true);
});

test('signScope throws ScopeError(MISSING_FILE) when scope.md is absent', () => {
  const dir = mkTempDir();
  const file = path.join(dir, 'scope.md');
  assert.throws(() => signScope(file), err => {
    return err instanceof ScopeError && err.code === 'MISSING_FILE';
  });
});

test('signScope throws on invalid frontmatter format', () => {
  const dir = mkTempDir();
  const file = path.join(dir, 'scope.md');
  fs.writeFileSync(file, 'not a valid scope file\n');
  assert.throws(() => signScope(file), /frontmatter/i);
});

// --- generateScope --------------------------------------------------------

test('generateScope creates a valid scope.md that passes parseScope + validateScope', () => {
  const dir = mkTempDir();
  const file = path.join(dir, 'scope.md');

  const result = generateScope({
    url: 'http://localhost:8080',
    hosts: ['localhost', '127.0.0.1'],
    paths: ['/api', '/admin'],
    acceptedBy: 'andrefrd',
    outPath: file
  });

  assert.ok(fs.existsSync(file));
  assert.match(result.sha256, /^[0-9a-f]{64}$/);

  const scope = parseScope(fs.readFileSync(file, 'utf8'));
  assert.equal(scope.frontmatter.accepted_by, 'andrefrd');
  assert.match(scope.frontmatter.accepted_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(scope.frontmatter.scope_sha256, result.sha256);
  assert.equal(validateScope(scope), true);
});

test('generateScope body contains allowlist with hosts, urls, and paths', () => {
  const dir = mkTempDir();
  const file = path.join(dir, 'scope.md');

  generateScope({
    url: 'http://localhost:8080',
    hosts: ['localhost'],
    paths: ['/api'],
    acceptedBy: 'andrefrd',
    outPath: file
  });

  const content = fs.readFileSync(file, 'utf8');
  assert.match(content, /## allowlist/);
  assert.match(content, /hosts:/);
  assert.match(content, /  - localhost/);
  assert.match(content, /urls:/);
  assert.match(content, /http:\/\/localhost:8080\//);
  assert.match(content, /paths:/);
  assert.match(content, /  - \/api/);
  assert.match(content, /## dast_target/);
  assert.match(content, /## notes/);
});

test('generateScope defaults paths to / when none provided', () => {
  const dir = mkTempDir();
  const file = path.join(dir, 'scope.md');

  generateScope({
    url: 'http://localhost:8080',
    hosts: ['localhost'],
    paths: [],
    acceptedBy: 'andrefrd',
    outPath: file
  });

  const content = fs.readFileSync(file, 'utf8');
  assert.match(content, /  - \//);
});

test('generateScope creates parent directories', () => {
  const dir = mkTempDir();
  const file = path.join(dir, 'deep', 'nested', 'scope.md');

  generateScope({
    url: 'http://localhost:8080',
    hosts: ['localhost'],
    paths: ['/api'],
    acceptedBy: 'andrefrd',
    outPath: file
  });

  assert.ok(fs.existsSync(file));
});

// --- buildBody ------------------------------------------------------------

test('buildBody returns a string with all sections', () => {
  const body = buildBody({
    url: 'http://localhost:8080',
    hosts: ['localhost'],
    paths: ['/api']
  });

  assert.match(body, /## allowlist/);
  assert.match(body, /## dast_target/);
  assert.match(body, /## notes/);
  assert.match(body, /wize-sec-scope/);
});

// --- signScope preserves other frontmatter fields -------------------------

test('signScope preserves accepted_by and accepted_at', () => {
  const dir = mkTempDir();
  const file = path.join(dir, 'scope.md');
  fs.writeFileSync(file, signedScope({ body: VALID_BODY, acceptedBy: 'pepper', acceptedAt: '2026-01-01T00:00:00Z' }));

  signScope(file);

  const scope = parseScope(fs.readFileSync(file, 'utf8'));
  assert.equal(scope.frontmatter.accepted_by, 'pepper');
  assert.equal(scope.frontmatter.accepted_at, '2026-01-01T00:00:00Z');
});

// --- signScope with scope_sha256 in body (edge case) ----------------------

test('signScope only replaces scope_sha256 in frontmatter, not in body', () => {
  const dir = mkTempDir();
  const file = path.join(dir, 'scope.md');

  const body = VALID_BODY + '\n## notes\nscope_sha256: should-not-change\n';
  const signedBody = '\n' + body;
  const wrongHash = '0'.repeat(64);
  const fm = `accepted_by: andrefrd\naccepted_at: 2026-06-17T12:00:00Z\nscope_sha256: ${wrongHash}\n`;
  fs.writeFileSync(file, `---\n${fm}---\n${signedBody}`);

  signScope(file);

  const content = fs.readFileSync(file, 'utf8');
  // The body's scope_sha256 must remain untouched.
  assert.match(content, /scope_sha256: should-not-change/);
  // The frontmatter's scope_sha256 must be a valid hex hash.
  const scope = parseScope(content);
  assert.match(scope.frontmatter.scope_sha256, /^[0-9a-f]{64}$/);
  assert.notEqual(scope.frontmatter.scope_sha256, wrongHash);
});
