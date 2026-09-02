#!/usr/bin/env node
// Verifica que o wize-eli5 é renderizado por TODOS os 10 adapters de harness.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const EXPECT = [
  { code: 'claude-code', file: '.claude/skills/wize-eli5/SKILL.md' },
  { code: 'antigravity', file: '.agent/skills/wize-eli5/SKILL.md' },
  { code: 'codex',       file: '.agents/skills/wize-eli5/SKILL.md' },
  { code: 'kimi-code',   file: '.kimi/skills/wize-eli5/SKILL.md' },
  { code: 'hermes',      file: '.hermes/skills/wize-eli5/SKILL.md' },
  { code: 'cursor',      file: '.cursor/rules/wize-eli5.mdc' },
  { code: 'windsurf',    file: '.windsurf/rules/wize-eli5.md' },
  { code: 'continue',   file: '.continue/prompts/wize-eli5.prompt' },
  { code: 'opencode',    file: '.opencode/commands/wize-eli5.md' },
  { code: 'generic',     file: '.wize/agents/wize-eli5.md' },
];

let ok = 0, fail = 0;
for (const a of EXPECT) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `wize-eli5-${a.code}-`));
  try {
    const mod = require(path.join(KIT, 'adapters', a.code, 'render.js'));
    mod.render(KIT, root, { profiles: ['core'] });
    const f = path.join(root, a.file);
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, 'utf-8');
      if (/ELI5/.test(content) && /Explain Like I Am 5/.test(content)) {
        console.log(`  ✓ ${a.code.padEnd(11)} -> ${a.file}`);
        ok++;
      } else {
        console.log(`  ✖ ${a.code}: arquivo existe mas sem conteúdo wize-eli5`);
        fail++;
      }
    } else {
      console.log(`  ✖ ${a.code}: ${a.file} NÃO foi gerado`);
      fail++;
    }
  } catch (e) {
    console.log(`  ✖ ${a.code}: erro ao renderizar — ${e.message}`);
    fail++;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
console.log(`\n${ok}/10 harnesses com wize-eli5.`);
process.exit(fail ? 1 : 0);
