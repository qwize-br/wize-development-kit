//
// Claude Code adapter — renders kit assets into .claude/skills/wize-{code}/SKILL.md.
//
// Strategy:
//   - For each agent (agent.yaml + persona.md), emit a SKILL.md that pairs the
//     agent identity with its responsibilities, so Claude Code can activate
//     the persona via slash command.
//   - For each workflow/skill file, emit a SKILL.md that wraps the workflow
//     content with an activation frontmatter Claude Code understands.
//
// Each SKILL.md uses the Claude Code skill format:
//     ---
//     name: <code>
//     description: <one-liner shown in the slash menu>
//     ---
//     <body>
//
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { walkAgents, walkWorkflows, walkSkills } = require('../../tools/installer/validators/walk.js');

function readYamlField(content, field) {
  // Minimal scalar/quoted-string extractor for top-level YAML scalars.
  const re = new RegExp(`^${field}:\\s*(?:"([^"]*)"|'([^']*)'|(.*?))\\s*$`, 'm');
  const m = content.match(re);
  if (!m) return null;
  return (m[1] || m[2] || m[3] || '').trim();
}

function readFrontmatter(content) {
  // Returns an object of top-level key:value pairs from a leading
  // ---\n...\n--- block. Simple scalars only.
  if (!content.startsWith('---')) return {};
  const end = content.indexOf('\n---', 3);
  if (end === -1) return {};
  const fm = content.slice(3, end).split('\n');
  const out = {};
  for (const line of fm) {
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

function escapeForYamlDouble(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function clipOneLine(str, max = 240) {
  const flat = String(str).replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max - 1).trimEnd() + '…';
}

function renderAgentSkill({ code, name, title, description, body }) {
  const desc = clipOneLine(`${name} (${title}) — ${description}`);
  return `---
name: ${code}
description: "${escapeForYamlDouble(desc)}"
---

# ${name} — ${title}

${body.trim()}
`;
}

function renderWorkflowSkill({ code, name, description, body }) {
  const desc = clipOneLine(description || `Workflow ${code}`);
  return `---
name: ${code}
description: "${escapeForYamlDouble(desc)}"
---

# ${name}

${body.trim()}
`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeSkill(skillsDir, code, content) {
  const dir = path.join(skillsDir, code);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf-8');
}

/**
 * Render the full kit into `.claude/skills/` at the project root.
 *
 * @param {string} kitRoot - absolute path to the installed wize-dev-kit package
 * @param {string} projectRoot - absolute path to the target repo (cwd of install)
 * @param {object} opts
 * @param {string[]} [opts.profiles] - selected profile codes (e.g., ['core', 'web-overlay'])
 * @param {boolean} [opts.dryRun] - when true, return the list without writing
 * @returns {{ written: string[], skipped: string[] }}
 */
function render(kitRoot, projectRoot, opts = {}) {
  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  const written = [];
  const skipped = [];
  const profiles = new Set(opts.profiles || ['core']);
  const dryRun = !!opts.dryRun;

  if (!dryRun) ensureDir(skillsDir);

  // 1. Agents
  for (const yamlPath of walkAgents(kitRoot)) {
    const dir = path.dirname(yamlPath);
    const yaml = fs.readFileSync(yamlPath, 'utf-8');
    const code = readYamlField(yaml, 'code');
    const name = readYamlField(yaml, 'name');
    const title = readYamlField(yaml, 'title');
    const description = readYamlField(yaml, 'description') || '';
    if (!code || !name) { skipped.push(yamlPath); continue; }

    const personaPath = path.join(dir, 'persona.md');
    const persona = fs.existsSync(personaPath) ? fs.readFileSync(personaPath, 'utf-8') : '';
    const body = persona || description;

    const content = renderAgentSkill({ code, name, title, description, body });
    if (dryRun) {
      written.push(`[dry-run] ${code}/SKILL.md`);
    } else {
      writeSkill(skillsDir, code, content);
      written.push(`${code}/SKILL.md`);
    }
  }

  // 2. Workflows — gate by overlay selection
  for (const wfPath of walkWorkflows(kitRoot)) {
    const content = fs.readFileSync(wfPath, 'utf-8');
    const fm = readFrontmatter(content);
    const code = fm.code;
    const name = fm.name || code;
    if (!code) { skipped.push(wfPath); continue; }

    if (fm.overlay === 'web' && !profiles.has('web-overlay')) { skipped.push(wfPath); continue; }
    if (fm.overlay === 'app' && !profiles.has('app-overlay')) { skipped.push(wfPath); continue; }

    const description = `${fm.phase || fm.gate || 'workflow'}: ${name}`;
    const body = bodyAfterFrontmatter(content);
    const skillContent = renderWorkflowSkill({ code, name, description, body });
    if (dryRun) {
      written.push(`[dry-run] ${code}/SKILL.md`);
    } else {
      writeSkill(skillsDir, code, skillContent);
      written.push(`${code}/SKILL.md`);
    }
  }

  // 3. Standalone skills
  for (const skPath of walkSkills(kitRoot)) {
    const content = fs.readFileSync(skPath, 'utf-8');
    const fm = readFrontmatter(content);
    const code = fm.code;
    const name = fm.name || code;
    if (!code) { skipped.push(skPath); continue; }

    const description = fm.module ? `${fm.module} skill: ${name}` : name;
    const body = bodyAfterFrontmatter(content);
    const skillContent = renderWorkflowSkill({ code, name, description, body });
    if (dryRun) {
      written.push(`[dry-run] ${code}/SKILL.md`);
    } else {
      writeSkill(skillsDir, code, skillContent);
      written.push(`${code}/SKILL.md`);
    }
  }

  return { written, skipped };
}

module.exports = { render };
