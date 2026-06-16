# Backlog — wize-dev-kit

> Demandas pendentes de implementação no ciclo ágil Wize, priorizadas após comparação com BMAD Method v6.8.0.

## Legenda

- **P1** = bloqueia o ciclo canônico ou a experiência de primeiro uso.
- **P2** = melhora a operação do dia a dia.
- **P3** = refinamento / cobertura de casos edge.

## P1 — Ciclo básico ou onboarding

| ID | Demanda | Onde fica | Porque |
|---|---|---|---|
| P1-1 | Implementar `wize-onboarding` real | `src/orchestrator-skills/wize-onboarding/workflow.md` | Hoje é `status: stub` (28 linhas). É a primeira interação pós-install; precisa triar brownfield, perfis, objetivo e rotear. |
| P1-2 | Criar `wize-correct-course` | `src/method-skills/4-implementation/wize-correct-course/workflow.md` | Não existe. Quando sprint desvia, não há workflow formal para cortar scope ou re-route. |
| P1-3 | Criar `wize-edit-prd` | `src/method-skills/2-plan-workflows/wize-edit-prd/workflow.md` | Só existe `wize-create-prd` e `wize-validate-prd`. PRD vive mudando; precisa de edição sem reescrever. |

## P2 — Operacional

| ID | Demanda | Onde fica | Porque |
|---|---|---|---|
| P2-1 | Criar `wize-project-context` | `src/method-skills/3-solutioning/wize-project-context/workflow.md` | Consolida brief+prd+ux+architecture+decisions em `.wize/knowledge/project-context.md` para agentes carregarem contexto de uma só fonte. |
| P2-2 | Criar `wize-checkpoint-preview` | `src/method-skills/4-implementation/wize-checkpoint-preview/workflow.md` | Para stories M/L, pausar no meio e validar direção antes de continuar. |
| P2-3 | Criar `wize-investigate` | `src/method-skills/4-implementation/wize-investigate/workflow.md` | Debug/RCA: falhas de teste, regressões, comportamentos inesperados. |
| P2-4 | Criar `wize-qa-generate-e2e-tests` | `src/tea-skills/wize-qa-generate-e2e-tests/workflow.md` | Hawkeye gera casos de teste E2E completos a partir de ux-design. |

## P3 — Polimento

| ID | Demanda | Onde fica | Porque |
|---|---|---|---|
| P3-1 | Criar `wize-review-edge-case-hunter` separado | `src/core-skills/wize-review-edge-case-hunter/skill.md` | Hoje `wize-code-review` menciona a camada, mas não é skill callable. |
| P3-2 | Criar `wize-index-docs` | `src/core-skills/wize-index-docs/skill.md` | Manter índice canônico de todo `.wize/` conforme artefatos são criados. |
| P3-3 | Criar `wize-editorial-review-prose` e `wize-editorial-review-structure` | `src/core-skills/wize-editorial-review-*/skill.md` | Peggy atua como tech-writer transversal, mas não tem skills callable. |
| P3-4 | Criar `wize-customize` | `src/core-skills/wize-customize/skill.md` | Guiar o usuário a fazer overrides em `.wize/custom/` sem fork. |

## Próxima sprint sugerida

- **P1-1** (`wize-onboarding` real) + **P1-3** (`wize-edit-prd`) + **P2-1** (`wize-project-context`).
- Essas três desbloqueiam o ciclo canônico e reduzem o esforço de contexto para todos os outros agentes.
