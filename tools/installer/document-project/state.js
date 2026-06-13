// State file management for `wize-dev-kit document-project`.
//
// Tracks scan progress so long-running deep/exhaustive scans can resume.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_VERSION = '0.3.1';
const STATE_FILE = 'project-scan-report.json';
const ARCHIVE_DIR = '_archive';

function nowIso() {
  return new Date().toISOString();
}

function statePath(projectRoot) {
  return path.join(projectRoot, '.wize', 'knowledge', 'document-project', STATE_FILE);
}

function archivePath(projectRoot, timestamp) {
  const dir = path.join(projectRoot, '.wize', 'knowledge', 'document-project', ARCHIVE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const safe = timestamp.replace(/[:.]/g, '-');
  return path.join(dir, `project-scan-report-${safe}.json`);
}

function initState(projectRoot, mode, scanLevel) {
  const state = {
    workflow_version: WORKFLOW_VERSION,
    timestamps: { started: nowIso(), last_updated: nowIso() },
    mode,
    scan_level: scanLevel,
    project_root: projectRoot,
    project_knowledge: path.join(projectRoot, '.wize', 'knowledge', 'document-project'),
    completed_steps: [],
    current_step: 'step_1',
    findings: {},
    outputs_generated: [STATE_FILE],
    resume_instructions: `Starting ${mode} (${scanLevel}) from step_1`
  };
  writeState(projectRoot, state);
  return state;
}

function loadState(projectRoot) {
  const p = statePath(projectRoot);
  if (!fs.existsSync(p)) return null;
  try {
    const content = fs.readFileSync(p, 'utf-8');
    const state = JSON.parse(content);
    if (!state.workflow_version || !state.timestamps || !state.mode || !state.scan_level) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

function writeState(projectRoot, state) {
  const p = statePath(projectRoot);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  state.timestamps.last_updated = nowIso();
  fs.writeFileSync(p, JSON.stringify(state, null, 2), 'utf-8');
}

function updateState(projectRoot, patch) {
  const state = loadState(projectRoot) || initState(projectRoot, 'quick', 'quick');
  for (const key of Object.keys(patch)) {
    const val = patch[key];
    if (Array.isArray(val) && Array.isArray(state[key])) {
      state[key].push(...val);
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      state[key] = { ...(state[key] || {}), ...val };
    } else {
      state[key] = val;
    }
  }
  writeState(projectRoot, state);
  return state;
}

function archiveOldState(projectRoot) {
  const p = statePath(projectRoot);
  if (!fs.existsSync(p)) return false;
  const content = fs.readFileSync(p, 'utf-8');
  const archived = archivePath(projectRoot, nowIso());
  fs.writeFileSync(archived, content, 'utf-8');
  fs.rmSync(p);
  return true;
}

function stateAgeDays(state) {
  if (!state || !state.timestamps || !state.timestamps.last_updated) return null;
  const then = Date.parse(state.timestamps.last_updated);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (24 * 3600 * 1000));
}

module.exports = {
  statePath,
  initState,
  loadState,
  updateState,
  archiveOldState,
  stateAgeDays,
  WORKFLOW_VERSION
};
