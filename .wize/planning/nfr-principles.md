---
status: aligned
owner: Nick Fury
created: 2026-06-17
---

# NFR Principles — wize-dev-kit · `security-overlay` (AI Pentester)

## Why these numbers
Este é um **pacote file-first** que roda dentro do harness do usuário, executando ferramentas de pentest contra alvos declarados no `scope.md`. Não é um app web/mobile com deploy, então categorias clássicas como **uptime/LCP/CLS** não se aplicam. O que importa é o **envelope de segurança** (autorização, isolamento, auditabilidade, fail-safe), a **confiabilidade do artefato entregue** (relatório reproduzível e íntegro), a **manutenibilidade do overlay dentro do kit** (compatibilidade com `npm run validate` e os harnesses suportados) e a **acessibilidade do único artefato UI** — o `report.html` (reusando o playbook WCAG 2.2 AA do web-overlay). Custo = zero de infra; restringimos a zero-dependência npm nova para honrar "zero runtime próprio" e minimizar supply chain.

Os números abaixo são os pisos que Tony desenha contra e Hawkeye verifica. Qualquer relaxamento é cheiro — escala.

## Performance
| Tier | Alvo | Verifier |
|---|---|---|
| Non-negotiable | `npm run validate` verde em todos os harnesses-alvo; suite `node --test` (já existente) continua passando com os novos testes do overlay | CI do kit (`npm test && npm run validate`) |
| Non-negotiable | Tempo de invocação de skill de fase (medido do `Enter` do usuário até primeiro `recon.md`/equivalente) ≤ 5s p95 em laptop comum (não inclui execução da ferramenta de pentest) | script de smoke manual no E01 + watchdog opcional no E03 |
| Stretch | Render do `report.html` ≤ 200ms para relatório com até 200 findings em hardware modesto | teste de perf ad-hoc no E07 |
| Deferred | Cache de detecção de ferramentas entre invocações — *trigger:* tempo de `command -v` em cadeia > 1s no cold start |

## Security (categoria central do overlay)
| Tier | Item | Verifier |
|---|---|---|
| **Non-negotiable** | **Default passivo.** Nenhuma ferramenta ofensiva roda sem (a) alvo no `scope.md` E (b) flag explícita de ativo. Sem exceção. | Teste automatizado de recusa (`AC-E02-5`); Hawkeye gate `review` per-story |
| **Non-negotiable** | **Dados ficam na máquina.** Nenhuma chamada de rede de saída que não seja contra alvos do `scope.md`. Zero telemetria. | Inspeção do código (sem `fetch`/`http`/`https` para hosts fora da allowlist) + teste automatizado que intercepta DNS/HTTP |
| **Non-negotiable** | **Recusa sempre auditada.** Toda recusa (escopo ausente, alvo fora, flag ausente, `scope.md` inválido, ferramenta ausente) é registrada com timestamp + motivo. Nunca falha em silêncio. | Teste automatizado que verifica linhas de log/relatório |
| **Non-negotiable** | **Integridade do `scope.md`.** Hash SHA-256 da allowlist é conferido a cada fase. Edição posterior ao aceite invalida o pipeline até novo aceite. | Teste de tampering do `scope.md` no E02 |
| **Non-negotiable** | **Segredos no relatório.** Findings de secrets listam arquivo+linha; **valor do secret nunca aparece no `report.html`** (pode aparecer ofuscado no `.md` parcial). | Teste automatizado que varre o HTML em busca de padrão de secret |
| **Non-negotiable** | **Princípio do menor privilégio para ferramentas.** Cada ferramenta é invocada com o mínimo de flags e sem opções que ampliem superfície. Lista de flags por ferramenta vive em `data/tool-allowlist.json`. | Inspeção do `data/tool-allowlist.json` + revisão de code |
| **Non-negotiable** | **Zero dependência npm nova no overlay.** Scripts em Node built-ins apenas. | `package.json` do overlay não adiciona deps; auditoria manual no gate `risk` |
| Stretch | Assinatura criptográfica do `scope.md` (chave GPG) | trigger: demanda de "compartilhar relatório com terceiro" |
| Stretch | Sandbox de execução (Docker) para ferramentas DAST | trigger: houver pedido explícito de isolamento adicional |
| Deferred | SOC2/LGPD-cert do overlay como produto | — (não é produto vendido, é parte de outro kit) |

