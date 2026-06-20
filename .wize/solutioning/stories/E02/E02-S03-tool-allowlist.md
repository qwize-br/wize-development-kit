---
story_id: E02-S03
epic: 02-scope-gate
status: done
priority: 2
estimate: S
linked_acs: [AC-E02-2]
---

# Story: tool-allowlist.json

## Context
NFR Security #6 (menor privilégio para ferramentas) e a ADR-001 fixam que argumentos de `execFile` vêm de `data/tool-allowlist.json` filtrados — nunca da entrada do usuário direta. O arquivo é read-only e versionado no kit.

## Acceptance criteria
- **AC-E02-2 (reforço):** Toda invocação de ferramenta externa valida argumentos contra `tool-allowlist.json` antes de `execFile`. Argumento fora da allowlist é tratado como recusa (log + skip), não como execução.

## Out of scope
- Como cada skill usa o allowlist (S02-style helper) — coberto nas skills E04–E06.
- Detecção de presença da ferramenta (`command -v`) — `_shared/detect.js` em outro epic (E03-S03).

## Notes for Shuri
- Criar `src/security-overlay/data/tool-allowlist.json` com a estrutura:
  ```json
  {
    "nmap":   ["-sV", "-Pn", "-p-", "--open", "-T4"],
    "gitleaks": ["detect", "--no-banner", "-f", ".", "-r"],
    "osv-scanner": ["--json", "-r", "."],
    "grype":   ["dir:.", "-o", "json"],
    "nuclei":  ["-u", "-t", "-severity", "-passive", "-json"],
    "nikto":   ["-h", "-ask", "no", "-Tuning", "x6"],
    "sqlmap":  ["-u", "--batch", "--level=1", "--risk=1", "--threads=2", "--timeout=10"],
    "ffuf":    ["-u", "-w", "-mc", "-t", "-rate", "-recursion"]
  }
  ```
  Os valores acima são **placeholders iniciais**; a Shuri pode afinar flags ao implementar, mas o **formato** (mapa tool → array de strings) é o locked.
- Criar `src/security-overlay/_shared/allowlist.js` exportando `filterArgs(tool, args)` que retorna apenas os args de `args` que estão na allowlist; emite warning (e loga recusa) para args fora.
- Cada skill **só** chama `execFile(bin, filterArgs(tool, args))`.

## Notes for Hawkeye
- Testes em `test/security-overlay/allowlist.test.js`:
  - `filterArgs('nmap', ['-sV', '--script', 'vuln', '127.0.0.1'])` → `['-sV', '127.0.0.1']` (target livre, `--script` removido).
  - Tool desconhecida → lança `UnknownToolError`.
  - Args vazios → `[]`.
