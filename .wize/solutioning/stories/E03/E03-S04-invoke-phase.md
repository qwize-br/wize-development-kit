---
story_id: E03-S04
epic: 03-persona-orchestrator
status: ready-for-dev
priority: 1
estimate: S
linked_acs: [AC-E03-2, AC-E03-3]
---

# Story: invokePhase helper

## Context
A orquestradora (S02) precisa de uma forma de invocar skills de fase sem acoplamento. Subprocess com `node` no path resolve: cada skill vira um comando invocável. ADR-001 fixa que o gate é o único ponto de decisão; helper é o único ponto de invocação.

## Acceptance criteria
- **AC-E03-2 / E03-3 (reforço):** `invokePhase(skill, args)` spawna subprocess Node, captura exit code e stderr, propaga `--active` se setado. Falha de subprocess = exceção capturada, **não** derruba a orquestradora (caller decide pular).

## Out of scope
- A skill que chama o helper — S02.
- Paralelismo entre fases — fora do escopo (sequencial é o contrato do pipeline).

## Notes for Shuri
- Criar `src/security-overlay/_shared/invoke-phase.js` exportando:
  - `invokePhase(skill, { active, extraArgs })` → `Promise<{ ok: bool, code: number, stdout: string, stderr: string }>`. `skill` é o nome (`'wize-sec-recon'`).
  - Constrói o caminho: `src/security-overlay/skills/<skill>/scripts/<script-do-frontmatter>.js` (lê o `commands[0]` do SKILL.md — ou convenção: o script é `<skill>.js` dentro de `scripts/`).
  - Usa `child_process.spawn` com `node` + args. `stdio: 'pipe'`. Sem `shell: true`.
  - Timeout: 5min por fase (configurável via `extraArgs.timeout`).
  - Retorna `{ok: false, code}` em exit ≠ 0; **não** lança.

## Notes for Hawkeye
- Testes em `test/security-overlay/invoke-phase.test.js`:
  - Mockar `child_process.spawn`; verificar que `node` é chamado com o caminho certo do script.
  - Exit 0 → `{ok: true, code: 0}`.
  - Exit 1 → `{ok: false, code: 1}`, **sem** throw.
  - `--active` presente em `extraArgs` é incluído no argv do subprocess.
