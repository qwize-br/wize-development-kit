// Minimal TOML reader/writer for the subset the kit emits: `[section]`
// headers, `key = "value"` scalars and `key = ["a", "b"]` string arrays.
// The writer is surgical: it edits one string value in place and verifies the
// result, so a caller can never report a rewrite that did not happen.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Drops a trailing `# comment`, but only when the `#` sits outside a string.
function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote === '"') {
      if (ch === '\\') i++;
      else if (ch === '"') quote = null;
    } else if (quote === "'") {
      if (ch === "'") quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '#') {
      return line.slice(0, i);
    }
  }
  return line;
}

function parseTomlValue(raw) {
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (!isNaN(Number(raw))) return Number(raw);
  return raw;
}

function parseToml(content) {
  const out = {};
  let section = null;
  for (const raw of content.split('\n')) {
    const line = stripComment(raw).trim();
    if (!line) continue;
    const head = line.match(/^\[([^\]]+)\]$/);
    if (head) { section = head[1]; out[section] = out[section] || {}; continue; }
    const kv = line.match(/^([a-zA-Z_][\w-]*)\s*=\s*(.+)$/);
    if (!kv) continue;
    const [, key, valRaw] = kv;
    const v = parseTomlValue(valRaw.trim());
    if (section) out[section][key] = v;
    else out[key] = v;
  }
  return out;
}

function readToml(file) {
  let content;
  try { content = fs.readFileSync(file, 'utf-8'); } catch { return {}; }
  return parseToml(content);
}

function loadProjectConfig(projectRoot) {
  return readToml(path.join(projectRoot, '.wize/config/project.toml'));
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pure rewrite of `key = "value"` inside `[section]`: keeps a trailing
// comment, inserts the key right after the header when absent. Returns the new
// text (identical to `content` when nothing changes), or null when the value
// is unsafe to write, the section is missing, the key holds a non-string
// value, or the result does not parse back to the new value.
function rewriteTomlValue(content, section, key, value) {
  const val = String(value);
  if (/["\\\r\n]/.test(val)) return null;

  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split('\n');
  const headRe = new RegExp('^\\s*\\[' + escapeRe(section) + '\\]\\s*(#.*)?\\r?$');
  const start = lines.findIndex(l => headRe.test(l));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) { end = i; break; }
  }

  const keyRe = new RegExp('^\\s*' + escapeRe(key) + '\\s*=');
  const strRe = new RegExp('^(\\s*' + escapeRe(key) + '\\s*=\\s*)"[^"]*"(\\s*(#.*)?)$');
  let idx = -1;
  for (let i = start + 1; i < end; i++) {
    if (keyRe.test(lines[i])) { idx = i; break; }
  }

  if (idx === -1) {
    lines.splice(start + 1, 0, `${key} = "${val}"` + (eol === '\r\n' ? '\r' : ''));
  } else {
    if (!strRe.test(lines[idx])) return null;
    lines[idx] = lines[idx].replace(strRe, (_, pre, post) => `${pre}"${val}"${post}`);
  }

  const next = lines.join('\n');
  const parsed = parseToml(next);
  return parsed[section] && parsed[section][key] === val ? next : null;
}

// Sets `key = "value"` inside `[section]` on disk. Returns false when the
// rewrite is refused or the re-read file does not carry the new value.
function setTomlValue(file, section, key, value) {
  let content;
  try { content = fs.readFileSync(file, 'utf-8'); } catch { return false; }
  const next = rewriteTomlValue(content, section, key, value);
  if (next === null) return false;
  if (next !== content) {
    const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`);
    try {
      fs.writeFileSync(tmp, next, 'utf-8');
      fs.renameSync(tmp, file);
    } catch {
      try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
      return false;
    }
  }
  const parsed = readToml(file);
  return !!(parsed[section] && parsed[section][key] === String(value));
}

module.exports = { readToml, parseToml, loadProjectConfig, rewriteTomlValue, setTomlValue };
