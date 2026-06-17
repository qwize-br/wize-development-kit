---
number: 001
title: Gate de escopo como módulo único compartilhado
status: accepted
date: 2026-06-17
deciders: Tony Stark, Nick Fury
---

# ADR-001 — Gate de escopo como módulo único compartilhado

## Contexto
Todas as skills ofensivas do overlay (`wize-sec-recon`, `wize-sec-enumerate`, `wize-sec-exploit`) precisam verificar se um alvo está dentro do `scope.md` antes de qualquer disparo. O NFR Security non-negotiable #3 (recusa sempre auditada) e o AC-E02-5 (teste automatizado de recusa) exigem um ponto único de aplicação do gate.

## Decisão
Criar `src/security-overlay/_shared/scope-gate.js` exportando `loadScope(path)` e `assertTargetInScope(scope, target)`. Skills importam via `require()` relativo. O `assertTargetInScope` é a **única** função que decide se uma operação ofensiva prossegue; emite recusa (timestamp + target + motivo) antes de retornar `false`.

## Consequências
- **Positivo:** teste de recusa (AC-E02-5) escrito uma vez, vale para todas as skills. Atualização do gate (ex.: novo formato de `scope.md`) é feita num só lugar.
- **Positivo:** auditoria por recusa fica centralizada — `.refusals.log` é gravado por esse módulo.
- **Negativo:** acoplamento implícito — qualquer skill nova precisa saber chamar o gate. Mitigado pelo pattern enforcement (`All AI agents MUST` na seção de padrões da arquitetura).
- **Trade-off aceito:** `require()` relativo entre skills é mais simples que um sub-skill ou um CLI intermediário, mas exige que as skills vivam dentro do mesmo overlay (o que já é o caso).

## Alternativas consideradas
- **Cópia por skill:** rejeitada — duplica o teste de recusa e dificulta update.
- **Sub-skill invocada via Bash:** rejeitada — adiciona runtime de orquestração e quebra o "file-first" do overlay.
