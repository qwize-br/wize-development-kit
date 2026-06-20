---
story_id: E07-S02
epic: 07-report
status: done
priority: 1
estimate: M
linked_acs: [AC-E07-1, AC-E07-2, AC-E07-4, AC-E07-6]
---

# Story: render-report.js — consolida MD

## Context
`render-report` consome os parciais (`recon.md`, `enumerate.md`, `sast.md`, `dast.md`) e gera `report.md`. Decisão de arquitetura: idempotente, sem corromper parciais anteriores.

## Acceptance criteria
- **AC-E07-1:** Cada fase tem parcial em `.wize/security/<phase>.md` ao concluir.
- **AC-E07-2:** `wize-sec-report` consolida `.wize/security/report.md` ao final.
- **AC-E07-4 (MD):** Cada finding em `report.md` tem `cvss` (calculado por E07-S01), `owasp`, `severity`, `poc`, `evidence`.
- **AC-E07-6:** Relatório fica em `.wize/security/` (local); nenhum upload para serviço externo.

## Out of scope
- Render HTML — E07-S03.
- axe em CI — E07-S04.

## Notes for Shuri
- Criar `src/security-overlay/skills/wize-sec-report/SKILL.md` + `scripts/render-report.js`.
- Lógica:
  1. `listPartials()` (helper E04-S03) — lê todos os parciais.
  2. Para cada parcial: parsear frontmatter (status, mode, scope_sha256, tools) + seções.
  3. Coletar todos os findings (extraídos das seções dos parciais).
  4. Para cada finding com `vector` CVSS: chamar `cvss.compute(vector)`.
  5. Para cada finding: `tagOwasp` (E06-S05) caso ainda não tenha.
  6. **Ofuscação redundante**: se `finding.value` contém padrão de secret (regex conservadora), substituir por `***REDACTED***` mesmo que já esteja (defesa em profundidade).
  7. Renderizar `.wize/security/report.md` com:
     - Header (project, scope_sha256, mode, generated_at)
     - Sumário executivo (contagem por severidade, contagem por categoria OWASP)
     - Seções por fase (com referência ao parcial)
     - Seção de findings (ordenados por CVSS desc, com badges em texto)
     - Seção de degradações (tools ausentes)
     - Anexo: recusas (de `.refusals.log`)

## Notes for Hawkeye
- Testes em `test/security-overlay/render-report-md.test.js`:
  - Idempotência: rodar 2x sobre os mesmos parciais → diff vazio (timestamps normalizados).
  - Ofuscação: parciais com secret `AKIA...REAL...` → report.md contém `***REDACTED***` apenas.
  - Findings ordenados por CVSS desc.
  - Parcial ausente → seção "## <fase>" com `status: missing`, sem abortar.