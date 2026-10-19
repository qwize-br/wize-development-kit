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
const { getLatestNoWait } = require('../version-check.js');
const { compareVersions, semverGreater, safePin } = require('../semver.js');
const { gitContext, defaultBranch, trackedUnder } = require('../git-context.js');
const { getProjectStatus, supportsHydrate } = require('../project-status.js');
const { missingTargets } = require('../render-targets.js');
const { ALIAS_PATHS, gitignoreBlockStatus } = require('../setup-helpers.js');

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
    case 'copilot':      return path.join(projectRoot, '.github/skills');
    case 'antigravity':  return path.join(projectRoot, '.agent/skills');
    case 'codex':        return path.join(projectRoot, '.agents/skills');
    case 'kimi-code':    return path.join(projectRoot, '.kimi/skills');
    case 'hermes':       return path.join(projectRoot, '.hermes/skills');
    case 'kiro':         return path.join(projectRoot, '.kiro/skills');
    case 'cursor':       return path.join(projectRoot, '.cursor/rules');
    case 'windsurf':     return path.join(projectRoot, '.windsurf/rules');
    case 'continue':     return path.join(projectRoot, '.continue/prompts');
    case 'opencode':     return path.join(projectRoot, '.opencode/agents');
    case 'generic':      return path.join(projectRoot, '.wize/agents');
    default:             return null;
  }
}

// Adapters that emit into more than one directory.
const EXTRA_ADAPTER_DIRS = { opencode: ['.opencode/commands'] };

