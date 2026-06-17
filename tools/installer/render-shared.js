// Shared helpers used by all IDE adapters: kit traversal, asset parsing,
// and renderers for the Anthropic-style "SKILL.md" format (Claude Code,
// Antigravity, OpenAI Codex, Kimi Code all use it verbatim).
//
// Adapters that need a different format (Cursor .mdc, Windsurf, Continue,
// OpenCode) consume the parsed assets via collectAssets() and then render
// per their own conventions.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { walkAgents, walkWorkflows, walkSkills } = require('./validators/walk.js');

function readYamlField(content, field) {
  const re = new RegExp('^' + field + ':\\s*(?:"([^"]*)"|\'([^\']*)\'|(.*?))\\s*$', 'm');
  const m = content.match(re);
  if (!m) return null;
  return (m[1] || m[2] || m[3] || '').trim();
}

function readFrontmatter(content) {
  if (!content.startsWith('---')) return {};
  const end = content.indexOf('\n---', 3);
  if (end === -1) return {};
  const lines = content.slice(3, end).split('\n');
  const out = {};
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
  return out;
}

function bodyAfterFrontmatter(content) {
  if (!content.startsWith('---')) return content;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return content;
  return content.slice(end + 4).replace(/^\s+/, '');
}

function escapeYamlDouble(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function clipOneLine(str, max = 240) {
  const flat = String(str).replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max - 1).trimEnd() + '…';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Companion files (steps/, templates/, data/, *.csv, *-template.md,
// customize.toml, research.template.md, etc.) that micro-file workflows
// reference from their body. We must copy these alongside the SKILL.md so
// the IDE can resolve paths like "./steps/step-01-init.md" at runtime.
const SKIP_NAMES = new Set(['.DS_Store', 'Thumbs.db', 'node_modules', '.git']);
const SKIP_FILES = new Set([
  'skill.md', 'workflow.md', 'agent.yaml', 'persona.md',
  'package.json', 'package-lock.json'
]);

function isCompanion(entry) {
  if (entry.name.startsWith('.')) return false;
  if (SKIP_NAMES.has(entry.name)) return false;
  if (SKIP_FILES.has(entry.name)) return false;
  if (entry.name.endsWith('.test.js')) return false;
  return true;
}

function copyCompanionFiles(srcDir, destDir, written, relPrefix = '') {
  if (!srcDir || !fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (!isCompanion(entry)) continue;
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      ensureDir(d);
      copyCompanionFiles(s, d, written, rel);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(d));
      fs.copyFileSync(s, d);
      written.push(rel);
    }
  }
}

// Walks the kit and returns a flat array of "assets" the adapters can render.
// Each asset has: { kind: 'agent'|'workflow'|'skill', code, name, title, description, body, overlay }
function collectAssets(kitRoot, { profiles = ['core'] } = {}) {
  const out = [];
  const profSet = new Set(profiles);

  for (const yamlPath of walkAgents(kitRoot)) {
    const dir = path.dirname(yamlPath);
    const yaml = fs.readFileSync(yamlPath, 'utf-8');
    const code = readYamlField(yaml, 'code');
    const name = readYamlField(yaml, 'name');
    const title = readYamlField(yaml, 'title') || '';
    const description = readYamlField(yaml, 'description') || '';
    if (!code || !name) continue;
    const personaPath = path.join(dir, 'persona.md');
    const persona = fs.existsSync(personaPath) ? fs.readFileSync(personaPath, 'utf-8') : '';
    out.push({ kind: 'agent', code, name, title, description, body: persona || description, overlay: null, srcDir: dir });
  }

  for (const wfPath of walkWorkflows(kitRoot)) {
    const content = fs.readFileSync(wfPath, 'utf-8');
    const fm = readFrontmatter(content);
    if (!fm.code) continue;
    if (fm.overlay === 'web' && !profSet.has('web-overlay')) continue;
    if (fm.overlay === 'app' && !profSet.has('app-overlay')) continue;
    out.push({
      kind: 'workflow',
      code: fm.code,
      name: fm.name || fm.code,
      title: fm.phase || fm.gate || '',
      description: `${fm.phase || fm.gate || 'workflow'}: ${fm.name || fm.code}`,
      body: bodyAfterFrontmatter(content),
      overlay: fm.overlay || null,
      srcDir: path.dirname(wfPath)
    });
  }

  for (const skPath of walkSkills(kitRoot)) {
    const content = fs.readFileSync(skPath, 'utf-8');
    const fm = readFrontmatter(content);
    if (!fm.code) continue;
    out.push({
      kind: 'skill',
      code: fm.code,
      name: fm.name || fm.code,
      title: fm.module || '',
      description: fm.module ? `${fm.module} skill: ${fm.name || fm.code}` : (fm.name || fm.code),
      body: bodyAfterFrontmatter(content),
      overlay: null,
      srcDir: path.dirname(skPath)
    });
  }

  return out;
}

