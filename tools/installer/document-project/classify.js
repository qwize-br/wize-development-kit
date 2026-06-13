// Project-type classifier for `wize-dev-kit document-project`.
//
// Detects the project type(s) of a repo from file patterns, then decides
// whether the repo is a monolith, multi-part, or monorepo.
// No source files are read — this is pattern-only detection.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MULTI_PART_FOLDERS = ['client', 'server', 'api', 'web', 'app', 'frontend', 'backend', 'mobile', 'desktop'];

function toBool(v) {
  return String(v).toLowerCase() === 'true';
}

function splitPatterns(str) {
  if (!str || str === 'N/A') return [];
  return str.split(';').map(s => s.trim()).filter(Boolean);
}

function loadRequirements(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const header = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    for (let j = 0; j < header.length; j++) {
      const key = header[j];
      const raw = values[j];
      if (key.startsWith('requires_')) {
        row[key] = toBool(raw);
      } else {
        row[key] = raw || '';
      }
    }
    rows.push(row);
  }
  return rows;
}

function globMatch(rootDir, pattern) {
  // Very small pattern matcher: supports * wildcard and trailing / for dirs.
  const isDirPattern = pattern.endsWith('/');
  const base = isDirPattern ? pattern.slice(0, -1) : pattern;
  const parts = base.split('/');
  return walkMatch(rootDir, parts, 0, isDirPattern);
}

function walkMatch(dir, parts, depth, isDirPattern) {
  if (depth >= parts.length) return true;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return false; }
  const part = parts[depth];
  const isLast = depth === parts.length - 1;
  const regex = globToRegex(part);
  for (const e of entries) {
    if (!regex.test(e.name)) continue;
    if (isLast) {
      if (isDirPattern && e.isDirectory()) return true;
      if (!isDirPattern && e.isFile()) return true;
      if (!isDirPattern && e.isDirectory()) {
        // pattern like vite.config.* can match a directory named vite.config.ts? no.
        // But pattern may be a prefix; treat directory match as false for files.
        return false;
      }
    } else if (e.isDirectory()) {
      if (walkMatch(path.join(dir, e.name), parts, depth + 1, isDirPattern)) return true;
    }
  }
  return false;
}

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

function scorePart(rootDir, row, { prefer = [] } = {}) {
  let score = 0;
  const keyPatterns = splitPatterns(row.key_file_patterns);
  const dirPatterns = splitPatterns(row.critical_directories);
  for (const p of keyPatterns) {
    if (globMatch(rootDir, p)) score += 2;
  }
  for (const p of dirPatterns) {
    if (globMatch(rootDir, p)) score += 1;
  }
  if (prefer.includes(row.project_type_id)) score += 0.5;
  return score;
}

function detectParts(rootDir) {
  const parts = [];
  const candidates = [];
  let entries;
  try { entries = fs.readdirSync(rootDir, { withFileTypes: true }); } catch { return parts; }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!MULTI_PART_FOLDERS.includes(e.name.toLowerCase())) continue;
    candidates.push(e.name);
  }

  if (candidates.length < 2) return parts;

  const rows = loadRequirements(requirementsPath());
  for (const partId of candidates) {
    const partRoot = path.join(rootDir, partId);
    const prefer = partId.toLowerCase() === 'server' || partId.toLowerCase() === 'backend' ? ['backend'] : [];
    const scored = rows.map(r => ({ ...r, score: scorePart(partRoot, r, { prefer }) }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best && best.score > 0) {
      parts.push({ part_id: partId, project_type_id: best.project_type_id, root_path: partRoot });
    }
  }
  return parts;
}

function isMultiPart(rootDir) {
  return detectParts(rootDir).length >= 2;
}

function classifyProject(rootDir, options = {}) {
  const csvPath = options.csvPath || requirementsPath();
  const rows = loadRequirements(csvPath);
  const parts = detectParts(rootDir);

  if (parts.length >= 2) {
    return { projectTypes: [...new Set(parts.map(p => p.project_type_id))], parts };
  }

  const scored = rows.map(r => ({ ...r, score: scorePart(rootDir, r, { prefer: options.prefer || [] }) }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const tied = scored.filter(s => s.score === best.score).map(s => s.project_type_id);

  if (!best || best.score === 0) {
    return { projectTypes: [], parts: [] };
  }

  // Cli + library often appear together; prefer both when tied at the top.
  const projectTypes = tied.includes('cli') && tied.includes('library')
    ? ['cli', 'library']
    : [best.project_type_id];

  return {
    projectTypes,
    parts: [{ part_id: 'root', project_type_id: best.project_type_id, root_path: rootDir }]
  };
}

function requirementsPath() {
  // When running from the installed package, the CSV is next to this file under
  // node_modules/wize-dev-kit/... When running from the source repo, resolve from
  // the repo root via the known relative path.
  const installed = path.resolve(__dirname, '..', '..', '..', 'src', 'method-skills', '1-analysis', 'wize-document-project', 'documentation-requirements.csv');
  if (fs.existsSync(installed)) return installed;
  // Fallback for source repo layout.
  return path.resolve(__dirname, '..', '..', '..', '..', 'src', 'method-skills', '1-analysis', 'wize-document-project', 'documentation-requirements.csv');
}

module.exports = { classifyProject, loadRequirements, isMultiPart, scorePart, requirementsPath, globMatch };
