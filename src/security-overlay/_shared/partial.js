'use strict';

// partial.js — the contract between phase skills and the report render.
//
// All phase skills write their findings to <securityDir>/<phase>.md using
// this helper. The format is a YAML frontmatter (zero-dep serialization)
// followed by `## <heading>` sections in a stable order. The report
// (wize-sec-report) consumes these parciais and produces the final MD/HTML.
//
// Reruns are idempotent: writePartial overwrites the file in place; sections
// are rendered in the order provided by the caller.

const fs = require('node:fs');
const path = require('node:path');

const PARTIALS_SUBDIR = '.wize/security';

// --- serialization helpers (zero-dep) ------------------------------------

// YAML-quote a string value (only when needed). Strings that look like
// numbers or booleans are still rendered as plain scalars — but the parse
// side uses a STRICT type-coercion only when the string came in as a
// non-string. That keeps version="2.9" round-tripping as a string.
function yamlScalar(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // Quote when the string contains characters that YAML would mis-parse
    // OR when the string is empty / has leading/trailing whitespace.
    if (/[:#&*?|<>=!%@`\n]/.test(value) || value === '' || /^\s|\s$/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  throw new Error(`yamlScalar: unsupported type ${typeof value}`);
}

// Build a nested YAML mapping under a fixed indent. Used for `tools:` and
// any other { name: { ... } } structure. Depth is unbounded; objects are
// rendered as nested mappings, scalars as flat `key: value` lines.
function renderNestedMap(obj, indent) {
  const pad = ' '.repeat(indent);
  const inner = ' '.repeat(indent + 2);
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(`${pad}${k}:`);
      for (const [k2, v2] of Object.entries(v)) {
        if (v2 && typeof v2 === 'object' && !Array.isArray(v2)) {
          out.push(`${inner}${k2}:`);
          const inner2 = ' '.repeat(indent + 4);
          for (const [k3, v3] of Object.entries(v2)) {
            out.push(`${inner2}${k3}: ${yamlScalar(v3)}`);
          }
        } else {
          out.push(`${inner}${k2}: ${yamlScalar(v2)}`);
        }
      }
    } else {
      out.push(`${pad}${k}: ${yamlScalar(v)}`);
    }
  }
  return out.join('\n');
}

