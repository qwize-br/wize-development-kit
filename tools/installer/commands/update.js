// `wize-dev-kit update` — refresh an installed kit to the version currently
// resolved by `node_modules/wize-dev-kit`. Preserves .wize/config/user.toml,
// re-runs the active IDE adapters, and re-applies the .gitignore block when
// it was opted-in originally.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { applyGitignore } = require('../setup-helpers.js');

// Minimal TOML reader for the subset we write — handles `[section]` headers,
// `key = "value"` scalars, and `key = ["a", "b"]` string arrays.
function readToml(file) {
  if (!fs.existsSync(file)) return {};
  const content = fs.readFileSync(file, 'utf-8');
  const out = {};
  let section = null;
  for (const raw of content.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const head = line.match(/^\[([^\]]+)\]$/);
    if (head) { section = head[1]; out[section] = out[section] || {}; continue; }
    const kv = line.match(/^([a-zA-Z_][\w-]*)\s*=\s*(.+)$/);
    if (!kv) continue;
    const [, key, valRaw] = kv;
    const v = parseTomlValue(valRaw.trim());
    if (section) out[section][key] = v;
    else out[key] = v;
  }
  return out;
}

function parseTomlValue(raw) {
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (!isNaN(Number(raw))) return Number(raw);
  return raw;
}

function loadProjectConfig(projectRoot) {
  return readToml(path.join(projectRoot, '.wize/config/project.toml'));
}

function loadInstalledKitVersion(kitRoot) {
  try { return require(path.join(kitRoot, 'package.json')).version; }
  catch { return null; }
}

// Returns a list of CHANGELOG entries (markdown blocks) for versions strictly
// between `from` and `to`. Best-effort — if CHANGELOG layout is unusual,
// returns an empty list and falls back to a generic note.
function changelogBetween(kitRoot, fromVersion, toVersion) {
  const file = path.join(kitRoot, 'CHANGELOG.md');
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf-8');
  const versionRe = /^## \[(\d+\.\d+\.\d+)\][^\n]*\n/gm;
  const matches = [];
  let m;
  while ((m = versionRe.exec(content)) !== null) {
    matches.push({ v: m[1], start: m.index, headerEnd: versionRe.lastIndex });
  }
  for (let i = 0; i < matches.length; i++) {
    matches[i].end = i + 1 < matches.length ? matches[i + 1].start : content.length;
  }
  return matches
    .filter(x => compare(x.v, fromVersion) > 0 && compare(x.v, toVersion) <= 0)
    .map(x => content.slice(x.start, x.end).trim());
}

function compare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

// Re-runs every adapter that the project opted into at install time, using
// the current versions of the kit's renderers.
function rerunAdapters({ kitRoot, projectRoot, ideTargets, profiles, log }) {
  const results = [];
  for (const code of ideTargets) {
    const renderPath = path.join(kitRoot, 'adapters', code, 'render.js');
    if (!fs.existsSync(renderPath)) {
      results.push({ code, skipped: true, reason: 'adapter missing in this kit version' });
      log(`  - ${code}: skipped (adapter no longer exists)`);
      continue;
    }
    delete require.cache[require.resolve(renderPath)]; // make `update` idempotent in the same process
    try {
      const mod = require(renderPath);
      const out = mod.render(kitRoot, projectRoot, { profiles });
      const n = out && Array.isArray(out.written) ? out.written.length : 0;
      results.push({ code, written: n });
      log(`  ✓ ${code}: ${n} file(s) refreshed`);
    } catch (err) {
      results.push({ code, error: err.message });
      log(`  ✖ ${code}: ${err.message}`);
    }
  }
  return results;
}

function writeUpdatedProjectToml(projectRoot, currentToml, newKitVersion) {
  // Surgical rewrite — only updates `kit_version = ...` under `[project]`.
  // Leaves everything else as the user/team configured it.
  const file = path.join(projectRoot, '.wize/config/project.toml');
  if (!fs.existsSync(file)) return false;
  const content = fs.readFileSync(file, 'utf-8');
  const updated = content.replace(/^kit_version\s*=\s*".*"$/m, `kit_version = "${newKitVersion}"`);
  if (updated === content) return false;
  fs.writeFileSync(file, updated, 'utf-8');
  return true;
}

async function cmdUpdate({ kitRoot, projectRoot, opts = {} } = {}) {
  const log = opts.log || console.log;
  const cfg = loadProjectConfig(projectRoot);
  if (!cfg.project) {
    log('No .wize/config/project.toml found here.');
    log('Run `wize-dev-kit install` first.');
    return { changed: false };
  }
  const fromVersion = cfg.project.kit_version || '0.0.0';
  const toVersion = loadInstalledKitVersion(kitRoot) || 'unknown';
  if (toVersion === 'unknown') {
    log('Could not read kit version from node_modules. Aborting.');
    return { changed: false };
  }

  log(`Wize Dev Kit update: ${fromVersion} → ${toVersion}`);
  if (fromVersion === toVersion) {
    log('Already on the same version. Re-rendering adapters anyway (idempotent).');
  }

  const ideTargets = (cfg.install && cfg.install.ide_targets) || ['claude-code', 'generic'];
  const profiles = (cfg.install && cfg.install.profiles) || ['core'];

  log('\nRe-rendering active IDE adapters:');
  const adapterResults = rerunAdapters({ kitRoot, projectRoot, ideTargets, profiles, log });

  if (opts.refreshGitignore !== false) {
    const r = applyGitignore(projectRoot);
    if (r.changed) log(`\n✓ .gitignore ${r.mode}`);
    else            log('\n= .gitignore already up to date');
  }

  writeUpdatedProjectToml(projectRoot, cfg, toVersion);
  log(`\n✓ project.toml kit_version → ${toVersion}`);

  const entries = changelogBetween(kitRoot, fromVersion, toVersion);
  if (entries.length) {
    log(`\nWhat changed (excerpt from CHANGELOG):`);
    for (const e of entries) {
      log(e.split('\n').slice(0, 4).map(l => '  ' + l).join('\n'));
      log('  …');
    }
    log(`\nFull details: ${path.join(kitRoot, 'CHANGELOG.md')}`);
  }

  log('\nDone. Restart your IDE so the refreshed slash commands are picked up.');
  return { changed: true, from: fromVersion, to: toVersion, adapters: adapterResults };
}

module.exports = { cmdUpdate, loadProjectConfig, loadInstalledKitVersion, changelogBetween };
