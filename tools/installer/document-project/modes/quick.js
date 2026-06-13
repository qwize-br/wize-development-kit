// Quick baseline mode for `wize-dev-kit document-project`.
//
// Produces the 6 lightweight baseline files. Does not read source files.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BASELINE_FILES = {
  'overview.md': overviewMarkdown,
  'architecture-snapshot.md': architectureMarkdown,
  'conventions.md': conventionsMarkdown,
  'dependencies.md': dependenciesMarkdown,
  'risk-spots.md': riskMarkdown,
  'open-questions.md': questionsMarkdown
};

function now() {
  return new Date().toISOString().slice(0, 10);
}

function readPackage(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
  } catch {
    return {};
  }
}

function countLines(root) {
  let total = 0;
  const dirs = ['src', 'tools', 'adapters', 'schemas', 'test'];
  for (const dir of dirs) {
    const full = path.join(root, dir);
    if (!fs.existsSync(full)) continue;
    total += walkLines(full);
  }
  return total;
}

function walkLines(dir) {
  let total = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) total += walkLines(full);
    else if (e.isFile() && /\.(js|md|yaml|json)$/.test(e.name)) {
      const content = fs.readFileSync(full, 'utf-8');
      total += content.split('\n').length;
    }
  }
  return total;
}

function recentCommitCount(root) {
  // Avoid shelling out; return 0 if not a git repo or git unavailable.
  // Caller can overlay a real count from CLI.
  return 0;
}

function overviewMarkdown(root, pkg) {
  return `---
status: baseline
owner: Pepper Potts + Peggy Carter
created: ${now()}
last_refreshed: ${now()}
---

# Overview

**Project:** ${pkg.name || path.basename(root)}
**What it is:** ${pkg.description || 'Project documented by Wize Dev Kit.'}
**Current version:** ${pkg.version || 'unknown'}

## Size

- Source lines of code: ~${countLines(root)} LOC.
- Runtime dependencies: ${Object.keys(pkg.dependencies || {}).length}.
- Dev dependencies: ${Object.keys(pkg.devDependencies || {}).length}.

## What it ships

- See architecture-snapshot.md for components and entry points.
- See conventions.md for coding patterns.
- See dependencies.md for runtime and dev dependency roles.
`;
}

function architectureMarkdown() {
  return `---
status: baseline
owner: Pepper Potts + Tony Stark
created: ${now()}
last_refreshed: ${now()}
---

# Architecture Snapshot

## Entry points

- Documented after a deeper scan (initial_scan mode).

## Components

- Run \`wize-dev-kit document-project initial_scan deep\` for component-level detail.

## Integration surface

- See dependencies.md for external integrations.
`;
}

function conventionsMarkdown() {
  return `---
status: baseline
owner: Peggy Carter
created: ${now()}
last_refreshed: ${now()}
sampled: "pending deeper scan"
---

# Conventions (observed, not prescribed)

## Quick notes

- Run \`wize-dev-kit document-project initial_scan deep\` to sample files and fill this doc.
`;
}

function dependenciesMarkdown(root, pkg) {
  const runtime = Object.entries(pkg.dependencies || {})
    .map(([name, version]) => `| ${name} | ${version} | | |`).join('\n');
  const dev = Object.entries(pkg.devDependencies || {})
    .map(([name, version]) => `| ${name} | ${version} | | |`).join('\n');

  return `---
status: baseline
owner: Pepper Potts
created: ${now()}
last_refreshed: ${now()}
---

# Dependencies

## Runtime

| Name | Version | Role in this repo | Load-bearing? |
|---|---|---|---|
${runtime || '| — | — | — | — |'}

## Dev / bundled

| Name | Version | Role in this repo | Load-bearing? |
|---|---|---|---|
${dev || '| — | — | — | — |'}
`;
}

function riskMarkdown() {
  return `---
status: baseline
owner: Pepper Potts + Tony Stark
created: ${now()}
last_refreshed: ${now()}
---

# Risk Spots

| Area | Symptom | Likely cause | Confidence |
|---|---|---|---|
| | | | |

Run \`wize-dev-kit document-project initial_scan deep\` to populate risk spots.
`;
}

function questionsMarkdown() {
  return `---
status: baseline
owner: Pepper Potts + Peggy Carter
created: ${now()}
last_refreshed: ${now()}
---

# Open Questions

| Question | Why it matters | Owner to ask |
|---|---|---|
| | | |
`;
}

function runQuick(projectRoot, opts = {}) {
  const pkg = readPackage(projectRoot);
  const dir = path.join(projectRoot, '.wize', 'knowledge', 'document-project');
  fs.mkdirSync(dir, { recursive: true });

  const written = [];
  for (const [name, factory] of Object.entries(BASELINE_FILES)) {
    const file = path.join(dir, name);
    const content = factory(projectRoot, pkg);
    fs.writeFileSync(file, content, 'utf-8');
    written.push(name);
  }

  if (opts.log) opts.log(`Quick baseline written to ${dir}`);
  return { changed: true, mode: 'quick', written };
}

module.exports = { runQuick, BASELINE_FILES, countLines };
