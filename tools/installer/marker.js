// Hydration marker: .wize/.local/hydrated.json records which kit version
// last rendered this checkout. .wize/.local/ is git-ignored, so each worktree
// owns its own marker. Reads never throw.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA = 1;

function markerPath(root) {
  return path.join(root, '.wize', '.local', 'hydrated.json');
}

function readMarker(root) {
  try {
    const data = JSON.parse(fs.readFileSync(markerPath(root), 'utf-8'));
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// The pin a render targeted. Fallback renders record it next to the binary that
// did the work, so a pin the binary cannot match does not read as stale. Older
// markers carry only kit_version.
const markerPin = (marker) => (typeof marker.pin === 'string' ? marker.pin : marker.kit_version);

// A fallback render stands in for the pinned kit while it cannot be run (offline,
// unpublished). It counts as current for FALLBACK_TTL_MS, then the next
// hydrate tries the exact pin again.
const FALLBACK_TTL_MS = 60 * 60 * 1000;

function fallbackExpired(marker, now = Date.now()) {
  if (!marker || marker.fallback !== true) return false;
  const at = Date.parse(marker.rendered_at);
  return !Number.isFinite(at) || now - at > FALLBACK_TTL_MS;
}

function writeMarker(root, { kit_version, pin, targets, profiles, counts, delegated, rendered_with, fallback } = {}) {
  const file = markerPath(root);
  const payload = {
    schema: SCHEMA,
    kit_version: kit_version ?? null,
    pin: pin ?? null,
    targets: targets || [],
    profiles: profiles || [],
    counts: counts || {},
    delegated: !!delegated,
    rendered_with: rendered_with ?? null,
    ...(fallback ? { fallback: true } : {}),
    rendered_at: new Date().toISOString()
  };
  const tmp = path.join(path.dirname(file), `.hydrated.json.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
    fs.renameSync(tmp, file);
    return payload;
  } catch {
    try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
    return null;
  }
}

module.exports = { markerPath, readMarker, writeMarker, markerPin, fallbackExpired, FALLBACK_TTL_MS };
