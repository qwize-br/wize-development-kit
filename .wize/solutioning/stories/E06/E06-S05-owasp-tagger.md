---
story_id: E06-S05
epic: 06-dast
status: ready-for-dev
priority: 1
estimate: S
linked_acs: [AC-E06-3]
---

# Story: owasp-top10.json + tagger

## Context
Brief (success criterion #3): ≥6 categorias OWASP Top 10 cobertas. PRD AC-E06-3: tagger por finding. ADR (decisão de arquitetura): tabela estática em `data/owasp-top10.json`, zero-dep.

## Acceptance criteria
- **AC-E06-3:** Para cada finding gerado por E06-S01..S04, `tagOwasp(finding)` adiciona `owasp: 'A03:2021'` (ou similar) baseado em regras simples por matcher (rule id, classe CVE, padrão no PoC).

## Out of scope
- As tools DAST em si — S01–S04.
- Cálculo CVSS — `_shared/cvss.js` (outra história em E07).

## Notes for Shuri
- Criar `src/security-overlay/data/owasp-top10.json` com a lista canônica (2021):
  ```json
  [
    {"id": "A01:2021", "name": "Broken Access Control"},
    {"id": "A02:2021", "name": "Cryptographic Failures"},
    {"id": "A03:2021", "name": "Injection"},
    {"id": "A04:2021", "name": "Insecure Design"},
    {"id": "A05:2021", "name": "Security Misconfiguration"},
    {"id": "A06:2021", "name": "Vulnerable and Outdated Components"},
    {"id": "A07:2021", "name": "Identification and Authentication Failures"},
    {"id": "A08:2021", "name": "Software and Data Integrity Failures"},
    {"id": "A09:2021", "name": "Security Logging and Monitoring Failures"},
    {"id": "A10:2021", "name": "Server-Side Request Forgery (SSRF)"}
  ]
  ```
- Criar `src/security-overlay/_shared/owasp.js` exportando:
  - `tagOwasp(finding)` → `string` (id OWASP ou `'UNKNOWN'`).
  - `listOwaspCategories()` → array de objetos.
- Regras iniciais (heurísticas, podem evoluir):
  - `rule` contém `sqli|sql-injection|injection` → A03.
  - `rule` contém `xss` → A03.
  - `rule` contém `auth|bypass|session` → A07.
  - `rule` contém `tls|cert|cipher|ssl` → A02.
  - `rule` contém `cors|csp|header` → A05.
  - `cve` presente (deps) → A06.
  - `rule` contém `ssrf|redirect` → A10.
  - Default: A05 (security misconfiguration) — conservador.

## Notes for Hawkeye
- Testes em `test/security-overlay/owasp-tagger.test.js`:
  - `{rule: 'sqli-error'}` → `A03:2021`.
  - `{cve: 'CVE-...'}` → `A06:2021`.
  - Sem matcher → `UNKNOWN`.
  - `listOwaspCategories()` retorna 10 itens.