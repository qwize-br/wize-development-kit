'use strict';

// owasp.js — maps a finding (rule id / cve / poc) to an OWASP Top 10 (2021)
// category. Zero-dep: the category table is loaded from
// src/security-overlay/data/owasp-top10.json.

const fs = require('node:fs');
const path = require('node:path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'owasp-top10.json');

let _cache = null;
function _load() {
  if (_cache) return _cache;
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  _cache = parsed.categories || [];
  return _cache;
}

function listOwaspCategories() {
  return _load().slice();
}

function listOwaspCategoryIds() {
  return _load().map(c => c.id);
}

// Ordered rules: the FIRST match wins. We check cve before generic rule
// because a finding with a CVE is unambiguously A06 (vulnerable components).
const RULES = [
  { match: f => !!f.cve,                                 to: 'A06:2021' },
  { match: f => /sqli|sql[-_ ]?injection|injection/i.test(f.rule || ''), to: 'A03:2021' },
  { match: f => /\bxss\b/i.test(f.rule || ''),           to: 'A03:2021' },
  { match: f => /\bauth[-_ ]?bypass|auth[-_ ]?bypass|session/i.test(f.rule || ''), to: 'A07:2021' },
  { match: f => /\btls|cert|cipher|\bssl\b/i.test(f.rule || ''), to: 'A02:2021' },
  { match: f => /\bcors|\bcsp|header/i.test(f.rule || ''), to: 'A05:2021' },
  { match: f => /\bssrf|redirect/i.test(f.rule || ''),   to: 'A10:2021' }
];

function tagOwasp(finding) {
  if (!finding || typeof finding !== 'object') return 'UNKNOWN';
  for (const r of RULES) {
    try {
      if (r.match(finding)) return r.to;
    } catch (_) { /* defensive: never throw from a tagger */ }
  }
  return 'UNKNOWN';
}

module.exports = {
  tagOwasp,
  listOwaspCategories,
  listOwaspCategoryIds
};