## Reliability (do artefato entregue)
| Tier | Alvo | Verifier |
|---|---|---|
| Non-negotiable | Pipeline é **idempotente** sobre o mesmo `scope.md` e mesmo `report.*` alvo: rerodar não duplica findings; rerun é detectável. | Teste de rerun no E07 |
| Non-negotiable | Falha de uma fase **não corrompe** artefatos de fases anteriores. Parciais já escritos são preservados; relatório final é gerado a partir do que existe, com `status: incomplete` explícito. | Teste de falha simulada (tool ausente ou erro de execução) |
| Non-negotiable | Relatório final é **reproduzível**: mesmo input + mesmo `scope.md` + mesmas ferramentas → mesmo output (up to timestamps normalizados). | Diff de dois runs no E07 |
| Stretch | Re-execução incremental: rerun só re-roda fases afetadas por mudança de `scope.md` | — |
| Deferred | Multi-target em um único run (lista de alvos no `scope.md`) | — |

## Maintainability
| Tier | Item | Verifier |
|---|---|---|
| Non-negotiable | Compatível com os harnesses-alvo declarados no `project.toml`; nenhuma skill `sec-*` é emitida se `security-overlay` não estiver ativo | `render-shared.js` filter test + `npm run validate` |
| Non-negotiable | Lint/formato (prettier) consistente com o resto do kit | CI |
| Non-negotiable | ADRs para decisões do overlay: assinatura do `scope.md`, formato do `render-report`, granularidade da flag. Vivem em `.wize/solutioning/adrs/` | Reviewer no PR |
| Non-negotiable | Cobertura de testes ≥ 80% nos módulos de lógica (gate, detecção, render) | `node --test` + relatório de cobertura ad-hoc |
| Stretch | < 5% arquivos > 300 LOC; complexidade ciclomática < 15/função | — |
| Deferred | Auto-doc generation | — |

## Accessibility
| Tier | Item | Verifier |
|---|---|---|
| Non-negotiable | `report.html` atende **WCAG 2.2 AA** (playbook `web-overlay/playbooks/wcag-aa.md`) | axe em CI rodando contra o HTML gerado no E07; revisão Mantis |
| Non-negotiable | `report.html` é semanticamente correto (playbook `semantic-html.md`) | Inspeção manual no E07 |
| Stretch | AAA nos fluxos críticos (resumo executivo do relatório) | — |
| Deferred | Auditoria screen-reader a cada release | trigger: houver usuário-chave dependente de leitor de tela |

## Cost
| Tier | Alvo | Verifier |
|---|---|---|
| Non-negotiable | **Custo de execução para o usuário = 0** de infra (roda local, sem cloud). Custo = tempo da máquina dele. | n/a |
| Non-negotiable | **Zero dependência npm nova** = sem custo de supply chain (security + manutenção) | `package.json` do overlay; auditoria no gate `risk` |
| Stretch | Tempo total do pipeline (todas as fases, sem rerun) ≤ 15min p95 em hardware comum | smoke test do E03 |
| Deferred | Cost-per-pipeline (estimativa em horas-máquina) | trigger: kit virar produto cobrado por uso |

## Constraints que dirigiram isto
- PRD goal G4 (segurança por padrão) → bloco inteiro de Security non-negotiable.
- Tech-vision non-negotiable #1 (default passivo) e #2 (dados locais) → Security non-negotiables 1 e 2.
- Tech-vision non-negotiable #3 (recusa auditada) → Security non-negotiable 3.
- Tech-vision non-negotiable #4 (zero dep npm) → Cost e Maintainability.
- Brief constraint (relatórios locais) → Reliability de não-corromper parciais.
- Report.html é a única "UI" → Accessibility usa playbook WCAG 2.2 AA já existente.

## Hand-off
> **Tony:** arquitetura deve respeitar Security items 1–4 e Maintainability items 1–3 desde o dia um. Em especial, o **gate de escopo precisa ser um único módulo** (não duplicado por skill) — facilita o teste de recusa e a auditoria.
> **Hawkeye:** gate `risk` once-after-architecture deve validar (a) zero-dep npm no overlay, (b) presença do teste de recusa do gate de escopo, (c) o `data/tool-allowlist.json` por ferramenta. Gate `nfr` per-epic deve checar o conjunto non-negotiable de Security e o `axe` sobre `report.html` no E07.
> **Hill:** scope já cabe dentro do orçamento de complexidade — nenhum PRD goal conflita com non-negotiables.
