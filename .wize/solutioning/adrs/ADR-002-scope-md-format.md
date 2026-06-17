---
number: 002
title: Formato do scope.md — YAML frontmatter + Markdown body
status: accepted
date: 2026-06-17
deciders: Tony Stark, Nick Fury
---

# ADR-002 — Formato do scope.md

## Contexto
O `scope.md` é o gate de escopo do overlay. O tech-vision decidiu o frontmatter (accepted_by, accepted_at, scope_sha256); faltava o formato do corpo que carrega a allowlist, a URL do alvo DAST e (eventualmente) anotações.

## Decisão
**YAML frontmatter + Markdown body.** Estrutura:

```markdown
---
accepted_by: <string>
accepted_at: <ISO-8601>
scope_sha256: <hex>           # SHA-256 do body abaixo
---

## allowlist
# hosts (FQDN ou IP), URLs (com path), e paths permitidos para ferramentas
hosts:
  - localhost
  - 127.0.0.1
  - staging.example.internal
urls:
  - https://staging.example.internal/api/
paths:
  - /api
  - /admin

## dast_target
# URL única do app rodando a ser alvo do DAST
url: http://localhost:3000

## notes
# Texto livre do usuário (contexto, justificativa, etc.)
Este é o ambiente de staging do projeto Qwize, isolado do público.
```

O `scope_sha256` é calculado sobre o **body** (sem o frontmatter) e verificado pelo `_shared/scope-gate.js`. Edição posterior ao aceite altera o hash → gate recusa até novo aceite.

## Consequências
- **Positivo:** editável à mão, sem ferramenta externa; o usuário consegue ler e revisar.
- **Positivo:** frontmatter separado torna trivial parsear com Node built-ins.
- **Positivo:** o `scope_sha256` provê integridade (não autenticação) — alinhado com a decisão do tech-vision.
- **Negativo:** usuário precisa lembrar de atualizar o hash após editar. Mitigado por um comando `wize-sec-pentest --sign-scope` (no shell da orquestradora) que recalcula e regrava.
- **Negativo:** texto livre em `notes` pode conter PII. Aceito (fica local; relatório é local; LGPD não é afetado).

## Alternativas consideradas
- **Pure YAML:** rejeitada — pouco amigável para leitura humana, especialmente `notes`.
- **JSON:** rejeitada — quebra o "editável à mão" e exige escape de aspas em notes.
