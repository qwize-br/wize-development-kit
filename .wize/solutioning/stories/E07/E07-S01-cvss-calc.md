---
story_id: E07-S01
epic: 07-report
status: ready-for-dev
priority: 1
estimate: M
linked_acs: [AC-E07-4]
---

# Story: cvss.js — cálculo CVSS v3.1

## Context
Brief: "score CVSS v3.1 + tag OWASP por finding". ADR-003 (zero-dep): implementar a álgebra em Node built-ins. A fórmula oficial CVSS v3.1 é determinística — recebe um vetor (AV/AC/PR/UI/S/C/I/A), retorna score 0.0–10.0 + severidade.

## Acceptance criteria
- **AC-E07-4 (reforço):** `cvss.compute('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')` retorna `{ score: 9.8, severity: 'Critical' }`.

## Out of scope
- CVSS v2/v4 — fora do escopo v1.
- Lookup de CVE — fora do escopo; score vem do finding.

## Notes for Shuri
- Criar `src/security-overlay/_shared/cvss.js` exportando:
  - `compute(vector)` → `{ score, severity }`.
  - `severityFromScore(score)` → `'None'|'Low'|'Medium'|'High'|'Critical'`.
- Implementar a álgebra canônica do CVSS v3.1 (~80 linhas). Documentação oficial: FIRST.org. **Sem dependência da lib `cvss` no npm.**
- Casos de teste embutidos no `cvss.test.js` (exemplos oficiais do FIRST).

## Notes for Hawkeye
- Testes em `test/security-overlay/cvss.test.js`:
  - 5 vetores canônicos com score conhecido (do spec oficial):
    - `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` → 9.8 Critical
    - `AV:L/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N` → 1.8 Low
    - `AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N` → 6.5 Medium
    - `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` → 8.1 High
    - `AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:N/A:N` → 0.0 None
  - Vetor inválido → lança `InvalidVectorError`.