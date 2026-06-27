// `wize-dev-kit doctor` — single-command diagnose.
//
// Prints a structured snapshot of the kit + the project + the surrounding
// environment, plus a list of actionable suggestions ranked by severity.
// Designed to be the *first* command a new dev runs in an unfamiliar
// wize-enabled repo, and the *go-to* command when something looks off.
//
// Output is plain text (no colors by default) so it's grep-friendly and pipe-
// friendly. Sections are stable so editors / dashboards can parse them.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadProjectConfig, loadInstalledKitVersion } = require('./update.js');
const { detectHarnessCli } = require('../baseline.js');
const { getLatestVersion, semverGreater } = require('../version-check.js');

function fileExists(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }
function dirExists(p)  { try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function readSafe(p)   { try { return fs.readFileSync(p, 'utf-8'); } catch { return ''; } }

function listFilesUnder(root, pattern) {
  if (!dirExists(root)) return [];
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && pattern.test(e.name)) out.push(full);
    }
  }
  return out;
}

function parseGateStatus(content) {
  // Find a `status: PASS|CONCERNS|FAIL|WAIVED` line in YAML frontmatter.
  const m = content.match(/^status:\s*(PASS|CONCERNS|FAIL|WAIVED)\s*$/m);
  return m ? m[1] : null;
}

function parseLastRefreshed(content) {
  const m = content.match(/^last_refreshed:\s*([\d-]+)/m);
  return m ? m[1] : null;
}

function daysAgo(dateStr) {
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (24 * 3600 * 1000));
}

function adapterTargetPath(targetCode, projectRoot) {
  // Mirror of the adapter render conventions documented in adapters/README.md.
  switch (targetCode) {
    case 'claude-code':  return path.join(projectRoot, '.claude/skills');
    case 'antigravity':  return path.join(projectRoot, '.agent/skills');
    case 'codex':        return path.join(projectRoot, '.codex/skills');
    case 'kimi-code':    return path.join(projectRoot, '.kimi/skills');
    case 'cursor':       return path.join(projectRoot, '.cursor/rules');
    case 'windsurf':     return path.join(projectRoot, '.windsurf/rules');
    case 'continue':     return path.join(projectRoot, '.continue/prompts');
    case 'opencode':     return path.join(projectRoot, '.opencode/agents');
    case 'generic':      return path.join(projectRoot, '.wize/agents');
    default:             return null;
  }
}

function countAdapterFiles(targetCode, projectRoot) {
  const dir = adapterTargetPath(targetCode, projectRoot);
  if (!dir || !dirExists(dir)) return 0;
  // Be permissive on file extension; .mdc, .md, .prompt, and SKILL.md dirs all count.
  let count = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries; try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) count++;
    }
  }
  return count;
}

function detectPhase(projectRoot) {
  const has = (p) => fileExists(path.join(projectRoot, p)) || dirExists(path.join(projectRoot, p));
  if (!dirExists(path.join(projectRoot, '.wize'))) return 'no-install';
  if (!has('.wize/planning/brief.md')) return '1-analysis (brief pending)';
  if (!has('.wize/planning/ux/trigger-map.md')) return '1-analysis (trigger map pending)';
  if (!has('.wize/planning/prd.md')) return '2-plan (PRD pending)';
  if (!has('.wize/planning/ux/ux-scenarios.md')) return '2-plan (UX scenarios pending)';
  if (!has('.wize/planning/tech-vision.md')) return '2→3 boundary (Fury pending)';
  if (!has('.wize/solutioning/architecture.md')) return '3-solutioning (architecture pending)';
  if (!dirExists(path.join(projectRoot, '.wize/solutioning/stories')) ||
      listFilesUnder(path.join(projectRoot, '.wize/solutioning/stories'), /\.md$/).length === 0)
    return '3-solutioning (stories pending)';
  if (!has('.wize/implementation/tea/risk-profile.md')) return '3-closeout (risk profile pending)';
  if (!has('.wize/implementation/sprint-status.md')) return '4-implementation (sprint planning pending)';
  return '4-implementation';
}

function gateStats(projectRoot) {
  const root = path.join(projectRoot, '.wize/implementation/tea');
  const files = listFilesUnder(root, /^gate\.md$/);
  const stats = { PASS: 0, CONCERNS: 0, FAIL: 0, WAIVED: 0, total: files.length };
  for (const f of files) {
    const s = parseGateStatus(readSafe(f));
    if (s && stats[s] !== undefined) stats[s]++;
  }
  return stats;
}

