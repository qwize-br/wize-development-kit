---
story_id: E03-S03
epic: 03-persona-orchestrator
status: done
priority: 1
estimate: S
linked_acs: [AC-E04-2, AC-E05-3, AC-E06-4]
---

# Story: detect.js — detecção de ferramentas com cache

## Context
PRD AC-E04-2, E05-3, E06-4: ferramenta ausente = reporta no parcial e pula só aquela checagem, **pipeline continua**. NFR Performance: `command -v` chamado uma vez por tool, cacheado em `.wize/security/.tools.json` para evitar N+1.

## Acceptance criteria
- **AC-E04-2 / E05-3 / E06-4 (compartilhados):** `detectTools(['nmap', 'gitleaks', ...])` retorna `{ name: { present: bool, path?: string, version?: string } }`. Ferramenta ausente = `present: false` (não erro). Pipeline continua.

## Out of scope
- Auto-instalação — explicitamente fora (NFR Security, brief).
- Allowlist de flags — E02-S03.

## Notes for Shuri
- Criar `src/security-overlay/_shared/detect.js` exportando:
  - `detectTools(names)` → objeto com `present`, `path?`, `version?` por tool. Lê `.wize/security/.tools.json` se existir; se faltarem tools novas no cache, executa `command -v <name>` para cada e atualiza o cache.
  - `clearToolCache()` → para testes.
- Versão: tentar `<bin> --version` (com timeout curto, ex. 2000ms). Se falhar, `version: null`.
- Cache: JSON simples, não-atomic, escrito uma vez no fim de `detectTools`. Sem lock — o overlay roda single-threaded por invocação.
- Path do cache: `.wize/security/.tools.json` (criar diretório se necessário).

## Notes for Hawkeye
- Testes em `test/security-overlay/detect.test.js`:
  - `detectTools(['node', 'this-tool-does-not-exist-xyz'])` → node `present: true`, xyz `present: false`.
  - Segunda chamada não executa `command -v` (mock; verificar que foi chamado 1x).
  - Cache escrito em `.wize/security/.tools.json` no formato esperado.
