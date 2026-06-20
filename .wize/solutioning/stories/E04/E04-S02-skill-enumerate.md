---
story_id: E04-S02
epic: 04-recon-enumerate
status: done
priority: 2
estimate: M
linked_acs: [AC-E04-3]
---

# Story: Skill wize-sec-enumerate

## Context
Segunda fase: enumera superfície (endpoints visíveis, tech stack inferido) a partir do recon. Tools: `nuclei` em modo passive templates (já é default no allowlist) e/ou curl + grep manual para HTTP probing. **Não confundir com DAST** (E06) — aqui é só enumeração.

## Acceptance criteria
- **AC-E04-3:** `wize-sec-enumerate` roda contra alvo na allowlist, enumera superfície (endpoints via probing HTTP, tech via `Server`/`X-Powered-By`), grava `.wize/security/enumerate.md` com seção "## surface" (lista de endpoints) e "## tech" (tech inferida). Faz referência ao `recon.md` no frontmatter (`depends_on: [recon]`).

## Out of scope
- DAST (vulnerabilidades ativas) — E06.
- Recon (portas/serviços) — E04-S01.

## Notes for Shuri
- Criar `src/security-overlay/skills/wize-sec-enumerate/SKILL.md` + `scripts/run-enumerate.js`.
- Lógica:
  1. `loadScope` + `detectTools(['nuclei', 'curl'])`.
  2. Carrega `recon.md` (helper de E04-S03); se ausente, marca `partial_status: incomplete` e segue com o que tem.
  3. Para cada porta HTTP/S do recon: probing com `curl -sI` (sem auth) — captura `Server`, `Set-Cookie`, status.
  4. Opcional: nuclei com templates passive (`-passive`) para identificar tech.
  5. Sem tools: degradar (registra o que faltou) e usar só `node:http` puro.
- `depends_on: [recon]` no frontmatter indica pro `render-report` ordenar.

## Notes for Hawkeye
- Testes em `test/security-overlay/wize-sec-enumerate.test.js`:
  - Mocka `curl`/`nuclei`; verifica formato do parcial.
  - Sem recon anterior: marca `depends_on: [recon]`, `partial_status: incomplete`, mas gera seção "## surface" com o que foi possível.
  - `assertTargetInScope` chamado antes de qualquer probing HTTP.
