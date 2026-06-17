---
story_id: E01-S03
epic: 01-packaging
status: ready-for-dev
priority: 2
estimate: S
linked_acs: [AC-E01-5]
---

# Story: Hint de onboarding para security-overlay

## Context
`tools/installer/onboarding.js:27-28` adiciona hints para `web-overlay` e `app-overlay`. Falta o hint para `security-overlay` seguindo o mesmo formato.

## Acceptance criteria
- **AC-E01-5:** Com `security-overlay` em `profiles`, a saída de `onboarding.js` inclui `→ /wize-sec-pentest (overlay)`.

## Out of scope
- A skill `wize-sec-pentest` em si — E03.
- Os demais hints — já existem.

## Notes for Shuri
- Editar `tools/installer/onboarding.js:27-28` para adicionar:
  ```js
  if (profiles.find(p => p.code === 'security-overlay')) lines.push('  → /wize-sec-pentest         (overlay)');
  ```
- A label `wize-sec-pentest` é o slug da orquestradora (E03-S02).

## Notes for Hawkeye
- 1 teste unitário: dado profile `security-overlay`, a saída inclui o hint.
