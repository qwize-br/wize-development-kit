---
story_id: E07-S04
epic: 07-report
status: done
priority: 2
estimate: S
linked_acs: [AC-E07-5]
---

# Story: axe em CI sobre report.html

## Context
NFR Accessibility #1: WCAG 2.2 AA + axe em CI. Decisão de arquitetura: axe é chamado contra um `report.html` de smoke. Sem deps adicionadas ao kit.

## Acceptance criteria
- **AC-E07-5:** Em CI, gerar `report.html` de smoke (parciais fictícios) e rodar axe. Zero violações bloqueantes.

## Out of scope
- Implementação real do axe em CI — depende de decisão de infra do kit (já flagged como "important gap" no architecture.md).

## Notes for Shuri
- Criar `test/security-overlay/axe-smoke.test.js` que:
  1. Gera parciais fictícios mínimos em diretório temp.
  2. Roda `render-report.js` (E07-S02+S03) — gera `report.html`.
  3. Invoca `axe-core` via CLI (se disponível em PATH) ou via `npx --no-install @axe-core/cli` em CI. **Não adicionar axe como dep.**
  4. Falha se axe reportar `violations.filter(v => v.impact === 'critical' || v.impact === 'serious')` não-vazio.
- Documentar no `test/security-overlay/README.md` como rodar localmente.

## Notes for Hawkeye
- 1 teste: `axe-smoke.test.js` — gera parciais mock, roda render, axe zero violações.
- Se axe não estiver disponível no CI: marcar como `@skip` com mensagem clara; isso vira follow-up da decisão de infra do kit.