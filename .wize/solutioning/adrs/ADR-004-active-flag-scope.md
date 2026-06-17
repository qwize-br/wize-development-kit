---
number: 004
title: Flag --active de exploit no escopo da skill/orquestradora
status: accepted
date: 2026-06-17
deciders: Tony Stark, Nick Fury
---

# ADR-004 — Flag `--active` no escopo da skill e da orquestradora

## Contexto
O NFR Security #1 (default passivo) e o PRD AC-E06-2 (exploit ativo só com flag) exigem que ferramentas ofensivas (sqlmap, ffuf e similares) só rodem com autorização explícita. A orquestradora `wize-sec-pentest` encadeia fases; a flag precisa propagar de forma clara e auditável.

## Decisão
- Flag única `--active`, opcional, no escopo da **orquestradora `wize-sec-pentest`** e de **cada skill de fase** individualmente.
- A orquestradora lê `--active` do seu argv e propaga para as skills de fase que invoca.
- Skills individuais aceitam `--active` no input (argv ou stdin JSON). Sem flag, rodam em modo **passivo** (apenas checagens read-only: nikto safe checks, nuclei passive templates, sqlmap sem `--dump`, ffuf com rate-limit agressivo).
- A flag é registrada no `partial_status` de cada fase (`mode: active|passive`), e no `report.md` final (header "Mode: active/passive").

## Consequências
- **Positivo:** decisão deliberadamente simples — não fragmenta o controle em uma matriz tool×target.
- **Positivo:** auditável — quem rodou, em que modo, está no relatório.
- **Positivo:** alinhado com "default passivo" — omitir a flag = seguro.
- **Negativo:** granularidade per-ferramenta fica para depois. Quando virar demanda, refatora-se com evidência (não agora).
- **Negativo:** `--active` propagado por argumento é manual; orquestradora precisa repassar. Mitigado por uma helper `invokePhase(skill, args)` na orquestradora que adiciona `--active` se o usuário passou.

## Alternativas consideradas
- **Flag per-ferramenta (`--active-sqlmap`, `--active-ffuf`):** rejeitada — explode a superfície de erro e dificulta o "default seguro" mental.
- **Variável de ambiente:** rejeitada — menos visível no log do harness; pior para auditoria.
- **Arquivo de config no projeto:** rejeitada — adiciona mais um artefato além do `scope.md`.
