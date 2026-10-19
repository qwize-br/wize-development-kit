// Small helpers shared by the installer modules.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// realpath with a lexical fallback for paths that do not exist.
function real(p) {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}

// Same members, ignoring order and duplicates.
const sameSet = (a, b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());

module.exports = { real, sameSet };
