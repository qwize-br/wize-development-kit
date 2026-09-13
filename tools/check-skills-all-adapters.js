#!/usr/bin/env node
// Verifica que as skills core novas (wize-subtract, wize-debt) — e a wize-eli5 —
// são renderizadas por TODOS os 11 adapters de harness.
//
// Uso:
//   node tools/check-skills-all-adapters.js            # valida a lista padrão
//   node tools/check-skills-all-adapters.js wize-grill # valida skills específicas
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');

// Skill code -> { dir, marker } — `dir` é o diretório esperado dentro de cada
// adapter e `marker` a string que precisa aparecer no arquivo renderizado.
const SKILLS = {
  'wize-subtract': { dir: 'wize-subtract', marker: 'Subtraction Hunter' },
  'wize-debt':     { dir: 'wize-debt',     marker: 'wize-debt:' },
  'wize-eli5':     { dir: 'wize-eli5',     marker: 'Explain Like I Am 5' },
};

// Onde cada harness deposita uma skill `wize-{code}`.
const ADAPTERS = [
  { code: 'claude-code', path: (c) => `.claude/skills/${c}/SKILL.md` },
  { code: 'antigravity', path: (c) => `.agent/skills/${c}/SKILL.md` },
  { code: 'codex',       path: (c) => `.agents/skills/${c}/SKILL.md` },
  { code: 'kimi-code',   path: (c) => `.kimi/skills/${c}/SKILL.md` },
  { code: 'hermes',      path: (c) => `.hermes/skills/${c}/SKILL.md` },
  { code: 'kiro',        path: (c) => `.kiro/skills/${c}/SKILL.md` },
  { code: 'cursor',      path: (c) => `.cursor/rules/${c}.mdc` },
  { code: 'windsurf',    path: (c) => `.windsurf/rules/${c}.md` },
  { code: 'continue',    path: (c) => `.continue/prompts/${c}.prompt` },
  { code: 'opencode',    path: (c) => `.opencode/commands/${c}.md` },
  { code: 'generic',     path: (c) => `.wize/agents/${c}.md` },
];

const requested = process.argv.slice(2);
const targets = requested.length ? requested : Object.keys(SKILLS);
for (const code of targets) {
  if (!SKILLS[code]) {
    console.error(`Skill desconhecida: ${code}. Conhecidas: ${Object.keys(SKILLS).join(', ')}`);
    process.exit(2);
  }
}

let ok = 0, fail = 0;

for (const skill of targets) {
  const { marker } = SKILLS[skill];
  console.log(`\n${skill} (marcador: "${marker}")`);

  for (const a of ADAPTERS) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `wize-${skill}-${a.code}-`));
    try {
      const mod = require(path.join(KIT, 'adapters', a.code, 'render.js'));
      mod.render(KIT, root, { profiles: ['core'] });
      const rel = a.path(skill);
      const f = path.join(root, rel);
      if (!fs.existsSync(f)) {
        console.log(`  ✖ ${a.code.padEnd(11)} -> ${rel} NÃO foi gerado`);
        fail++;
        continue;
      }
      const content = fs.readFileSync(f, 'utf-8');
      // O corpo da skill é o que precisa estar lá; o código `wize-{skill}` só
      // aparece no frontmatter, que não é copiado por todos os adapters
      // (cursor/windsurf/opencode/generic não carregam o code no arquivo).
      if (content.includes(marker)) {
        console.log(`  ✓ ${a.code.padEnd(11)} -> ${rel}`);
        ok++;
      } else {
        console.log(`  ✖ ${a.code}: ${rel} existe mas não contém o corpo esperado ("${marker}")`);
        fail++;
      }
    } catch (e) {
      console.log(`  ✖ ${a.code}: erro ao renderizar — ${e.message}`);
      fail++;
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}

const total = targets.length * ADAPTERS.length;
console.log(`\n${ok}/${total} renderizações OK (${targets.length} skill(s) × ${ADAPTERS.length} harnesses).`);
process.exit(fail ? 1 : 0);