// Parse a flat YAML frontmatter into an object. We only accept the limited
// shape the helper writes: flat `key: value` lines plus a `tools:` block
// that may nest 2 levels deep (tool -> { key: value }). This is
// intentionally not a general YAML parser.
function parseFrontmatter(text) {
  const lines = text.split('\n');
  const out = {};
  let inTools = false;
  let tools = null;
  let toolKey = null;
  for (const raw of lines) {
    if (inTools) {
      if (raw.trim() === '') continue;
      // 2-space-indented top-level key under `tools:`.
      const toolKeyMatch = raw.match(/^  ([a-zA-Z_][a-zA-Z0-9_-]*):\s*$/);
      if (toolKeyMatch) {
        toolKey = toolKeyMatch[1];
        tools[toolKey] = {};
        continue;
      }
      // 4-space-indented mapping under the current tool.
      const valMatch = raw.match(/^    ([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*?)\s*$/);
      if (valMatch && toolKey) {
        tools[toolKey][valMatch[1]] = coerceScalar(valMatch[2]);
        continue;
      }
      // Anything else ends the tools block.
      if (/^\S/.test(raw)) {
        inTools = false;
        toolKey = null;
        // fall through to the top-level branch on the same line
      } else {
        continue;
      }
    }
    if (/^[a-zA-Z_][a-zA-Z0-9_-]*:(\s|$)/.test(raw)) {
      const m = raw.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*?)\s*$/);
      if (!m) continue;
      const [, k, vRaw] = m;
      const v = vRaw.replace(/^['"]|['"]$/g, '');
      if (k === 'tools') {
        inTools = true;
        tools = {};
        out.tools = tools;
        toolKey = null;
        continue;
      }
      out[k] = coerceScalar(v);
    }
  }
  return out;
}

function coerceScalar(v) {
  // Strings are kept as strings (so version="2.9" round-trips as a string,
  // not a number). Booleans and null are explicit.
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  // Inline JSON array: [a, b, c]
  if (/^\[.*\]$/.test(v)) {
    try { return JSON.parse(v); } catch (_) { /* fall through */ }
  }
  return v;
}

// --- public API ----------------------------------------------------------

function defaultSecurityDir() {
  return path.join(process.cwd(), PARTIALS_SUBDIR);
}

// Refuse phase names that try to escape the securityDir.
function assertSafePhase(phase) {
  if (typeof phase !== 'string' || !phase) {
    throw new Error('invalid phase: empty');
  }
  if (phase.includes('..') || phase.includes('/') || phase.includes('\\') || path.isAbsolute(phase)) {
    throw new Error(`partial phase-name-traversal: refused ${JSON.stringify(phase)}`);
  }
}

// writePartial({ securityDir?, phase, mode, scope, status, tools?, sections })
//   - sections: object of { heading: content } (preserves order via Object.keys).
//   - Returns the absolute path of the written file.
function writePartial(opts) {
  if (!opts || typeof opts !== 'object') throw new Error('writePartial: opts required');
  const phase = opts.phase;
  assertSafePhase(phase);
  const sec = opts.securityDir || defaultSecurityDir();
  fs.mkdirSync(sec, { recursive: true });

  const scope = opts.scope || {};
  const scopeSha = (scope.frontmatter && scope.frontmatter.scope_sha256) || (opts.scopeSha256 || '');

  const fm = [];
  fm.push('---');
  fm.push(`phase: ${yamlScalar(phase)}`);
  fm.push(`generated_at: ${new Date().toISOString()}`);
  fm.push(`scope_sha256: ${yamlScalar(scopeSha)}`);
  fm.push(`mode: ${yamlScalar(opts.mode || 'passive')}`);
  fm.push(`partial_status: ${yamlScalar(opts.status || 'complete')}`);
  if (Array.isArray(opts.dependsOn) && opts.dependsOn.length) {
    const arr = '[' + opts.dependsOn.map(v => JSON.stringify(String(v))).join(', ') + ']';
    fm.push(`depends_on: ${arr}`);
  }
  if (opts.tools && Object.keys(opts.tools).length) {
    fm.push(renderNestedMap({ tools: opts.tools }, 0));
  }
  fm.push('---');
  fm.push('');

  const body = [];
  for (const [heading, content] of Object.entries(opts.sections || {})) {
    body.push(`## ${heading}`);
    body.push('');
    body.push(String(content == null ? '' : content).trimEnd());
    body.push('');
  }

  const file = path.join(sec, `${phase}.md`);
  fs.writeFileSync(file, fm.join('\n') + '\n' + body.join('\n'), 'utf8');
  return file;
}

// loadPartial({ securityDir?, phase }) -> { frontmatter, body } or null.
function loadPartial(opts) {
  const phase = opts.phase;
  assertSafePhase(phase);
  const sec = opts.securityDir || defaultSecurityDir();
  const file = path.join(sec, `${phase}.md`);
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return null;
  const frontmatter = parseFrontmatter(fmMatch[1]);
  const body = text.slice(fmMatch[0].length);
  return { frontmatter, body };
}

// listPartials({ securityDir? }) -> array of phase names (sorted).
function listPartials(opts = {}) {
  const sec = opts.securityDir || defaultSecurityDir();
  if (!fs.existsSync(sec)) return [];
  const out = [];
  for (const name of fs.readdirSync(sec)) {
    if (name.endsWith('.md') && !name.startsWith('.')) {
      out.push(name.replace(/\.md$/, ''));
    }
  }
  return out.sort();
}

module.exports = {
  writePartial,
  loadPartial,
  listPartials,
  PARTIALS_SUBDIR
};