// Anthropic-style SKILL.md renderer used by Claude Code, Antigravity, Codex, Kimi.
// Each asset becomes <targetDir>/<code>/SKILL.md with YAML frontmatter (name, description).
function renderAnthropicSkills(kitRoot, targetDir, opts = {}) {
  const assets = collectAssets(kitRoot, opts);
  const written = [];
  if (!opts.dryRun) ensureDir(targetDir);

  for (const a of assets) {
    const desc = clipOneLine(
      a.kind === 'agent'
        ? `${a.name} (${a.title}) — ${a.description}`
        : a.description
    );
    const heading = a.kind === 'agent' ? `# ${a.name} — ${a.title}` : `# ${a.name}`;
    const content = [
      '---',
      `name: ${a.code}`,
      `description: "${escapeYamlDouble(desc)}"`,
      '---',
      '',
      heading,
      '',
      a.body.trim(),
      ''
    ].join('\n');

    if (opts.dryRun) {
      written.push(`[dry-run] ${a.code}/SKILL.md`);
    } else {
      const skillDir = path.join(targetDir, a.code);
      ensureDir(skillDir);
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf-8');
      written.push(`${a.code}/SKILL.md`);
      // Copy companion files (steps/, templates/, data/, *.csv, customize.toml,
      // *-template.md, research.template.md, etc.) so micro-file workflows can
      // resolve relative paths from inside the SKILL body.
      copyCompanionFiles(a.srcDir, skillDir, written, a.code);
    }
  }
  return { written, skipped: [] };
}

// Convenience emitter for a root-level AGENTS.md — read by Codex, Cursor,
// Windsurf and Antigravity as a baseline pointer to the kit's deeper docs.
function renderAgentsMd(kitRoot, projectRoot, opts = {}) {
  const assets = collectAssets(kitRoot, opts);
  const agents = assets.filter(a => a.kind === 'agent');
  const file = path.join(projectRoot, 'AGENTS.md');
  if (fs.existsSync(file) && !opts.overwrite) {
    return { written: [], skipped: ['AGENTS.md (already present; not overwritten)'] };
  }
  const lines = [
    '# Agents — Wize Development Kit',
    '',
    'This repo is wired with the [`wize-dev-kit`](https://www.npmjs.com/package/wize-dev-kit).',
    'Detailed artifacts live under `.wize/`. The agents below are activated through your AI IDE',
    'using slash commands (Claude Code, Codex, Cursor, Windsurf, Antigravity all read this file).',
    '',
    '## Roster',
    ''
  ];
  for (const a of agents) {
    lines.push(`- **${a.name}** (\`${a.code}\`) — ${a.title}. ${clipOneLine(a.description, 180)}`);
  }
  lines.push('', '## Where to start', '', 'Activate the orchestrator: `wize-orchestrator` (Wizer). Then ask `/wize-help`.', '');

  if (opts.dryRun) return { written: ['[dry-run] AGENTS.md'], skipped: [] };
  fs.writeFileSync(file, lines.join('\n'), 'utf-8');
  return { written: ['AGENTS.md'], skipped: [] };
}

module.exports = {
  collectAssets,
  renderAnthropicSkills,
  renderAgentsMd,
  copyCompanionFiles,
  // Re-exports for adapter authors who need to roll their own format:
  readFrontmatter,
  bodyAfterFrontmatter,
  escapeYamlDouble,
  clipOneLine,
  ensureDir
};
