'use strict';

// scope-parser.js — file-first parser/validator for `.wize/security/scope.md`.
//
// Format (ADR-002):
//   ---
//   accepted_by: <string>
//   accepted_at: <ISO-8601>
//   scope_sha256: <hex SHA-256 of the body below>
//   ---
//
//   ## allowlist
//   ...
//
// This module is the single source of truth for parsing + validating the
// scope. Skills that touch offensive tools must call loadScope() and abort
// on any ScopeError.

const fs = require('node:fs');
const crypto = require('node:crypto');

class ScopeError extends Error {
  constructor(code, field, message) {
    super(message || `${code}${field ? ` (${field})` : ''}`);
    this.name = 'ScopeError';
    this.code = code;
    this.field = field || null;
  }
}

const REQUIRED_FIELDS = ['accepted_by', 'accepted_at', 'scope_sha256'];

// Split a `scope.md` text into { frontmatter, body }.
// The frontmatter is the YAML block delimited by `---` lines at the very top.
// We do NOT use a YAML library (zero-dep); we accept a flat `key: value` shape
// only, which is the entire scope of this overlay's frontmatter (ADR-002).
function parseScope(mdText) {
  if (typeof mdText !== 'string' || !mdText.startsWith('---\n') && mdText !== '---') {
    throw new ScopeError('INVALID_FORMAT', null,
      'scope.md must start with a YAML frontmatter block (--- on line 1)');
  }
  // Normalize: accept either "---\n...\n---\n\nbody" or "---\n...\n---\nbody".
  // The trailing \n after the closing --- is part of the separator, NOT the body.
  // This is what the user signs when they run --sign-scope (and what they
  // expect when the hash is computed on the body they wrote).
  const fmMatch = mdText.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) {
    throw new ScopeError('INVALID_FORMAT', null,
      'scope.md frontmatter is missing or not terminated by a second --- line');
  }
  const fmText = fmMatch[1];
  const body = mdText.slice(fmMatch[0].length);

  const frontmatter = {};
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*?)\s*$/);
    if (!m) continue;
    frontmatter[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); // strip wrapping quotes
  }

  return { frontmatter, body };
}

// Validate a parsed scope. Returns true on success; throws ScopeError otherwise.
// opts: { now?: Date } — for future `accepted_at` warning. Currently unused but
// reserved so we can add a warn() channel without breaking callers.
function validateScope(scope, opts = {}) {
  if (!scope || typeof scope !== 'object') {
    throw new ScopeError('INVALID_FORMAT', null, 'scope is not an object');
  }
  const fm = scope.frontmatter || {};
  for (const field of REQUIRED_FIELDS) {
    if (!fm[field] || typeof fm[field] !== 'string' || fm[field].trim() === '') {
      throw new ScopeError('MISSING_FIELDS', field,
        `scope.md frontmatter is missing required field "${field}" — ` +
        `crie e assine com "wize-sec-pentest --sign-scope" ou preencha manualmente`);
    }
  }

  // Hash integrity. Compute SHA-256 of the body and compare to scope_sha256.
  // We re-parse the body as-is (already stripped of frontmatter) — the original
  // signing was done on the raw body bytes, so byte-equality matters.
  const expected = computeScopeSha256(scope.body || '');
  if (expected !== fm.scope_sha256) {
    throw new ScopeError('HASH_MISMATCH', 'scope_sha256',
      `scope.md body was modified after acceptance (expected ${expected.slice(0, 12)}…, ` +
      `got ${String(fm.scope_sha256).slice(0, 12)}…) — re-assine com "wize-sec-pentest --sign-scope"`);
  }

  // Soft check: accepted_at in the future is a warning, not an error.
  // We don't surface the warning through this function (no logger plumbed
  // here); consumers can inspect frontmatter.accepted_at themselves.

  return true;
}

function computeScopeSha256(bodyText) {
  return crypto.createHash('sha256').update(String(bodyText || ''), 'utf8').digest('hex');
}

// Read + parse + validate a scope.md file. The single entry point used by
// every offensive skill (AC-E02-1, AC-E02-3).
function loadScope(scopePath) {
  if (!fs.existsSync(scopePath)) {
    throw new ScopeError('MISSING_FILE', null,
      `scope.md ausente em ${scopePath} — crie e assine em .wize/security/scope.md antes de rodar o pipeline`);
  }
  const text = fs.readFileSync(scopePath, 'utf8');
  const scope = parseScope(text);
  validateScope(scope);
  return scope;
}

module.exports = {
  parseScope,
  validateScope,
  computeScopeSha256,
  loadScope,
  ScopeError
};
