---
story_id: E01-S01
epic: 01-packaging
status: ready-for-dev
priority: 1
estimate: S
linked_acs: [AC-E01-1, AC-E01-4]
---

# Story: Entrada security-overlay em PROFILES + disclaimer

## Context
A constante `PROFILES` em `tools/installer/wize-cli.js:43` é a fonte canônica dos perfis do instalador. Hoje lista `core` (obrigatório), `web-overlay` e `app-overlay`. O `security-overlay` precisa entrar como opcional, com o mesmo formato.

## Acceptance criteria
- **AC-E01-1:** `security-overlay` aparece como opção **não obrigatória** em `PROFILES` com `code: 'security-overlay'`, `label: 'Wize Security (AI Pentester overlay)'`, `required: false`.
- **AC-E01-4:** Ao concluir o install com o overlay selecionado, exibe disclaimer de uso autorizado (texto em pt-BR) e grava `profiles=[..., "security-overlay"]` no `project.toml`.

## Out of scope
- Filtragem por frontmatter (`overlay: security`) — S02.
- Hint de onboarding — S03.

## Notes for Shuri
- Editar `tools/installer/wize-cli.js:43-46` (acrescentar após `app-overlay`).
- Texto do disclaimer: `Uso autorizado. Você é responsável por obter permissão antes de testar alvos que não são seus. O kit detecta alvos fora do scope.md e recusa automaticamente; ainda assim, use com responsabilidade.`
- Função que grava `project.toml`: `projectToml()` em `tools/installer/wize-cli.js:351` — já trata `profiles` como array; só passar o novo item.

## Notes for Hawkeye
- 1 teste unitário: `PROFILES.includes(profile com code 'security-overlay')`.
- 1 teste de integração do CLI: instalar com seleção e verificar `project.toml` resultante contém o overlay.
