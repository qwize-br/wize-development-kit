// Full rescan mode for `wize-dev-kit document-project`.
//
// Archives the previous state and re-runs an initial scan from scratch.

'use strict';

const { archiveOldState } = require('../state.js');
const { runInitialScan } = require('./initial-scan.js');

function runFullRescan(projectRoot, options = {}) {
  archiveOldState(projectRoot);
  return runInitialScan(projectRoot, { ...options, mode: 'full_rescan' });
}

module.exports = { runFullRescan };
