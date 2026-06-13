// Initial scan mode for `wize-dev-kit document-project`.
//
// Runs project-type classification, conditional scans, and generates index + docs.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { classifyProject } = require('../classify.js');
const { batchScanner } = require('../batch-scanner.js');
const { renderIndex } = require('../render-index.js');
const { initState, updateState } = require('../state.js');
const { runQuick } = require('./quick.js');

function now() {
  return new Date().toISOString().slice(0, 10);
}

function readRequirements(row) {
  return {
    api: row.requires_api_scan,
    data: row.requires_data_models,
    state: row.requires_state_management,
    ui: row.requires_ui_components,
    deploy: row.requires_deployment_config,
    hardware: row.requires_hardware_docs,
    assets: row.requires_asset_inventory
  };
}

function existingDocs(root) {
  const candidates = [
    'README.md',
    'CONTRIBUTING.md',
    'ARCHITECTURE.md',
    'DEPLOYMENT.md',
    'API.md'
  ];
  return candidates.filter(f => fs.existsSync(path.join(root, f))).map(f => path.join(root, f));
}

function runInitialScan(projectRoot, { scanLevel = 'quick', log = console.log, csvPath } = {}) {
  const classification = classifyProject(projectRoot, csvPath ? { csvPath } : {});
  const state = initState(projectRoot, 'initial_scan', scanLevel);

  updateState(projectRoot, {
    completed_steps: [{ step: 'classify', status: 'completed', timestamp: new Date().toISOString(), summary: `Classified as ${classification.projectTypes.join(', ')}` }],
    current_step: 'scan',
    findings: {
      project_classification: {
        repository_type: classification.parts.length >= 2 ? 'multi-part' : 'monolith',
        parts_count: classification.parts.length,
        primary_language: 'unknown',
        architecture_type: classification.projectTypes[0] || 'unknown'
      }
    }
  });

  let generated = [];
  if (scanLevel === 'deep' || scanLevel === 'exhaustive') {
    const batches = batchScanner(projectRoot, { ignore: ['.wize', '.git', 'node_modules'] });
    updateState(projectRoot, {
      completed_steps: [{ step: 'scan', status: 'completed', timestamp: new Date().toISOString(), summary: `${batches.length} batches scanned` }],
      current_step: 'generate',
      findings: {
        batches_completed: batches.map(b => ({ path: b.folder, files_scanned: b.fileCount, summary: `${b.totalLoc} LOC` }))
      }
    });
  }

  // Always write baseline + index.
  const quick = runQuick(projectRoot, { log });
  generated.push(...quick.written.map(f => path.join(projectRoot, '.wize', 'knowledge', 'document-project', f)));

  const indexResult = renderIndex(projectRoot, {
    projectTypes: classification.projectTypes,
    parts: classification.parts,
    generated,
    existing: existingDocs(projectRoot)
  });
  generated.push(path.join(projectRoot, '.wize', 'knowledge', 'document-project', 'index.md'));

  updateState(projectRoot, {
    completed_steps: [{ step: 'generate', status: 'completed', timestamp: new Date().toISOString(), summary: `Generated ${generated.length} files` }],
    current_step: 'completed',
    outputs_generated: generated.map(g => path.basename(g)),
    resume_instructions: 'Scan complete'
  });

  return {
    changed: true,
    mode: 'initial_scan',
    scanLevel,
    projectTypes: classification.projectTypes,
    parts: classification.parts,
    generated: generated.map(g => path.basename(g))
  };
}

module.exports = { runInitialScan };
