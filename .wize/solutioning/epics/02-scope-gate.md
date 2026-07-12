---
epic_id: 02-scope-gate
status: done
owner: Tony Stark + Maria Hill
linked_prd: E02
priority: 2
estimate: M
---

# Epic 02: Gate de escopo & autorização

## Outcome
O usuário declara o escopo em `.wize/security/scope.md` (YAML frontmatter + MD body, com `accepted_by`/`accepted_at`/`scope_sha256`). Skills `sec-*` abortam se o `scope.md` estiver ausente/inválido, e recusam alvos fora da allowlist. Default é passivo; exploit ativo só com flag `--active`. (PRD goals G4; AC-E02-1 a AC-E02-5.)

## Stories
- **E02-S01** — Parser & validador do `scope.md` (frontmatter + body; hash SHA-256)
- **E02-S02** — `assertTargetInScope` + módulo `scope-gate.js` + recusa auditada
- **E02-S03** — `data/tool-allowlist.json` (mapa tool → flags permitidas)
- **E02-S04** — Teste automatizado de recusa (cobre AC-E02-5)

## Dependencies
- S01 antes de S02 (parser é fundação do gate).
- S02 antes de S04 (gate precisa existir pra ser testado).
- S03 pode ser paralelo a S02.
- Tudo aqui é pré-requisito dos epics E03–E06.

## Success
- Skill que tenta agir sobre alvo fora de `scope.md` aborta e loga recusa.
- `scope.md` editado após `accepted_at` falha em `assertScopeValid` até re-assinatura.
- Teste cobre recusa e validação de hash.
