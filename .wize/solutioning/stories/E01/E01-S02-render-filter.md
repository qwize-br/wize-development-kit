---
story_id: E01-S02
epic: 01-packaging
status: done
priority: 1
estimate: S
linked_acs: [AC-E01-2]
---

# Story: Filtro overlay: security em render-shared.js

## Context
`render-shared.js:79` filtra assets por frontmatter `overlay: web` e `overlay: app`. Falta tratar `overlay: security` para que skills `sec-*` só sejam emitidas quando o overlay estiver em `profiles`.

## Acceptance criteria
- **AC-E01-2:** Com `security-overlay` em `profiles`, todas as skills com frontmatter `overlay: security` (ou sem `overlay:` = core) são emitidas. Sem ele, nenhuma skill `sec-*` aparece.

## Out of scope
- Criar o diretório `src/security-overlay/` com as skills reais — coberto nos epics E03–E07.
- Smoke install de fato — S04 (depende de ter ao menos 1 skill fixture).

## Notes for Shuri
- Editar `tools/installer/render-shared.js` na função `collectAssets` (em torno da linha 79).
- Adicionar a linha `if (fm.overlay === 'security' && !profSet.has('security-overlay')) continue;` ao lado das outras duas.
- Para validar localmente, criar fixture temporária `src/security-overlay/skills/wize-sec-stub/SKILL.md` com frontmatter `overlay: security`, rodar `npm run validate`, depois remover a fixture.

## Notes for Hawkeye
- 1 teste unitário em `test/render-shared.test.js`: dado assets com frontmatters mistos e `profiles=['core', 'security-overlay']`, o output contém o asset `security` e não contém o `app` (a menos que também esteja em profiles).
- Espelhar o pattern do teste existente para `web-overlay`/`app-overlay`.
