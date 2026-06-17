---
epic_id: 03-persona-orchestrator
status: ready
owner: Tony Stark + Maria Hill
linked_prd: E03
priority: 3
estimate: M
---

# Epic 03: Persona red-teamer & orquestradora wize-sec-pentest

## Outcome
Existe um agente `red-teamer` no roster do overlay. A skill `wize-sec-pentest` encadeia recon→enumerate→exploit→report em sequência, com o gate de escopo verificado em cada fase. Cada skill de fase roda sozinha. Hawkeye/TEA pode revisar antes do gate. (PRD goal G2; AC-E03-1 a AC-E03-4.)

## Stories
- **E03-S01** — Persona `red-teamer` (agent.yaml + persona.md)
- **E03-S02** — Skill orquestradora `wize-sec-pentest` (encadeia fases; propaga `--active`)
- **E03-S03** — `_shared/detect.js` (detecção de ferramentas com cache de sessão)
- **E03-S04** — Helper `invokePhase(skill, args)` na orquestradora

## Dependencies
- S03 (detect) é base para S02 (orquestradora usa detect para reportar degradações).
- S01 antes de S02 (a orquestradora é uma skill; precisa de frontmatter `overlay: security` + `name` consistente com a persona).
- S04 depende de S02.
- E04–E07 dependem de S03 (detect) e S04 (invokePhase).

## Success
- `agents/red-teamer/agent.yaml` + `persona.md` registrados.
- `wize-sec-pentest` chama `wize-sec-recon` → `wize-sec-enumerate` → `wize-sec-exploit` → `wize-sec-report` em ordem; pula fase com `partial_status: skipped` se a anterior falhar.
- `command -v` chamado 1x por tool, cacheado em `.wize/security/.tools.json`.
