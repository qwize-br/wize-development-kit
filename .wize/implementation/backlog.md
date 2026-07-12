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

## ✅ P3 — Polimento (Sprint 4)

| ID | Demanda | Onde fica | Status |
|---|---|---|---|
| ✅ P3-1 | Criar `wize-review-edge-case-hunter` separado | `src/core-skills/wize-review-edge-case-hunter/skill.md` | `status: ready` |
| ✅ P3-2 | Criar `wize-index-docs` | `src/core-skills/wize-index-docs/skill.md` | `status: ready` |
| ✅ P3-3 | Criar `wize-editorial-review-prose` e `wize-editorial-review-structure` | `src/core-skills/wize-editorial-review-*/skill.md` | `status: ready` |
| ✅ P3-4 | Criar `wize-customize` | `src/core-skills/wize-customize/skill.md` | `status: ready` |

## Próxima sprint sugerida

O ciclo P1–P3 do parity-com-BMAD foi drenado, mas o ciclo `security-overlay` e as
releases 0.7.x/0.8.0 deixaram itens em aberto (levantados no review de 2026-07-11).

### Ação da retrospectiva 2026-06-21 ainda em aberto

| ID | Demanda | Onde fica | Status |
|---|---|---|---|
| RETRO-1 | Teste de contrato real por ferramenta (smoke opt-in): roda o binário de verdade (skip se ausente) validando a sintaxe da CLI — pega quebra de versão sem run manual. | `test/tool-contract-*.test.js` (a criar) | ⬜ pendente — owner: Hawkeye + Shuri |

> RETRO-2 (centralizar `mergePartial`) e RETRO-3 (auto-sugestão de sprint pós-scan)
> foram entregues: `src/security-overlay/_shared/partial.js` (`writePartial`, usado por
> todos os scripts SAST/DAST) e `_shared/backlog.js` + CTA em `wize-sec-report`.

### Épico E09 — Melhor aproveitamento de components e intenção do usuário (novo)

Aberto pelo review de 2026-07-11 (`REVIEW-2026-07-11.md`). Stories em
`.wize/solutioning/epics/09-ux-intent.md`. Maior impacto: bug de descrição block-scalar
(`— |`) em todas as skills de persona; roteamento por intenção no Wizer/wize-help;
`--sign-scope` + criação guiada de escopo; `uninstall` que remove os adapters de fato;
skills de _ship_ (release/changelog); CI que roda testes em push/PR.

### Próximo epic dirigido por uso real

- Após um projeto real, rodar `/wize-investigate` em problemas observados.
- Coletar feedback dos agentes (qual skill pediu mais clarificações?).
- Adicionar demandas conforme necessário.
