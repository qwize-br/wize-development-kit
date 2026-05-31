/*
 * Project detection — distinguishes greenfield from brownfield repos.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SIGNALS = [
  { file: 'package.json',  weight: 3, kind: 'js' },
  { file: 'pubspec.yaml',  weight: 3, kind: 'flutter' },
  { file: 'Cargo.toml',    weight: 3, kind: 'rust' },
  { file: 'go.mod',        weight: 3, kind: 'go' },
  { file: 'composer.json', weight: 3, kind: 'php' },
  { file: 'pyproject.toml',weight: 3, kind: 'python' },
  { file: 'Gemfile',       weight: 3, kind: 'ruby' },
  { file: 'src',           weight: 2, kind: 'src-dir', isDir: true },
  { file: 'app',           weight: 2, kind: 'app-dir', isDir: true },
  { file: 'lib',           weight: 2, kind: 'lib-dir', isDir: true },
  { file: 'README.md',     weight: 1, kind: 'docs' },
  { file: 'docs',          weight: 1, kind: 'docs-dir', isDir: true }
];

function detect(rootDir = process.cwd()) {
  const found = [];
  let score = 0;
  for (const s of SIGNALS) {
    const p = path.join(rootDir, s.file);
    const exists = fs.existsSync(p);
    if (!exists) continue;
    if (s.isDir && !fs.statSync(p).isDirectory()) continue;
    found.push(s);
    score += s.weight;
  }
  return {
    brownfield: score >= 3,
    score,
    signals: found.map(s => s.file),
    kinds: [...new Set(found.map(s => s.kind))]
  };
}

module.exports = { detect };
