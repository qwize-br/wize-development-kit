// Deep-dive mode for `wize-dev-kit document-project`.
//
// Exhaustive documentation of a specific folder/file/feature.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { batchScanner, scanFolder } = require('../batch-scanner.js');
const { updateState } = require('../state.js');
const { renderIndex } = require('../render-index.js');

function sanitize(name) {
  return name.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
}

function walkAllFiles(rootDir, ignore = ['node_modules', '.git', 'dist', 'build', 'coverage']) {
  const files = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!ignore.includes(e.name)) stack.push(full);
        continue;
      }
      if (e.isFile() && /\.(js|ts|jsx|tsx|mjs|cjs)$/.test(e.name)) files.push(full);
    }
  }
  return files;
}

function matchesTarget(filePath, projectRoot, targetType, targetName) {
  const rel = path.relative(projectRoot, filePath).toLowerCase();
  const name = targetName.toLowerCase();
  if (targetType === 'feature') {
    return rel.includes(name);
  }
  if (targetType === 'api_group') {
    const inApiFolder = /\/(routes|api|controllers|endpoints)\//.test(rel);
    return inApiFolder && rel.includes(name);
  }
  if (targetType === 'component_group') {
    const inComponentFolder = /\/(components|ui|widgets)\//.test(rel);
    return inComponentFolder && rel.includes(name);
  }
  return false;
}

function resolveTarget(projectRoot, target) {
  if (!target) return { targetType: null, targetName: null, targetPath: null, files: [] };

  // Explicit typed target: "feature:auth", "api:users", "component:Button"
  const typedMatch = target.match(/^([a-z_]+):(.+)$/i);
  if (typedMatch) {
    const targetType = typedMatch[1].toLowerCase();
    const targetName = typedMatch[2];
    if (['feature', 'api_group', 'component_group'].includes(targetType)) {
      const all = walkAllFiles(projectRoot);
      const files = all.filter(f => matchesTarget(f, projectRoot, targetType, targetName));
      return { targetType, targetName, targetPath: target, files };
    }
    return { targetType, targetName, targetPath: target, files: [], error: `unknown target type: ${targetType}` };
  }

  // Path-based target (folder or file)
  const targetPath = path.resolve(projectRoot, target);
  if (fs.existsSync(targetPath)) {
    const stats = fs.statSync(targetPath);
    const targetType = stats.isFile() ? 'file' : 'folder';
    const files = stats.isFile() ? [targetPath] : scanFolder(targetPath, { ignore: ['node_modules', '.git', 'dist', 'build', 'coverage'] }).files.map(f => f.path);
    return { targetType, targetName: path.basename(targetPath), targetPath, files };
  }

  // Bare name treated as feature search
  const all = walkAllFiles(projectRoot);
  const files = all.filter(f => matchesTarget(f, projectRoot, 'feature', target));
  return { targetType: 'feature', targetName: target, targetPath: target, files };
}

function listFilesInScope(rootDir, targetPath) {
  const stats = fs.statSync(targetPath);
  if (stats.isFile()) return [targetPath];
  const scan = scanFolder(targetPath, { ignore: ['node_modules', '.git', 'dist', 'build', 'coverage'] });
  return scan.files.map(f => f.path);
}

function readFileSummary(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const exports = [];
    const todos = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\b(module\.exports|exports\.|export\s+(default\s+)?|function\s+|class\s+)/.test(line)) {
        exports.push(line.trim().slice(0, 80));
      }
      if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(line)) {
        todos.push(`${i + 1}: ${line.trim().slice(0, 80)}`);
      }
    }
    return {
      path: filePath,
      loc: lines.length,
      exports: exports.slice(0, 10),
      todos: todos.slice(0, 10)
    };
  } catch {
    return { path: filePath, loc: 0, exports: [], todos: [] };
  }
}

function runDeepDive(projectRoot, { target, log = console.log } = {}) {
  if (!target) {
    return { ok: false, error: 'missing --target for deep_dive', exitCode: 1 };
  }

  const resolved = resolveTarget(projectRoot, target);
  if (resolved.error) {
    return { ok: false, error: resolved.error, exitCode: 1 };
  }
  if (resolved.targetType === 'file' || resolved.targetType === 'folder') {
    if (!fs.existsSync(resolved.targetPath)) {
      return { ok: false, error: `target not found: ${target}`, exitCode: 1 };
    }
  }
  if (resolved.files.length === 0) {
    return { ok: false, error: `target not found or no files matched: ${target}`, exitCode: 1 };
  }

  const files = resolved.files;
  const summaries = files.map(readFileSummary);
  const targetName = resolved.targetName;
  const outputName = `deep-dive-${sanitize(targetName)}.md`;
  const outputPath = path.join(projectRoot, '.wize', 'knowledge', 'document-project', outputName);

  const lines = [
    '---',
    'status: baseline',
    'owner: Pepper Potts + Tony Stark',
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `last_refreshed: ${new Date().toISOString().slice(0, 10)}`,
    '---',
    '',
    `# Deep Dive — ${targetName}`,
    '',
    `**Type:** ${resolved.targetType}`,
    `**Scope:** ${target}`,
    `**Files analyzed:** ${files.length}`,
    '',
    '## File Inventory',
    ''
  ];

  for (const s of summaries) {
    lines.push(`### ${path.relative(projectRoot, s.path)}`);
    lines.push(`- **LOC:** ${s.loc}`);
    if (s.exports.length) {
      lines.push('- **Exports/signatures:**');
      for (const e of s.exports) lines.push(`  - \`${e}\``);
    }
    if (s.todos.length) {
      lines.push('- **TODOs/FIXMEs:**');
      for (const t of s.todos) lines.push(`  - ${t}`);
    }
    lines.push('');
  }

  lines.push('## Modification Guidance', '', '- Verify tests before changing exported signatures.', '');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');

  updateState(projectRoot, {
    deep_dive_targets: [{
      target_name: targetName,
      target_path: resolved.targetPath,
      files_analyzed: files.length,
      output_file: outputName,
      timestamp: new Date().toISOString()
    }],
    outputs_generated: [outputName]
  });

  // Update master index with a link to this deep-dive doc.
  renderIndex(projectRoot, { deepDiveFiles: [outputName] });

  log(`Deep-dive written to ${outputPath}`);
  return { ok: true, mode: 'deep_dive', changed: true, written: [outputName] };
}

module.exports = { runDeepDive, listFilesInScope, readFileSummary, resolveTarget };