function knowledgeStatus(projectRoot) {
  const root = path.join(projectRoot, '.wize/knowledge/document-project');
  const exists = dirExists(root);
  if (!exists) return { exists: false };
  const files = ['overview.md', 'architecture-snapshot.md', 'conventions.md', 'dependencies.md', 'risk-spots.md']
    .map(name => path.join(root, name))
    .filter(fileExists);
  const refreshed = files.map(f => ({
    name: path.basename(f),
    days: daysAgo(parseLastRefreshed(readSafe(f)))
  }));
  const pendingFile = path.join(root, '_pending.md');
  const pendingLines = fileExists(pendingFile)
    ? readSafe(pendingFile).split('\n').filter(l => l.trim() && !l.startsWith('#')).length
    : 0;

  const indexPath = path.join(root, 'index.md');
  const indexContent = fileExists(indexPath) ? readSafe(indexPath) : '';
  const toBeGeneratedMarkers = (indexContent.match(/_\(To be generated\)_/g) || []).length;

  const statePath = path.join(root, 'project-scan-report.json');
  const stateExists = fileExists(statePath);
  const stateContent = stateExists ? readSafe(statePath) : '';
  let stateAgeDays = null;
  try {
    const state = JSON.parse(stateContent);
    stateAgeDays = daysAgo(state.timestamps && state.timestamps.last_updated);
  } catch (_) {}

  return { exists: true, files: refreshed, pendingLines, toBeGeneratedMarkers, stateExists, stateAgeDays };
}

function gitInfo(projectRoot) {
  const dotGit = path.join(projectRoot, '.git');
  if (!dirExists(dotGit)) return { isRepo: false };
  let branch = '?'; let head = '?';
  try {
    const HEAD = readSafe(path.join(dotGit, 'HEAD')).trim();
    if (HEAD.startsWith('ref: ')) {
      branch = HEAD.slice(5).replace('refs/heads/', '');
    } else {
      head = HEAD.slice(0, 7);
    }
  } catch (_) {}
  return { isRepo: true, branch, head };
}

function severityIcon(level) {
  return level === 'error' ? '✖' : level === 'warn' ? '⚠' : 'ℹ';
}

