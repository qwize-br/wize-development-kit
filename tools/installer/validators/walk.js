/*
 * Shallow walkers for kit assets — used by validators.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function* walk(rootDir, predicate) {
  if (!fs.existsSync(rootDir)) return;
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        stack.push(full);
      } else if (entry.isFile() && predicate(entry.name, full)) {
        yield full;
      }
    }
  }
}

function walkAgents(kitRoot) {
  return walk(path.join(kitRoot, 'src'), name => name === 'agent.yaml');
}

function walkWorkflows(kitRoot) {
  return walk(path.join(kitRoot, 'src'), name => name === 'workflow.md');
}

function walkSkills(kitRoot) {
  return walk(path.join(kitRoot, 'src'), name => name === 'skill.md');
}

module.exports = { walk, walkAgents, walkWorkflows, walkSkills };
