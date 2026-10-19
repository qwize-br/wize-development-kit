// Single semver implementation for the installer: parse, compare, greater.
// Prerelease-aware (0.27.0-rc.1 < 0.27.0); build metadata is ignored.

'use strict';

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z.-]+)?$/;

// Returns { major, minor, patch, pre: [] } or null when `v` is not semver.
function parse(v) {
  if (typeof v !== 'string') return null;
  const m = SEMVER_RE.exec(v.trim().replace(/^v/i, ''));
  if (!m) return null;
  const pre = m[4] ? m[4].split('.').map(id => (/^\d+$/.test(id) ? Number(id) : id)) : [];
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre };
}

function comparePre(a, b) {
  if (!a.length && !b.length) return 0;
  if (!a.length) return 1;   // a release outranks any prerelease
  if (!b.length) return -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i >= a.length) return -1;
    if (i >= b.length) return 1;
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    const xn = typeof x === 'number';
    const yn = typeof y === 'number';
    if (xn && yn) return x < y ? -1 : 1;
    if (xn) return -1;         // numeric identifiers sort below alphanumeric
    if (yn) return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

// -1 | 0 | 1. An unparseable argument counts as 0.0.0, so garbage never
// outranks a real version.
function compareVersions(a, b) {
  const zero = { major: 0, minor: 0, patch: 0, pre: [] };
  const pa = parse(a) || zero;
  const pb = parse(b) || zero;
  for (const k of ['major', 'minor', 'patch']) {
    if (pa[k] !== pb[k]) return pa[k] < pb[k] ? -1 : 1;
  }
  return comparePre(pa.pre, pb.pre);
}

// A pin that is safe to put in a command line: plain semver, no `v` prefix,
// whitespace or build metadata (same rule as .wize/hooks/hydrate.sh).
const SAFE_PIN_RE = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;
const isSafePin = (v) => typeof v === 'string' && SAFE_PIN_RE.test(v);
const safePin = (v) => (isSafePin(v) ? v : null);

function semverGreater(a, b) {
  return compareVersions(a, b) > 0;
}

module.exports = { parse, compareVersions, semverGreater, isSafePin, safePin };
