'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { tagOwasp, listOwaspCategories, listOwaspCategoryIds } = require('../../src/security-overlay/_shared/owasp.js');

test('listOwaspCategories returns the 10 canonical categories', () => {
  const cats = listOwaspCategories();
  assert.equal(cats.length, 10);
  // Each has id + name.
  for (const c of cats) {
    assert.match(c.id, /^A\d{2}:2021$/);
    assert.ok(c.name && c.name.length > 0);
  }
});

test('listOwaspCategoryIds returns just the IDs', () => {
  const ids = listOwaspCategoryIds();
  assert.deepEqual(ids.slice(0, 3), ['A01:2021', 'A02:2021', 'A03:2021']);
});

test('tagOwasp maps sqli rule to A03:2021 (AC-E06-3)', () => {
  assert.equal(tagOwasp({ rule: 'sqli-error' }), 'A03:2021');
  assert.equal(tagOwasp({ rule: 'sql-injection-detected' }), 'A03:2021');
  assert.equal(tagOwasp({ rule: 'no-sql-injection-here' }), 'A03:2021');
});

test('tagOwasp maps xss to A03:2021', () => {
  assert.equal(tagOwasp({ rule: 'reflected-xss' }), 'A03:2021');
});

test('tagOwasp maps auth/bypass/session to A07:2021', () => {
  assert.equal(tagOwasp({ rule: 'auth-bypass' }), 'A07:2021');
  assert.equal(tagOwasp({ rule: 'session-fixation' }), 'A07:2021');
});

test('tagOwasp maps tls/cert/cipher/ssl to A02:2021', () => {
  assert.equal(tagOwasp({ rule: 'tls-version-too-old' }), 'A02:2021');
  assert.equal(tagOwasp({ rule: 'self-signed-cert' }), 'A02:2021');
});

test('tagOwasp maps cors/csp/header to A05:2021', () => {
  assert.equal(tagOwasp({ rule: 'missing-csp-header' }), 'A05:2021');
  assert.equal(tagOwasp({ rule: 'cors-misconfig' }), 'A05:2021');
});

test('tagOwasp maps cve to A06:2021 (vulnerable and outdated components)', () => {
  assert.equal(tagOwasp({ cve: 'CVE-2021-23337' }), 'A06:2021');
});

test('tagOwasp maps ssrf/redirect to A10:2021', () => {
  assert.equal(tagOwasp({ rule: 'ssrf-via-redirect' }), 'A10:2021');
  assert.equal(tagOwasp({ rule: 'open-redirect' }), 'A10:2021');
});

test('tagOwasp returns UNKNOWN for findings that match no rule', () => {
  assert.equal(tagOwasp({ rule: 'some-unknown-check' }), 'UNKNOWN');
  assert.equal(tagOwasp({}), 'UNKNOWN');
});

test('tagOwasp is case-insensitive on the rule', () => {
  assert.equal(tagOwasp({ rule: 'SQLI' }), 'A03:2021');
  assert.equal(tagOwasp({ rule: 'XSS' }), 'A03:2021');
});

test('tagOwasp prefers more specific matches: cve wins over generic rule', () => {
  // If both cve AND a rule point to different categories, the implementation
  // must be deterministic. The current rule order has cve first (A06).
  // This test documents the deterministic behavior: cve is checked first.
  assert.equal(tagOwasp({ cve: 'CVE-2023-1234', rule: 'sqli' }), 'A06:2021');
});

test('owasp-top10.json is shipped with the kit and matches listOwaspCategories', () => {
  const file = path.join(__dirname, '..', '..', 'src', 'security-overlay', 'data', 'owasp-top10.json');
  assert.ok(fs.existsSync(file), 'data/owasp-top10.json must exist');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(data.categories.length, 10);
});
