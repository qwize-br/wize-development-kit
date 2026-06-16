# Backlog — wize-dev-kit

> Demandas pendentes de implementação no ciclo ágil Wize, priorizadas após comparação com BMAD Method v6.8.0.

## Legenda

- **P1** = bloqueia o ciclo canônico ou a experiência de primeiro uso.
- **P2** = melhora a operação do dia a dia.
- **P3** = refinamento / cobertura de casos edge.
- ✅ = implementado no kit.

## ✅ P1 — Ciclo básico ou onboarding (Sprint 2)

| ID | Demanda | Onde fica | Status |
|---|---|---|---|
| ✅ P1-1 | Implementar `wize-onboarding` real | `src/orchestrator-skills/wize-onboarding/workflow.md` | `status: ready` |
| ✅ P1-2 | Criar `wize-correct-course` | `src/method-skills/4-implementation/wize-correct-course/workflow.md` | `status: ready` |
| ✅ P1-3 | Criar `wize-edit-prd` | `src/method-skills/2-plan-workflows/wize-edit-prd/workflow.md` | `status: ready` |

## ✅ P2 — Operacional (Sprint 3)

| ID | Demanda | Onde fica | Status |
|---|---|---|---|
| ✅ P2-1 | Criar `wize-project-context` | `src/method-skills/3-solutioning/wize-project-context/workflow.md` | `status: ready` |
| ✅ P2-2 | Criar `wize-checkpoint-preview` | `src/method-skills/4-implementation/wize-checkpoint-preview/workflow.md` | `status: ready` |
| ✅ P2-3 | Criar `wize-investigate` | `src/method-skills/4-implementation/wize-investigate/workflow.md` | `status: ready` |
| ✅ P2-4 | Criar `wize-qa-generate-e2e-tests` | `src/tea-skills/wize-qa-generate-e2e-tests/workflow.md` | `status: ready` |

## P3 — Polimento

| ID | Demanda | Onde fica | Porque |
|---|---|---|---|
| P3-1 | Criar `wize-review-edge-case-hunter` separado | `src/core-skills/wize-review-edge-case-hunter/skill.md` | Hoje `wize-code-review` menciona a camada, mas não é skill callable. |
| P3-2 | Criar `wize-index-docs` | `src/core-skills/wize-index-docs/skill.md` | Manter índice canônico de todo `.wize/` conforme artefatos são criados. |
| P3-3 | Criar `wize-editorial-review-prose` e `wize-editorial-review-structure` | `src/core-skills/wize-editorial-review-*/skill.md` | Peggy atua como tech-writer transversal, mas não tem skills callable. |
| P3-4 | Criar `wize-customize` | `src/core-skills/wize-customize/skill.md` | Guiar o usuário a fazer overrides em `.wize/custom/` sem fork. |

## Próxima sprint sugerida

- **P3-1** (`wize-review-edge-case-hunter`) + **P3-2** (`wize-index-docs`).
- P3-3 e P3-4 podem entrar juntos em uma sprint só.
- Última fronteira: cobertura de Peggy como tech-writer + skill de customize.
