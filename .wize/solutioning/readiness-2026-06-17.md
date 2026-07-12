---
status: ready
date: 2026-06-17
chair: Tony Stark
signoffs:
  - Maria Hill (PM)
  - Hawkeye (TEA)
  - Mantis (UX) — async, n/a
  - Fury (Strategy) — async
---

# Implementation Readiness — wize-dev-kit · `security-overlay` (AI Pentester)

## Result: Ready

## Checklist

### Planning artifacts
- [x] PRD `status: validated` (validation log anexado em 2026-06-17).
- [x] All open questions in PRD resolved (no `blocker` open).
- [x] Trigger map covers every PRD goal — **N/A por decisão de Fase 1** (overlay técnico, personas claras no brief; desvio documentado e validado por Pepper).

### UX
- [x] Every In-scope item has at least one screen spec — **N/A**: única "UI" é `report.html` (E07). Coberto por playbooks `semantic-html` + `wcag-aa` (E07-S03, AC-E07-5).
- [x] UX design index maps every screen → scenario → AC — **N/A** (mesma razão).
- [x] Design system tokens + components needed by the UX exist — **N/A** (template estático, sem design system).

### Strategy
- [x] Tech vision `status: aligned` (2026-06-17).
- [x] NFR principles `status: aligned` (2026-06-17); verifiers named for every non-negotiable (7 Security + 3 Reliability + 4 Maintainability + 2 Accessibility + 2 Cost + 1 Performance, cada um com tool+cadência).

### Architecture
- [x] Architecture doc `status: ready-for-stories` (8 steps completos, 2026-06-17).
- [x] ADRs cover every meaningful trade-off — 4 ADRs aceitos (gate, scope.md format, render-report, --active flag).
- [x] NFR check section answers *how* for each non-negotiable — `_shared/scope-gate.js`, `_shared/detect.js`, `data/tool-allowlist.json`, `_shared/cvss.js`, axe em CI.

### Stories
- [x] Every epic has 3–10 stories — E01=4, E02=4, E03=4, E04=3, E05=2, E06=5, E07=4. **E05 com 2 stories** está abaixo do guideline (3) mas cobre 100% do AC set do epic sem sobreposição; tolerado.
- [x] Every story has AC IDs from the PRD; the union per epic equals the epic's AC set — **cobertura 30/30 ACs, sem gap, sem overlap** (verificado por diff).
- [x] No story is XL.
- [x] Each story names touch-points + `testid` + reuse of design-system components — **parcial**: touch-points nomeados em "Notes for Shuri"; `testid` mencionado onde aplicável (skills invocam subprocess, não UI). Design-system não se aplica (template HTML estático).

### TEA
- [x] `tea-risk.md` exists em `.wize/implementation/tea/risk-profile.md` (3.4K).
- [x] `.wize/config/tea.toml` policy is committed (`mode = "advisory"`).
- [ ] First-story `tea-design.md` is drafted — **gap, não-bloqueante**: `tea-design.md` deve ser gerado pelo `wize-tea-design` na primeira story do loop. Política atual = advisory, então não bloqueia readiness.

### Cross-cutting
- [x] CI runs tests + validators on every PR — `npm test && npm run validate` já no kit.
- [x] Lint/format on commit — prettier já configurado no kit.
- [ ] Branch protection on `main` — **N/A, escopo de repo externo, fora deste overlay**.
- [x] Secrets vault wired; no secret in repo — NFR Security #5 (redaction) garante.

## Notes
- 7 epics / 26 stories at readiness time (E08 preflight + its story added later → 8 epics / 27 stories on disk today) (atualizado após limpeza de arquivos de outros overlays que estavam no diretório `solutioning`).
- TEA policy: advisory; gates `risk` once-after-architecture, `review`/`gate` per-story, `nfr` per-epic.
- 4 ADRs aceitos (gate-shared, scope.md format, render-report zero-dep, --active flag).
- Branch: `feature/security-overlay` (commits não vão à main; merge via PR — política global do user).
- Sequência de implementação recomendada: E01→E02→E03→E04→E05→E06→E07, respeitando dependências intra-epic.

## Open items (carry forward, not blockers)
- **First-story `tea-design.md`:** gerado pelo Hawkeye na primeira iteração do loop. Política advisory permite; não bloqueia.
- **axe-core em CI:** dependência externa de infra (npm + binário); testes de smoke (`E07-S04`) marcados `@skip` enquanto indisponível. Não bloqueia.
- **Sandbox de execução (Docker) para DAST:** NFR Security stretch; trigger = pedido explícito. Não bloqueia.
- **Auth criptográfica do `scope.md` (chave GPG):** NFR Security stretch; trigger = demanda de compartilhamento de relatório com terceiro. Não bloqueia.

## Hand-off

> Implementation readiness signed off. Maria Hill — kick `wize-sprint-planning` (ou ir direto para `/wize-dev-story` em loop, conforme decisão do usuário). Hawkeye — gate cadence: design per story, trace + review + gate per story, NFR per epic.
