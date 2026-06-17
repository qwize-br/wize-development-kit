---
story_id: E02-S04
epic: 02-scope-gate
status: done
priority: 1
estimate: S
linked_acs: [AC-E02-5]
---

# Story: Teste de recusa ponta-a-ponta

## Context
AC-E02-5 exige um teste automatizado que confirme a recusa quando alvo fora de escopo é solicitado. Esse teste é a **rede de segurança** que valida os non-negotiables de Security (NFR) em CI.

## Acceptance criteria
- **AC-E02-5:** Teste automatizado que, dado `scope.md` com allowlist vazia, invoca `assertTargetInScope(scope, { host: 'evil.example.com' })` e confirma: retorno `false`, entrada em `.refusals.log` com `reason: 'host not in allowlist'`, **e** nenhuma chamada a `execFile` (mock).

## Out of scope
- Os componentes do gate — S01/S02/S03 já entregues.

## Notes for Shuri
- Adicionar a `test/security-overlay/scope-refusal.test.js`.
- Usar `node:test` (já é o pattern do kit).
- Mockar `child_process.execFile` para garantir que **nunca** é chamado.
- Cobrir 3 cenários no mesmo arquivo:
  1. Host fora → recusa + log.
  2. URL com path fora → recusa + log.
  3. Scope inválido → `ScopeError` + log `INVALID_SCOPE`.
- Cada cenário é um `test()` separado.

## Notes for Hawkeye
- Este é o teste que o **gate `risk` once-after-architecture** (definido em `.wize/config/tea.toml`) deve validar como presente.
- Asserts devem ser precisos: timestamp formato ISO-8601, motivo exato, sem string matching fuzzy.
