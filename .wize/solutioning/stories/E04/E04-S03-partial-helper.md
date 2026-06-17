---
story_id: E04-S03
epic: 04-recon-enumerate
status: done
priority: 1
estimate: S
linked_acs: [AC-E04-1, AC-E04-3]
---

# Story: Helper de escrita de parciais

## Context
`render-report` (E07) consome parciais de todas as fases em formato uniforme. ADR (decisão de arquitetura): parciais em `.wize/security/<fase>.md` com frontmatter YAML padronizado + seções MD. Esse helper garante consistência entre skills.

## Acceptance criteria
- **AC-E04-1 / AC-E04-3 (reforço):** `writePartial({ phase, scope, status, sections })` grava `<fase>.md` com frontmatter YAML válido + seções MD na ordem.

## Out of scope
- Render do relatório final — E07.
- Schema JSON do frontmatter — `_shared/partial-schema.json` (artefato, coberto pelo helper).

## Notes for Shuri
- Criar `src/security-overlay/_shared/partial.js` exportando:
  - `writePartial({ phase, scope, status, sections, refusals = [], tools = {} })` → escreve `.wize/security/<phase>.md`.
  - `loadPartial(phase)` → parseia o `<phase>.md` de volta (frontmatter + seções).
  - `listPartials()` → lista parciais existentes.
- Frontmatter (YAML canônico):
  ```yaml
  ---
  phase: recon
  generated_at: 2026-06-17T13:45:00Z
  scope_sha256: <do scope>
  mode: passive  # ou 'active'
  partial_status: complete | incomplete | skipped
  tools:
    nmap: { present: true, version: "7.94" }
  ---
  ```
- Seções MD: estrutura flexível (objeto `{ heading: '...', content: '...' }`); helper converte para `## heading\n\ncontent`.

## Notes for Hawkeye
- Testes em `test/security-overlay/partial.test.js`:
  - `writePartial` cria diretório se não existir.
  - Frontmatter YAML é parseável (usar `js-yaml`? — **não**, sem deps; implementar parser mínimo de YAML só para os campos do helper, ou exigir inputs já como string).
  - `loadPartial` round-trip: write → load → campos batem.
