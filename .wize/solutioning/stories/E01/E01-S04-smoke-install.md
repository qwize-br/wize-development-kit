---
story_id: E01-S04
epic: 01-packaging
status: ready-for-dev
priority: 1
estimate: M
linked_acs: [AC-E01-3]
---

# Story: Smoke install verde em ≥3 harnesses

## Context
Com `security-overlay` em `PROFILES` (S01), filtro aplicado (S02) e hint registrado (S03), o install precisa rodar limpo para os ≥3 harnesses declarados em `ide_targets`. Sem skills reais, o filtro `overlay: security` ainda funciona — mas precisamos de pelo menos 1 fixture para garantir o caminho de overlay.

## Acceptance criteria
- **AC-E01-3:** `npm run validate` passa sem erros para claude-code, cursor e codex com `security-overlay` em `profiles`.

## Out of scope
- Implementação real das skills (E03–E07).

## Notes for Shuri
- Criar fixture mínima: `src/security-overlay/skills/wize-sec-pentest/SKILL.md` com frontmatter `name: wize-sec-pentest` e `overlay: security` (e corpo placeholder). Marcar como fixture.
- Os validators existentes (`tools/installer/validators/run-all.js`) já iteram `ide_targets` — verificar se algum validador rejeita SKILL.md sem `commands` ou `scripts`; se rejeitar, a fixture precisa ter `scripts: []` no frontmatter.
- Após smoke, validar com `npm test && npm run validate`.

## Notes for Hawkeye
- 1 teste E2E (pode ser `node:test` + `child_process`): instala com `--profile security-overlay` em diretório temp, executa `npm run validate`, exit code 0, e `project.toml` tem `security-overlay` em `profiles`.
- Validar que o output do validator cita os 3 harnesses sem erro.
