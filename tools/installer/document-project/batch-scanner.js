// Batch scanner for `wize-dev-kit document-project`.
//
// Walks a repo in subfolder-sized batches, skipping noise directories.
// Returns summaries without loading entire trees into memory.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_IGNORE = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.tmp',
  '.wize',
  '.claude',
  '.cursor',
  '.kimi',
  '.opencode',
  '.windsurf',
  '.continue',
  '.codex',
  '.antigravity'
]);

const MAX_FILE_LOC = 5000;

function shouldIgnore(name, customIgnore = []) {
  if (DEFAULT_IGNORE.has(name)) return true;
  for (const pattern of customIgnore) {
    if (name === pattern || (pattern.startsWith('*') && name.endsWith(pattern.slice(1)))) return true;
  }
  return false;
}

function listSubfolders(rootDir, options = {}) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(rootDir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (shouldIgnore(e.name, options.ignore)) continue;
    out.push(path.join(rootDir, e.name));
  }
  return out;
}

function scanFolder(folderPath, options = {}) {
  const files = [];
  let totalLoc = 0;
  const stack = [folderPath];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!shouldIgnore(e.name, options.ignore)) stack.push(full);
        continue;
      }
      if (!e.isFile()) continue;
      if (/\.(min\.js|map)$/.test(e.name)) continue;
      const stat = fs.statSync(full);
      const loc = stat.size; // proxy; exact line count is optional
      const info = {
        path: full,
        relative: path.relative(folderPath, full),
        size: stat.size,
        loc: loc > MAX_FILE_LOC ? MAX_FILE_LOC : loc,
        skipped: loc > MAX_FILE_LOC
      };
      files.push(info);
      totalLoc += info.loc;
    }
  }
  return { folder: folderPath, files, totalLoc, fileCount: files.length };
}

function batchScanner(rootDir, options = {}) {
  const folders = options.folders || listSubfolders(rootDir, options);
  const results = [];
  for (const folder of folders) {
    results.push(scanFolder(folder, options));
  }
  return results;
}

module.exports = { batchScanner, listSubfolders, scanFolder, shouldIgnore, MAX_FILE_LOC };