async function cmdDoctor({ kitRoot, projectRoot, opts = {} } = {}) {
  const log = opts.log || console.log;
  const cwd = projectRoot;
  const cfg = loadProjectConfig(cwd);
  const installed = loadInstalledKitVersion(kitRoot);
  const phase = detectPhase(cwd);
  const gates = gateStats(cwd);
  const knowledge = knowledgeStatus(cwd);
  const git = gitInfo(cwd);
  const targets = (cfg.install && cfg.install.ide_targets) || [];
  const profiles = (cfg.install && cfg.install.profiles) || [];
  const harnesses = detectHarnessCli({ preferIde: targets });

  // Try registry — best-effort, never blocks.
  let registryLatest = null;
  try { registryLatest = await getLatestVersion(); } catch (_) {}

  const suggestions = [];

  // -- Section: Kit --
  log('');
  log('Wize Dev Kit — Doctor');
  log('─────────────────────');
  log(`Kit version (installed):   ${installed || '?'}`);
  log(`Kit version (project):     ${cfg.project && cfg.project.kit_version || '— (no install)'}`);
  log(`Kit version (registry):    ${registryLatest || '(offline or skipped)'}`);
  if (installed && cfg.project && cfg.project.kit_version && installed !== cfg.project.kit_version) {
    suggestions.push({ level: 'warn', text: `Project pinned to ${cfg.project.kit_version} but ${installed} is installed. Run \`npx wize-dev-kit update\` to refresh adapters.` });
  }
  if (registryLatest && installed && semverGreater(registryLatest, installed)) {
    suggestions.push({ level: 'info', text: `Registry has ${registryLatest}; you're on ${installed}. Run \`npx wize-dev-kit@latest update\` to pick it up.` });
  }

  // -- Section: Project --
  log('');
  log('Project');
  log('───────');
  if (!cfg.project) {
    log('No .wize/config/project.toml — kit is not installed here.');
    suggestions.push({ level: 'error', text: 'Run `npx wize-dev-kit install` to set the kit up in this repo.' });
  } else {
    log(`Name:                 ${cfg.project.name || '?'}`);
    log(`Profiles:             ${profiles.join(', ') || '(none)'}`);
    log(`IDE targets:          ${targets.join(', ') || '(none)'}`);
    log(`Communication lang:   ${cfg.language && cfg.language.communication || '?'}`);
    log(`Document lang:        ${cfg.language && cfg.language.document_output || '?'}`);
    log(`Current phase:        ${phase}`);
  }

  // -- Section: Adapters --
  if (cfg.install) {
    log('');
    log('IDE Adapters');
    log('────────────');
    for (const t of targets) {
      const dir = adapterTargetPath(t, cwd);
      const count = countAdapterFiles(t, cwd);
      const status = count > 0 ? `✓ ${count} files` : '✖ none';
      log(`  ${t.padEnd(14)} ${status.padEnd(15)} ${dir ? path.relative(cwd, dir) : '(no path)'}`);
      if (count === 0) suggestions.push({ level: 'warn', text: `Adapter "${t}" has no rendered files. Run \`npx wize-dev-kit sync\`.` });
    }
  }

  // -- Section: TEA gates --
  if (gates.total > 0) {
    log('');
    log('TEA gates');
    log('─────────');
    log(`Total gate.md files:  ${gates.total}`);
    log(`PASS:      ${gates.PASS}`);
    log(`CONCERNS:  ${gates.CONCERNS}`);
    log(`FAIL:      ${gates.FAIL}`);
    log(`WAIVED:    ${gates.WAIVED}`);
    if (gates.FAIL > 0) suggestions.push({ level: 'error', text: `${gates.FAIL} story gate(s) at FAIL. Stories must not merge until resolved (advisory mode) or are blocking (enforcing mode).` });
    if (gates.CONCERNS > 0) suggestions.push({ level: 'warn', text: `${gates.CONCERNS} story gate(s) at CONCERNS. Review findings before next sprint.` });
  }

  // -- Section: Knowledge --
  if (knowledge.exists) {
    log('');
    log('Knowledge baseline (`document-project/`)');
    log('────────────────────────────────────────');
    for (const f of knowledge.files) {
      const age = f.days == null ? 'no last_refreshed' : `${f.days}d ago`;
      log(`  ${f.name.padEnd(28)} ${age}`);
      if (f.days != null && f.days > 60) {
        suggestions.push({ level: 'warn', text: `\`${f.name}\` last refreshed ${f.days}d ago. Run \`wize-refresh-knowledge\` after current sprint.` });
      }
    }
    if (knowledge.pendingLines > 0) {
      log(`  _pending.md:                ${knowledge.pendingLines} inline note(s) waiting consolidation`);
      if (knowledge.pendingLines >= 5) {
        suggestions.push({ level: 'info', text: `${knowledge.pendingLines} notes piled up in _pending.md. Time to run \`wize-refresh-knowledge\`.` });
      }
    }
    const markerText = knowledge.toBeGeneratedMarkers > 0 ? `${knowledge.toBeGeneratedMarkers} marker(s)` : 'none';
    log(`  To be generated markers:    ${markerText}`);
    if (knowledge.toBeGeneratedMarkers >= 5) {
      suggestions.push({ level: 'warn', text: `${knowledge.toBeGeneratedMarkers} docs marked "To be generated" in index.md. Run \`wize-dev-kit document-project initial_scan deep\` to fill them.` });
    }
    const stateText = knowledge.stateExists
      ? (knowledge.stateAgeDays == null ? 'project-scan-report.json exists (age unknown)' : `project-scan-report.json ${knowledge.stateAgeDays}d old`)
      : 'no project-scan-report.json';
    log(`  Scan state:                 ${stateText}`);
    if (!knowledge.stateExists) {
      suggestions.push({ level: 'info', text: 'No scan state file found. Run `wize-dev-kit document-project quick` to create a baseline + state.' });
    }
  }

  // -- Section: Harness CLIs --
  log('');
  log('AI Harness CLIs on PATH');
  log('───────────────────────');
  if (harnesses.length === 0) {
    log('  (none detected)');
    suggestions.push({ level: 'info', text: 'No harness CLI detected. Brownfield baseline + auto-run features only work in your IDE; the headless flow is unavailable.' });
  } else {
    for (const h of harnesses) log(`  ${h.binary.padEnd(10)} ${h.path}`);
  }

  // -- Section: Git --
  log('');
  log('Git');
  log('───');
  if (!git.isRepo) {
    log('  (not a git repo)');
    suggestions.push({ level: 'warn', text: 'Not a git repository. Run `git init` before installing the kit so version history is recorded.' });
  } else {
    log(`  branch: ${git.branch}`);
    log(`  head:   ${git.head}`);
  }

  // -- Section: Suggestions --
  log('');
  log('Suggestions');
  log('───────────');
  if (suggestions.length === 0) {
    log('  ✓ Everything looks good.');
  } else {
    for (const s of suggestions) log(`  ${severityIcon(s.level)} ${s.text}`);
  }
  log('');

  return { suggestions, phase, gates, knowledge, targets, profiles, installed, registryLatest };
}

module.exports = {
  cmdDoctor,
  // exported for tests:
  detectPhase, gateStats, knowledgeStatus, gitInfo, adapterTargetPath, countAdapterFiles
};