function countAdapterFiles(targetCode, projectRoot) {
  const dir = adapterTargetPath(targetCode, projectRoot);
  if (!dir) return 0;
  const dirs = [dir, ...(EXTRA_ADAPTER_DIRS[targetCode] || []).map(d => path.join(projectRoot, d))];
  // Be permissive on file extension; .mdc, .md, .prompt, and SKILL.md dirs all count.
  let count = 0;
  const stack = dirs.filter(dirExists);
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
  if (!has('.wize/implementation/sprint-status.yaml') && !has('.wize/implementation/sprint-status.md')) return '4-implementation (sprint planning pending)';
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

function readHeadFromFs(gitDir, commonDir) {
  const HEAD = readSafe(path.join(gitDir, 'HEAD')).trim();
  if (!HEAD) return { branch: null, head: null, detached: false };
  if (!HEAD.startsWith('ref: ')) return { branch: null, head: HEAD.slice(0, 7), detached: true };
  const ref = HEAD.slice(5).trim();
  const branch = ref.replace(/^refs\/heads\//, '');
  let sha = null;
  for (const dir of [gitDir, commonDir].filter(Boolean)) {
    const loose = readSafe(path.join(dir, ref)).trim();
    if (loose) { sha = loose; break; }
  }
  return { branch, head: sha ? sha.slice(0, 7) : null, detached: false };
}

// Uses git when it works; a `.git` file or directory is enough to count as a
// repository even when git itself cannot run (fake or broken `.git`).
function gitInfo(projectRoot) {
  const ctx = gitContext(projectRoot);
  if (!ctx.isRepo) return { isRepo: false };
  let { branch, head, detached } = ctx;
  if (!branch && !head && ctx.gitDir) {
    const fromFs = readHeadFromFs(ctx.gitDir, ctx.commonDir);
    branch = fromFs.branch; head = fromFs.head; detached = fromFs.detached;
  }
  return {
    isRepo: true,
    linked: !!ctx.linked,
    primary: ctx.primary || null,
    branch: branch || null,
    detached: !!detached,
    head: head || null,
    defaultBranch: defaultBranch(projectRoot)
  };
}

function severityIcon(level) {
  return level === 'error' ? '✖' : level === 'warn' ? '⚠' : 'ℹ';
}

async function cmdDoctor({ kitRoot, projectRoot, opts = {} } = {}) {
  const json = !!opts.json;
  const env = opts.env || process.env;
  const out = opts.log || console.log;
  const log = (m) => { if (!json) out(m); };
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
  const pin = (cfg.project && cfg.project.kit_version) || null;

  // Registry: cache only, never the network. WIZE_DISABLE_UPDATE_CHECK=1 skips it.
  const updateCheckOff = env.WIZE_DISABLE_UPDATE_CHECK === '1';
  let registryLatest = null;
  if (!updateCheckOff) {
    // Without a terminal (an agent running `doctor --json`) no background refresh is started.
    const isTTY = opts.isTTY !== undefined ? opts.isTTY : process.stdout.isTTY;
    const lookupEnv = isTTY ? env : { ...env, WIZE_NO_BG_REFRESH: '1' };
    try { registryLatest = (opts.getLatestNoWait || getLatestNoWait)({ env: lookupEnv }) || null; } catch (_) { /* best effort */ }
  }

  const status = getProjectStatus({ kitRoot, cwd, latest: registryLatest, latestSource: 'cache', env });
  const suggestions = [];
  const suggest = (level, text, command = null) => suggestions.push(command ? { level, text, command } : { level, text });

  // -- Section: Kit --
  log('');
  log('Wize Dev Kit — Doctor');
  log('─────────────────────');
  log(`Kit version (installed):   ${installed || '?'}`);
  log(`Kit version (project):     ${pin || '— (no install)'}`);
  log(`Kit version (registry):    ${registryLatest || (updateCheckOff ? '(update check disabled)' : '(offline or skipped)')}`);
  if (pin && installed) {
    const cmp = compareVersions(pin, installed);
    if (cmp < 0) {
      suggest('warn', `Project pinned ${pin}, this kit is ${installed}. Run \`npx wize-dev-kit@latest update\` to converge.`, 'npx wize-dev-kit@latest update');
    } else if (cmp > 0 && safePin(pin)) {
      suggest('info', `Project pinned ${pin} is newer than this kit (${installed}). Use the pinned kit: \`npx --yes wize-dev-kit@${pin} doctor\`.`, `npx --yes wize-dev-kit@${pin} doctor`);
    }
  }
  if (registryLatest && installed && semverGreater(registryLatest, installed)) {
    suggest('info', `Registry has ${registryLatest}; you're on ${installed}. Run \`npx wize-dev-kit@latest update\` to pick it up.`, 'npx wize-dev-kit@latest update');
  }

  // -- Section: Project --
  log('');
  log('Project');
  log('───────');
  if (!cfg.project) {
    if (status.reason === 'kit-not-on-branch') {
      log(`No .wize/config/project.toml on this branch — the kit is installed on ${status.kit_at}'s branch.`);
      suggest('warn', `The kit is installed on ${status.kit_at}'s branch but not on this one (kit-not-on-branch). Merge the kit into this branch, or pass --here to install here.`);
    } else {
      log('No .wize/config/project.toml — kit is not installed here.');
      suggest('error', 'Run `npx wize-dev-kit install` to set the kit up in this repo.', 'npx wize-dev-kit install');
    }
  } else {
    log(`Name:                 ${cfg.project.name || '?'}`);
    log(`Profiles:             ${profiles.join(', ') || '(none)'}`);
    log(`IDE targets:          ${targets.join(', ') || '(none)'}`);
    log(`Communication lang:   ${cfg.language && cfg.language.communication || '?'}`);
    log(`Document lang:        ${cfg.language && cfg.language.document_output || '?'}`);
    log(`Current phase:        ${phase}`);
  }

  // -- Section: Hydration --
  let hydration = null;
  if (cfg.project) {
    const missing = status.missing_targets;
    hydration = {
      status: status.hydrated,
      marker: status.marker_version,
      pin: status.pin,
      binary: installed,
      user_toml: status.user_toml,
      missing_targets: missing,
      command: status.commands.hydrate
    };
    log('');
    log('Hydration');
    log('─────────');
    log(`  status:     ${status.hydrated}`);
    log(`  marker:     ${status.marker_version || '(none)'}`);
    log(`  pin:        ${status.pin || '(none)'}`);
    log(`  this kit:   ${installed || '?'}`);
    log(`  user.toml:  ${status.user_toml}`);
    for (const t of targets) log(`  ${t.padEnd(14)} ${missing.includes(t) ? '✖ not rendered' : '✓ rendered'}`);

    const cmd = status.commands.hydrate;
    if (status.hydrated === 'missing') {
      suggest('error', `This checkout is not hydrated (not rendered: ${missing.join(', ')}). Run \`${cmd}\`.`, cmd);
    } else if (status.hydrated === 'stale') {
      suggest('error', `Rendered output is stale: marker says kit ${status.marker_version}, project pins ${status.pin}. Run \`${cmd}\`.`, cmd);
    }
    if (status.user_toml === 'missing' && status.hydrated === 'ok') {
      if (supportsHydrate(status.pin)) {
        suggest('error', `.wize/config/user.toml is missing in this checkout. Run \`${cmd}\`.`, cmd);
      } else {
        suggest('warn', '.wize/config/user.toml is missing in this checkout. Copy it from your primary checkout, or run `npx wize-dev-kit@latest update` to adopt hydrate.', 'npx wize-dev-kit@latest update');
      }
    }
  }

  // -- Section: Adapters --
  const adapters = [];
  if (cfg.install) {
    log('');
    log('IDE Adapters');
    log('────────────');
    for (const t of targets) {
      const dir = adapterTargetPath(t, cwd);
      const count = countAdapterFiles(t, cwd);
      const rendered = missingTargets(cwd, [t]).length === 0;
      adapters.push({ target: t, files: count, rendered });
      const label = rendered && count > 0 ? `✓ ${count} files` : count > 0 ? `✖ alias only` : '✖ none';
      log(`  ${t.padEnd(14)} ${label.padEnd(15)} ${dir ? path.relative(cwd, dir) : '(no path)'}`);
    }
  }

  // -- Section: Leaks (generated files that git would see) --
  const leaks = { tracked_aliases: [], gitignore: null };
  if (cfg.project && git.isRepo) {
    leaks.tracked_aliases = trackedUnder(cwd, ALIAS_PATHS);
    const giFile = path.join(cwd, '.gitignore');
    leaks.gitignore = gitignoreBlockStatus(fs.existsSync(giFile) ? readSafe(giFile) : null);
    log('');
    log('Generated files and git');
    log('───────────────────────');
    log(`  tracked alias files:   ${leaks.tracked_aliases.length}`);
    log(`  .gitignore block:      ${leaks.gitignore}`);
    const fix = 'npx wize-dev-kit@latest update';
    if (leaks.tracked_aliases.length) {
      const shown = leaks.tracked_aliases.slice(0, 3).join(', ') + (leaks.tracked_aliases.length > 3 ? ', ...' : '');
      suggest('warn', `${leaks.tracked_aliases.length} generated alias file(s) are tracked by git (${shown}). Run \`${fix}\` to untrack them.`, fix);
    }
    if (leaks.gitignore === 'drift') {
      suggest('warn', `The managed .gitignore block is out of date; generated files can leak into git status. Run \`${fix}\`.`, fix);
    } else if (leaks.gitignore === 'missing') {
      suggest('warn', `.gitignore has no wize-dev-kit managed block; generated files can leak into git status. Run \`${fix}\`.`, fix);
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
    if (gates.FAIL > 0) suggest('error', `${gates.FAIL} story gate(s) at FAIL. Stories must not merge until resolved (advisory mode) or are blocking (enforcing mode).`);
    if (gates.CONCERNS > 0) suggest('warn', `${gates.CONCERNS} story gate(s) at CONCERNS. Review findings before next sprint.`);
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
        suggest('warn', `\`${f.name}\` last refreshed ${f.days}d ago. Run \`/wize-refresh-knowledge\` after current sprint.`);
      }
    }
    if (knowledge.pendingLines > 0) {
      log(`  _pending.md:                ${knowledge.pendingLines} inline note(s) waiting consolidation`);
      if (knowledge.pendingLines >= 5) {
        suggest('info', `${knowledge.pendingLines} notes piled up in _pending.md. Time to run \`/wize-refresh-knowledge\`.`);
      }
    }
    const markerText = knowledge.toBeGeneratedMarkers > 0 ? `${knowledge.toBeGeneratedMarkers} marker(s)` : 'none';
    log(`  To be generated markers:    ${markerText}`);
    if (knowledge.toBeGeneratedMarkers >= 5) {
      suggest('warn', `${knowledge.toBeGeneratedMarkers} docs marked "To be generated" in index.md. Run \`wize-dev-kit document-project initial_scan deep\` to fill them.`);
    }
    const stateText = knowledge.stateExists
      ? (knowledge.stateAgeDays == null ? 'project-scan-report.json exists (age unknown)' : `project-scan-report.json ${knowledge.stateAgeDays}d old`)
      : 'no project-scan-report.json';
    log(`  Scan state:                 ${stateText}`);
    if (!knowledge.stateExists) {
      suggest('info', 'No scan state file found. Run `wize-dev-kit document-project initial_scan` to create a baseline + state.');
    }
  }

  // -- Section: Harness CLIs --
  log('');
  log('AI Harness CLIs on PATH');
  log('───────────────────────');
  if (harnesses.length === 0) {
    log('  (none detected)');
    suggest('info', 'No harness CLI detected. Brownfield baseline + auto-run features only work in your IDE; the headless flow is unavailable.');
  } else {
    for (const h of harnesses) log(`  ${h.binary.padEnd(10)} ${h.path}`);
  }

  // -- Section: Git --
  log('');
  log('Git');
  log('───');
  if (!git.isRepo) {
    log('  (not a git repo)');
    suggest('warn', 'Not a git repository. Run `git init` before installing the kit so version history is recorded.');
  } else {
    log(`  checkout: ${git.linked ? `linked worktree of ${git.primary || '?'}` : 'primary checkout'}`);
    log(`  branch:   ${git.detached ? `detached @${git.head || '?'}` : (git.branch || '?')}`);
    log(`  head:     ${git.head || '(no commits)'}`);
    log(`  default branch: ${git.defaultBranch || '(unknown)'}`);
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

  const count = (level) => suggestions.filter(s => s.level === level).length;
  const summary = { errors: count('error'), warnings: count('warn'), infos: count('info') };
  const exitCode = opts.strict && summary.errors > 0 ? 1 : 0;

  if (json) {
    out(JSON.stringify({
      schema: 1,
      ok: summary.errors === 0,
      exit_code: exitCode,
      root: cwd,
      kit: { installed, project: pin, registry: registryLatest, update_check: updateCheckOff ? 'disabled' : 'cache' },
      project: cfg.project ? {
        name: cfg.project.name || null,
        profiles,
        targets,
        language: { communication: (cfg.language && cfg.language.communication) || null, document_output: (cfg.language && cfg.language.document_output) || null },
        phase
      } : null,
      git,
      hydration,
      adapters,
      leaks,
      gates,
      knowledge,
      harnesses: harnesses.map(h => ({ binary: h.binary, path: h.path })),
      suggestions,
      summary
    }));
  }

  return { suggestions, phase, gates, knowledge, targets, profiles, installed, registryLatest, status, hydration, leaks, git, summary, exitCode };
}

module.exports = {
  cmdDoctor,
  // exported for tests:
  detectPhase, gateStats, knowledgeStatus, gitInfo, adapterTargetPath, countAdapterFiles
};
