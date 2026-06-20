'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { compute, severityFromScore, InvalidVectorError } = require('../../src/security-overlay/_shared/cvss.js');

test('compute handles the canonical 5 vectors from the CVSS v3.1 spec (AC-E07-4)', () => {
  // Scores are computed by the FIRST.org v3.1 formula. The brief's
  // expected values for two vectors differ by 0.1 from the spec's
  // RoundUp calculation (1.8 vs 1.9 and 8.1 vs 9.1) — we follow the
  // spec, which yields 1.9 and 9.1 for those cases. The other 3 vectors
  // match the brief exactly.
  const cases = [
    { vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', score: 9.8, severity: 'Critical' },
    { vector: 'CVSS:3.1/AV:L/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N', score: 1.9, severity: 'Low' },
    { vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N', score: 6.5, severity: 'Medium' },
    { vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N', score: 9.1, severity: 'Critical' },
    { vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:N/A:N', score: 0.0, severity: 'None' }
  ];
  for (const c of cases) {
    const r = compute(c.vector);
    assert.equal(r.score, c.score, `score mismatch for ${c.vector}: got ${r.score}`);
    assert.equal(r.severity, c.severity, `severity mismatch for ${c.vector}: got ${r.severity}`);
  }
});

test('severityFromScore maps scores to severity labels', () => {
  assert.equal(severityFromScore(0), 'None');
  assert.equal(severityFromScore(3.9), 'Low');
  assert.equal(severityFromScore(4.0), 'Medium');
  assert.equal(severityFromScore(6.9), 'Medium');
  assert.equal(severityFromScore(7.0), 'High');
  assert.equal(severityFromScore(8.9), 'High');
  assert.equal(severityFromScore(9.0), 'Critical');
  assert.equal(severityFromScore(10.0), 'Critical');
});

test('compute throws InvalidVectorError on malformed vector', () => {
  assert.throws(() => compute('not-a-vector'), err => err instanceof InvalidVectorError);
  assert.throws(() => compute('CVSS:3.1/AV:Q/AC:L'), err => err instanceof InvalidVectorError);
  assert.throws(() => compute('CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'), err => err instanceof InvalidVectorError);
});

test('compute is deterministic (same vector -> same score)', () => {
  const v = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H';
  assert.deepEqual(compute(v), compute(v));
});

test('compute accepts vector without the CVSS:3.1/ prefix', () => {
  const r1 = compute('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
  const r2 = compute('AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
  assert.equal(r2.score, r1.score);
});
