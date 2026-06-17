---
story_id: E03-S02
epic: 03-persona-orchestrator
status: ready-for-dev
priority: 1
estimate: M
linked_acs: [AC-E03-2, AC-E03-3]
---

# Story: Skill orquestradora wize-sec-pentest

## Context
A orquestradora é uma skill que **encadeia** as fases e propaga `--active`. ADR-004 fixa que `--active` é por skill/orquestradora; orquestradora lê do argv e propaga. NFR Reliability #2: falha de uma fase não corrompe a anterior; fases puladas devem ser marcadas com `partial_status: skipped`.

## Acceptance criteria
- **AC-E03-2:** Invocar `wize-sec-pentest` invoca `wize-sec-recon` → `wize-sec-enumerate` → `wize-sec-exploit` → `wize-sec-report` em ordem; cada fase respeita o gate (chama `loadScope` antes).
- **AC-E03-3:** Cada skill de fase é invocável **sozinha** (não depende da orquestradora). Isso é garantido pelo design (skills standalone, orquestradora só chama via helper — ver S04).

## Out of scope
- Helper de invocação — S04.
- Skills de fase em si — E04–E07.
- Detect de tools — S03.

## Notes for Shuri
- Criar `src/security-overlay/skills/wize-sec-pentest/SKILL.md` com frontmatter `name: wize-sec-pentest`, `overlay: security`, e `commands: [run-pipeline.js]`.
- Criar `src/security-overlay/skills/wize-sec-pentest/scripts/run-pipeline.js` que:
  1. Parseia argv (procura `--active`).
  2. Carrega scope (`loadScope`).
  3. Para cada fase (`recon`, `enumerate`, `exploit`, `report`), chama helper (S04).
  4. Em caso de erro de fase: loga, marca `partial_status: skipped` no relatório final, **continua** com a próxima fase.
  5. Retorna exit code 0 se ao menos 1 fase rodou; 1 se todas falharam.
- **Não** importar scripts de fase; usar S04 (`invokePhase`) que spawna subprocess (`child_process.fork` ou `execFile` com `node`).

## Notes for Hawkeye
- Testes em `test/security-overlay/orchestrator.test.js`:
  - Mocka `invokePhase`; verifica ordem de chamada (recon → enumerate → exploit → report).
  - Falha de `recon` (mock lança) → `enumerate`, `exploit`, `report` ainda são chamados.
  - `--active` propagado para todas as invocações.
