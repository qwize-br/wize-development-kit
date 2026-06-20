---
epic_id: 01-packaging
status: ready
owner: Tony Stark + Maria Hill
linked_prd: E01
priority: 1
estimate: M
---

# Epic 01: Empacotamento do security-overlay

## Outcome
`security-overlay` aparece no instalador, renderiza para ≥3 harnesses com `npm run validate` verde, e grava `profiles=[..., "security-overlay"]` no `project.toml` com disclaimer de uso autorizado. (PRD goals G1 + G2-G3 setup; AC-E01-1 a AC-E01-5.)

## Stories
- **E01-S01** — Adicionar `security-overlay` a `PROFILES` em `wize-cli.js` (AC-E01-1, AC-E01-4)
- **E01-S02** — Filtrar skills por frontmatter `overlay: security` em `render-shared.js` (AC-E01-2)
- **E01-S03** — Hint de onboarding para o overlay (AC-E01-5)
- **E01-S04** — Smoke install verde em claude-code/cursor/codex (AC-E01-3)

## Dependencies
- E01-S01 antes dos demais (PROFILES é a entrada).
- S02 depende de pelo menos 1 skill placeholder com frontmatter `overlay: security` existir — criado em S01 ou stub em S02.
- S04 depende de S01+S02+S03.

## Success
- `npm run validate` verde em claude-code, cursor, codex.
- Skill `sec-*` não é emitida se `security-overlay` não estiver em `profiles`.
- Disclaimer de uso autorizado aparece no fim do install.
- `project.toml` tem `profiles=[..., "security-overlay"]`.
