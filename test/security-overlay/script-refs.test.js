'use strict';

// script-refs.test.js — every `scripts/<name>.js` a security-overlay skill
// or script names must exist next to the file that names it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS = path.join(__dirname, '..', '..', 'src', 'security-overlay', 'skills');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

test('security-overlay script references resolve to real files', () => {
  const missing = [];
  for (const skill of fs.readdirSync(SKILLS)) {
    const root = path.join(SKILLS, skill);
    if (!fs.statSync(root).isDirectory()) continue;
    for (const file of walk(root).filter((f) => /\.(md|js)$/.test(f))) {
      const text = fs.readFileSync(file, 'utf8');
      for (const [, name] of text.matchAll(/scripts\/([\w.-]+\.js)/g)) {
        if (!fs.existsSync(path.join(root, 'scripts', name))) {
          missing.push(`${path.relative(SKILLS, file)} -> scripts/${name}`);
        }
      }
    }
  }
  assert.deepEqual(missing, []);
});
