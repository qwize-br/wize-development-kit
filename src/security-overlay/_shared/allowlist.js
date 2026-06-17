'use strict';

// allowlist.js — gate that filters arguments for an external pentest tool
// before they are passed to child_process.execFile. The list of allowed
// flags per tool lives in src/security-overlay/data/tool-allowlist.json.
//
// Schema (per tool, array of strings):
//   "-foo"        switch with no value
//   "-foo:"       switch that consumes the next argv as its value
//   "-foo=bar"    switch with a fixed value (only the literal "bar" is allowed)
//   "--flag="     switch that consumes a value joined by '=' (e.g. --level=1)
//
// Invariant: args NOT in the allowlist (or args that look like values for
// flags not in the allowlist) are dropped. Positional args (targets, URLs)
// pass through unchanged.

const fs = require('node:fs');
const path = require('node:path');

class UnknownToolError extends Error {
  constructor(tool) {
    super(`Unknown tool "${tool}" — not in tool-allowlist.json. Refusing to invoke.`);
    this.name = 'UnknownToolError';
    this.tool = tool;
  }
}

const DEFAULT_ALLOWLIST_PATH = path.join(__dirname, '..', 'data', 'tool-allowlist.json');

let _cache = null;
function _loadDefault() {
  if (_cache) return _cache;
  const raw = fs.readFileSync(DEFAULT_ALLOWLIST_PATH, 'utf8');
  _cache = JSON.parse(raw);
  return _cache;
}

function loadAllowlist(filePath) {
  const fp = filePath || DEFAULT_ALLOWLIST_PATH;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

// Heuristic for "is this arg a flag?": starts with '-' and is more than 1 char
// (a bare "-" is sometimes used as stdin, treat as positional).
function isFlag(arg) {
  return typeof arg === 'string' && arg.length > 1 && arg[0] === '-';
}

// Classify one allowlist token into one of:
//   { kind: 'switch' }                       — no value
//   { kind: 'colon',   prefix: '-foo' }      — consumes next argv (e.g. -f path)
//   { kind: 'equals',  prefix: '--flag=' }   — consumes value joined by '=' (e.g. --level=1)
//   { kind: 'literal', full: '-foo=bar' }    — only the exact form is allowed
//
// When matching an arg, we try in order: literal, then colon (exact prefix
// match, e.g. arg === '-u'), then equals (arg starts with prefix, e.g.
// arg === '--level=1'), then switch (exact equality).
function classify(token) {
  if (token.endsWith(':')) {
    return { kind: 'colon', prefix: token.slice(0, -1) };
  }
  if (token.endsWith('=') && token.startsWith('--')) {
    return { kind: 'equals', prefix: token };
  }
  if (token.includes('=') && !token.endsWith('=')) {
    return { kind: 'literal', full: token };
  }
  return { kind: 'switch' };
}

// Given a flag arg, find the first allowlist token that matches it.
function matchFlag(toolData, arg) {
  // Literal first (most specific).
  for (const tok of toolData) {
    if (classify(tok).kind === 'literal' && arg === tok) return { consumeNext: false };
  }
  // Then colon (exact prefix match) — e.g. arg === '-u'.
  for (const tok of toolData) {
    if (classify(tok).kind === 'colon' && arg === classify(tok).prefix) return { consumeNext: true };
  }
  // Then equals — e.g. arg starts with '--level='.
  for (const tok of toolData) {
    if (classify(tok).kind === 'equals' && arg.startsWith(classify(tok).prefix)) return { consumeNext: false };
  }
  // Then switch.
  for (const tok of toolData) {
    if (classify(tok).kind === 'switch' && tok === arg) return { consumeNext: false };
  }
  return null;
}

// filterArgs(tool, args, allowlist) — keep only args allowed by the tool's
// allowlist, handling value-bearing flags correctly.
function filterArgs(tool, args, allowlist) {
  const data = allowlist || _loadDefault();
  if (!Object.prototype.hasOwnProperty.call(data, tool)) {
    throw new UnknownToolError(tool);
  }
  const toolData = data[tool];

  const out = [];
  let i = 0;
  const list = args || [];
  while (i < list.length) {
    const arg = list[i];
    if (!isFlag(arg)) {
      // Positional: target, URL, output path.
      out.push(arg);
      i++;
      continue;
    }
    const m = matchFlag(toolData, arg);
    if (!m) {
      // Unknown flag — drop the flag. We do NOT also drop the next arg,
      // because a positional after a stripped flag is still a positional
      // (caller may have intended both to pass). However, common patterns
      // are value-bearing: e.g. `--script vuln` — if the flag is dropped,
      // "vuln" is also dropped to avoid leaking. This is the safe default.
      if (looksLikeValueArg(list[i + 1])) {
        // Consume the next arg as part of the dropped flag's expected value.
        i += 2;
      } else {
        i++;
      }
      continue;
    }
    out.push(arg);
    if (m.consumeNext) {
      // Value-bearing: the next argv is the value. Pass it through.
      if (i + 1 < list.length) {
        out.push(list[i + 1]);
        i += 2;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  return out;
}

// A value arg is one that does NOT start with '-' (or is the bare "-").
function looksLikeValueArg(arg) {
  return arg !== undefined && (typeof arg !== 'string' || arg.length === 0 || arg[0] !== '-');
}

module.exports = {
  filterArgs,
  loadAllowlist,
  UnknownToolError,
  classify,
  matchFlag
};
