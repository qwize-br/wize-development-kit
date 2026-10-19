// One runner for "render these adapters into this project", shared by
// install, update, sync and hydrate. Per-adapter failures are isolated, the
// write guard is always cleared, and counts come from render-shared's write
// stats rather than from each adapter's own return value.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const shared = require('./render-shared.js');
const { ALIAS_BY_TARGET } = require('./setup-helpers.js');

// Where each adapter drops its `wize-*` entries. A configured target whose
// directory has no top-level `wize-` entry, or lacks its `wize` alias
// entrypoint, has not been rendered in this checkout, whatever else lives there.
const SENTINEL_DIRS = {
  'claude-code': '.claude/skills',
  copilot: '.github/skills',
  antigravity: '.agent/skills',
  codex: '.agents/skills',
  'kimi-code': '.kimi/skills',
  hermes: '.hermes/skills',
  kiro: '.kiro/skills',
  cursor: '.cursor/rules',
  windsurf: '.windsurf/rules',
  continue: '.continue/prompts',
  opencode: '.opencode/agents',
  generic: '.wize/agents'
};

// Directories an adapter writes besides its sentinel dir (personas and commands).
const EXTRA_OUTPUT_DIRS = {
  copilot: ['.github/agents'],
  opencode: ['.opencode/commands']
};

// Every path an adapter's render can overwrite: sentinel dir, extra dirs and aliases.
function outputSpecs(code) {
  return [SENTINEL_DIRS[code], ...(EXTRA_OUTPUT_DIRS[code] || []), ...(ALIAS_BY_TARGET[code] || [])].filter(Boolean);
}

function hasSentinel(projectRoot, code) {
  const rel = SENTINEL_DIRS[code];
  if (!rel) return true; // unknown (custom) target: nothing to check
  try {
    if (!fs.readdirSync(path.join(projectRoot, rel)).some(n => n.startsWith('wize-'))) return false;
  } catch {
    return false;
  }
  return (ALIAS_BY_TARGET[code] || []).every(a => fs.existsSync(path.join(projectRoot, a)));
}

function missingTargets(projectRoot, targets) {
  return (targets || []).map(t => (typeof t === 'string' ? t : t && t.code)).filter(c => c && !hasSentinel(projectRoot, c));
}

const codeOf = (x) => (typeof x === 'string' ? x : x && x.code);

function renderTargets({ kitRoot, projectRoot, targets, profiles, guard = null, probe = false, skipAgentsMd = false, log = () => {} }) {
  const profileCodes = (profiles || ['core']).map(codeOf);
  const adapters = [];
  if (guard) shared.setWriteGuard(guard);
  shared.setProbeMode(probe);
  try {
    for (const target of targets || []) {
      const code = codeOf(target);
      const entry = { code, written: 0, unchanged: 0, skippedTracked: [] };
      adapters.push(entry);
      const renderPath = path.join(kitRoot, 'adapters', code, 'render.js');
      if (!fs.existsSync(renderPath)) {
        entry.skipped = true;
        entry.reason = 'adapter missing';
        log(`  - ${code}: skipped (adapter missing in this kit version)`);
        continue;
      }
      delete require.cache[require.resolve(renderPath)]; // keep repeated runs in one process honest
      shared.resetWriteStats();
      try {
        const mod = require(renderPath);
        if (typeof mod.render !== 'function') {
          entry.skipped = true;
          entry.reason = 'no render() export';
          log(`  - ${code}: skipped (no render() export)`);
          continue;
        }
        const out = mod.render(kitRoot, projectRoot, { profiles: profileCodes, skipAgentsMd });
        if (!out || !Array.isArray(out.written)) {
          entry.skipped = true;
          entry.reason = 'stub (no skills emitted)';
          log(`  - ${code}: skipped (stub, no skills emitted)`);
          continue;
        }
        const stats = shared.getWriteStats();
        entry.written = stats.written;
        entry.unchanged = stats.unchanged;
        entry.skippedTracked = stats.skippedTracked;
        const tracked = entry.skippedTracked.length ? `, ${entry.skippedTracked.length} tracked left alone` : '';
        log(`  ✓ ${code}: ${entry.written} written, ${entry.unchanged} unchanged${tracked}`);
      } catch (err) {
        entry.error = err.message;
        log(`  ✖ ${code}: ${err.message}`);
      }
    }
  } finally {
    shared.clearWriteGuard();
    shared.setProbeMode(false);
    shared.resetWriteStats();
  }
  return { ok: adapters.every(a => !a.error), adapters };
}

module.exports = { renderTargets, SENTINEL_DIRS, EXTRA_OUTPUT_DIRS, outputSpecs, missingTargets };
