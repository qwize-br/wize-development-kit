---
story_id: E02-S02
epic: 02-scope-gate
status: done
priority: 1
estimate: M
linked_acs: [AC-E02-2, AC-E02-3, AC-E02-4]
---

# Story: assertTargetInScope + recusa auditada

## Context
ADR-001 fixa o módulo `scope-gate.js` como **única** função que decide se uma operação ofensiva prossegue. NFR Security #3 (recusa sempre auditada) exige log de toda recusa. NFR Security #1 (default passivo) é garantido por a orquestradora/skills só rodarem `execFile` após `assertTargetInScope` retornar `true`.

## Acceptance criteria
- **AC-E02-2:** Dado alvo (host/URL/path) fora da allowlist do `scope.md`, `assertTargetInScope(scope, target)` retorna `false` e registra recusa (timestamp + target + motivo) em `.wize/security/.refusals.log` **sem** executar a ferramenta.
- **AC-E02-3:** Coberto indiretamente: `assertTargetInScope` chama `validateScope` internamente, então scope inválido aborta antes da verificação de alvo.
- **AC-E02-4:** Toda skill `sec-*` chama `assertTargetInScope` antes de `execFile`; sem `--active` no input, mesmo alvo dentro do escopo só roda checagens passivas (gate não bloqueia passivo; o bloqueio de ativo é da skill/orquestradora — ver ADR-004 e S05-orquestradora).

## Out of scope
- Allowlist de flags por ferramenta — E02-S03.
- Teste automatizado de recusa ponta-a-ponta — E02-S04 (depende deste).

## Notes for Shuri
- Criar `src/security-overlay/_shared/scope-gate.js` exportando:
  - `loadScope(scopePath)` → chama `parseScope` + `validateScope`; em erro, escreve recusa e relança (a skill decide se aborta).
  - `assertTargetInScope(scope, target, { active })` → `boolean`. Recebe `target` como `{ host?, url?, path? }`; verifica contra `scope.body.allowlist` (hosts, urls, paths). Lógica de matching: host exato, URL prefix match, path prefix match.
  - `logRefusal(scope, target, reason)` → escreve linha YAML (`timestamp: ..., target: ..., reason: ...`) em `.wize/security/.refusals.log` (cria o diretório se não existir).
- Comportamento: em caso de recusa, **NÃO** levantar exceção — retornar `false` e logar. Em caso de erro de validação, levantar `ScopeError` (a skill aborta).
- Formato do `.refusals.log`: YAML lines (uma entrada por linha, cada campo precedido por `  `), legível por humanos.

## Notes for Hawkeye
- Testes em `test/security-overlay/scope-gate.test.js`:
  - host dentro da allowlist → `true`, sem recusa logada.
  - host fora → `false`, recusa logada com `reason: 'host not in allowlist'`.
  - URL com path dentro → `true`.
  - URL com path fora → `false`.
  - scope inválido → lança `ScopeError`, `.refusals.log` contém entrada `code: 'INVALID_SCOPE'`.
  - Verificar que `assertTargetInScope` **não** chama `execFile` (mock).
