// `wize-dev-kit document-project` — CLI command entry point.
//
// Parses mode + flags and delegates to the appropriate scan implementation.
// Non-quick modes are stubs here; later stories fill them in.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runQuick } = require('../document-project/modes/quick.js');
const { runInitialScan } = require('../document-project/modes/initial-scan.js');
const { runFullRescan } = require('../document-project/modes/full-rescan.js');
const { runDeepDive } = require('../document-project/modes/deep-dive.js');
const { loadState, archiveOldState } = require('../document-project/state.js');

const VALID_MODES = new Set(['quick', 'initial_scan', 'full_rescan', 'deep_dive']);
const VALID_SCAN_LEVELS = new Set(['quick', 'deep', 'exhaustive']);

function parseMode(args) {
  let mode = 'quick';
  let resume = false;
  let scanLevel = 'quick';
  let target = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--resume') {
      resume = true;
      continue;
    }
    if (arg === '--target') {
      target = args[i + 1];
      i++;
      continue;
    }
    if (arg.startsWith('--')) {
      return { mode: null, error: `unknown option: ${arg}` };
    }
    if (VALID_SCAN_LEVELS.has(arg)) {
      scanLevel = arg;
      continue;
    }
    if (mode === 'quick' && VALID_MODES.has(arg)) {
      mode = arg;
    } else if (mode === 'quick') {
      return { mode: null, error: `unknown mode: ${arg}. Valid modes: ${[...VALID_MODES].join(', ')}` };
    } else {
      return { mode: null, error: `unexpected extra argument: ${arg}` };
    }
  }

  if (!VALID_MODES.has(mode)) {
    return { mode: null, error: `unknown mode: ${mode}. Valid modes: ${[...VALID_MODES].join(', ')}` };
  }

  return { mode, resume, scanLevel, target };
}

function cmdDocumentProject({ kitRoot, projectRoot, args = [], opts = {} }) {
  const log = opts.log || console.log;
  const parsed = parseMode(args);

  if (parsed.mode === null) {
    log(parsed.error);
    return { ok: false, error: parsed.error, exitCode: 1 };
  }

  if (parsed.mode === 'quick') {
    const r = runQuick(projectRoot, { log });
    return { ok: true, mode: 'quick', ...r };
  }

  if (parsed.mode === 'initial_scan') {
    const r = runInitialScan(projectRoot, { scanLevel: parsed.scanLevel, log });
    return { ok: true, mode: 'initial_scan', ...r };
  }

  if (parsed.mode === 'full_rescan') {
    const r = runFullRescan(projectRoot, { scanLevel: parsed.scanLevel, log });
    return { ok: true, mode: 'full_rescan', ...r };
  }

  if (parsed.mode === 'deep_dive') {
    const r = runDeepDive(projectRoot, { target: parsed.target, log });
    return r;
  }

  log(`document-project ${parsed.mode} not implemented`);
  return { ok: false, error: 'not implemented', exitCode: 1 };
}

module.exports = { cmdDocumentProject, parseMode };

