---
epic_id: 04-onboarding-and-mid-flight-tools
status: done
owner: Tony Stark + Maria Hill
priority: 1
estimate: M
---

# Epic 04: Onboarding real + mid-flight correction tools

## Outcome

`wize-onboarding` deixa de ser stub e vira triagem real pós-install. Maria Hill ganha `wize-edit-prd` para manter PRD vivo. O PM e o orchestrator passam a ter `wize-correct-course` para reagir quando um sprint desvia.

## Stories

- E04-S01: Implementar `wize-onboarding` real (substituir stub)
- E04-S02: Criar `wize-correct-course` (PM + orchestrator)
- E04-S03: Criar `wize-edit-prd` (Maria Hill)

## Dependencies

- `.wize/config/project.toml` (já existe)
- `.wize/implementation/sprint-status.yaml` (já existe)
- Workflows `wize-help`, `wize-sprint-status`, `wize-sprint-planning`, `wize-create-prd` (já existem)

## Success

- `wize-onboarding` é callable via `/wize-onboarding` em IDEs suportados.
- `wize-correct-course` detecta sprint desviado e propõe ações (cortar scope, re-route, escalonar).
- `wize-edit-prd` atualiza PRD preservando histórico de mudanças.
- `npm test` permanece verde (≥ 222 testes).
- Adapters IDE regenerados para os 8 targets.
