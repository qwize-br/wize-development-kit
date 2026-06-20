'use strict';

// cvss.js — zero-dep CVSS v3.1 score calculator. Implements the official
// formula from FIRST.org. Tested against the 5 canonical vectors from
// the spec. Returns the base score (0.0-10.0) and the severity label.

class InvalidVectorError extends Error {
  constructor(message) { super(message); this.name = 'InvalidVectorError'; }
}

// --- metric value tables (per CVSS v3.1 spec) -----------------------------

const AV = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const AC = { L: 0.77, H: 0.44 };
const PR_U = { N: 0.85, L: 0.62, H: 0.27 };  // PR and UI share values when scope=U
const PR_C = { N: 0.85, L: 0.68, H: 0.5 };   // PR changes when scope=C
const UI_U = { N: 0.85, R: 0.62 };
const UI_C = { N: 0.85, R: 0.68 };
const CIA = { H: 0.56, L: 0.22, N: 0 };

// --- parse --------------------------------------------------------------

function parse(vector) {
  if (typeof vector !== 'string') throw new InvalidVectorError('vector must be a string');
  let v = vector.trim();
  if (v.startsWith('CVSS:3.1/')) v = v.slice('CVSS:3.1/'.length);
  if (v.startsWith('CVSS:3.0/')) throw new InvalidVectorError('CVSS v3.0 vectors are not supported');

  const m = {};
  for (const part of v.split('/')) {
    const idx = part.indexOf(':');
    if (idx < 0) throw new InvalidVectorError(`bad metric segment: ${part}`);
    const key = part.slice(0, idx);
    const val = part.slice(idx + 1);
    if (val.length !== 1) throw new InvalidVectorError(`bad metric value: ${val}`);
    m[key] = val;
  }

  // Validate required metrics.
  for (const k of ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A']) {
    if (!(k in m)) throw new InvalidVectorError(`missing metric: ${k}`);
  }
  // Validate values.
  if (!(m.AV in AV)) throw new InvalidVectorError(`invalid AV: ${m.AV}`);
  if (!(m.AC in AC)) throw new InvalidVectorError(`invalid AC: ${m.AC}`);
  if (!(m.PR in { N: 1, L: 1, H: 1 })) throw new InvalidVectorError(`invalid PR: ${m.PR}`);
  if (!(m.UI in { N: 1, R: 1 })) throw new InvalidVectorError(`invalid UI: ${m.UI}`);
  if (!(m.S in { U: 1, C: 1 })) throw new InvalidVectorError(`invalid S: ${m.S}`);
  for (const k of ['C', 'I', 'A']) {
    if (!(m[k] in CIA)) throw new InvalidVectorError(`invalid ${k}: ${m[k]}`);
  }
  // Scope C requires PR/UI to be in the {N,L,H}/{N,R} sets.
  if (m.S === 'C' && !(m.PR in { N: 1, L: 1, H: 1 })) {
    throw new InvalidVectorError(`invalid PR for scope C: ${m.PR}`);
  }
  return m;
}

// --- formula ------------------------------------------------------------

function roundUpTo1Decimal(n) {
  // CVSS rounds UP to 1 decimal place. JS banker rounding rounds half to
  // even, which is wrong for CVSS — we use ceiling-to-1-decimal.
  return Math.ceil(n * 10) / 10;
}

function compute(vector) {
  const m = parse(vector);
  const scopeChanged = m.S === 'C';
  const PR = scopeChanged ? PR_C[m.PR] : PR_U[m.PR];
  const UI = scopeChanged ? UI_C[m.UI] : UI_U[m.UI];

  // Impact.
  const issBase = 1 - ((1 - CIA[m.C]) * (1 - CIA[m.I]) * (1 - CIA[m.A]));
  let impact = scopeChanged
    ? 7.52 * (issBase - 0.029) - 3.25 * Math.pow(issBase - 0.02, 15)
    : 6.42 * issBase;
  if (impact < 0) impact = 0;
  impact = roundUpTo1Decimal(impact);

  // Exploitability.
  const exploit = 8.22 * AV[m.AV] * AC[m.AC] * PR * UI;
  const explRounded = roundUpTo1Decimal(exploit);

  // Base score.
  let base;
  if (impact <= 0) {
    base = 0;
  } else if (scopeChanged) {
    base = 1.08 * (impact + explRounded);
  } else {
    base = impact + explRounded;
  }
  base = roundUpTo1Decimal(base);
  if (base > 10) base = 10;

  return { score: base, severity: severityFromScore(base) };
}

function severityFromScore(score) {
  if (score === 0) return 'None';
  if (score < 4.0) return 'Low';
  if (score < 7.0) return 'Medium';
  if (score < 9.0) return 'High';
  return 'Critical';
}

module.exports = { compute, severityFromScore, parse, InvalidVectorError };
