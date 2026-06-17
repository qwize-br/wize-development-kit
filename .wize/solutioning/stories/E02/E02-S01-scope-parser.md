---
story_id: E02-S01
epic: 02-scope-gate
status: done
priority: 1
estimate: M
linked_acs: [AC-E02-1, AC-E02-3]
---

# Story: Parser & validador de scope.md

## Context
ADR-002 fixa o formato (YAML frontmatter + MD body, com `scope_sha256`). `tools/installer` já é Node 20+ CJS. O parser precisa ser robusto a edições maliciosas (frontmatter malformado, hash errado, body vazio) e retornar erro claro em cada caso.

## Acceptance criteria
- **AC-E02-1:** Dado ausência de `.wize/security/scope.md`, qualquer skill `sec-*` que invoca `loadScope()` aborta com mensagem `scope.md ausente — crie e assine em .wize/security/scope.md`.
- **AC-E02-3:** Dado `scope.md` sem `accepted_by`/`accepted_at`/`scope_sha256` válidos, `loadScope()` aborta com mensagem identificando o campo faltante.

## Out of scope
- A função `assertTargetInScope` em si — S02.
- Allowlist de flags por ferramenta — E02-S03.

## Notes for Shuri
- Criar `src/security-overlay/_shared/scope-parser.js` exportando:
  - `parseScope(mdText)` → `{ frontmatter: {accepted_by, accepted_at, scope_sha256}, body }` ou lança erro tipado.
  - `validateScope(scope, opts={})` → lança `ScopeError` com `.code` (`MISSING_FIELDS`|`HASH_MISMATCH`|`MISSING_FILE`) ou retorna `true`.
  - `computeScopeSha256(bodyText)` → `string` (hex).
- Usar Node built-ins: `node:fs`, `node:path`, `node:crypto`. **Sem libs externas.**
- Frontmatter split: split por `^---\n` no início do arquivo.
- Hash esperado: SHA-256 do body **sem** o frontmatter, em hex minúsculo.
- Tratar `scope.md` ausente como `MISSING_FILE` (não `MISSING_FIELDS`).
- Mensagens de erro devem incluir o path absoluto e instrução de como corrigir (gerar hash via `wize-sec-pentest --sign-scope` ou comando equivalente).

## Notes for Hawkeye
- Testes (em `test/security-overlay/scope-parser.test.js`):
  - happy path: scope.md válido → retorna scope estruturado.
  - missing file → `ScopeError.code === 'MISSING_FILE'`.
  - missing frontmatter field → `MISSING_FIELDS` com `field` específico.
  - body alterado (hash não bate) → `HASH_MISMATCH`.
- Edge case: scope.md com frontmatter válido mas `accepted_at` no futuro → apenas warning, não erro.
