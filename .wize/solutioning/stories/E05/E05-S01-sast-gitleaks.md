---
story_id: E05-S01
epic: 05-sast
status: ready-for-dev
priority: 1
estimate: M
linked_acs: [AC-E05-1, AC-E05-3]
---

# Story: SAST secrets (gitleaks) com redação

## Context
PRD AC-E05-1: secrets listam arquivo+linha, sem vazar valor no HTML. NFR Security #5: ofuscação obrigatória. Decisão de arquitetura: rodar dentro da skill `wize-sec-recon` (varredura sem app vivo).

## Acceptance criteria
- **AC-E05-1:** `gitleaks` roda no repo do projeto, gera findings em `sast.md` com `file`, `line`, `rule`, e `redacted_value: '***REDACTED***'`. O valor real do secret **nunca** aparece em nenhum arquivo gerado.
- **AC-E05-3:** Gitleaks ausente → `sast.md` tem `degraded_checks: [secrets]`. Pipeline não aborta.

## Out of scope
- SAST de deps — E05-S02.
- Render do relatório (ofuscação redundante lá) — E07 (mas aqui já vai redacted).

## Notes for Shuri
- Criar `src/security-overlay/skills/wize-sec-recon/scripts/run-gitleaks.js`.
- Lógica:
  1. `detectTools(['gitleaks'])`.
  2. Ausente: escrever/atualizar `sast.md` com `degraded_checks: [secrets]`. Exit 0.
  3. Presente: `filterArgs('gitleaks', ['detect', '--no-banner', '-f', '.', '-r', 'gitleaks-report.json'])` + `execFile`. Timeout 5min.
  4. Parsear `gitleaks-report.json` (array de findings).
  5. Para cada finding: extrair `File`, `StartLine`, `RuleID`, `Match` (o valor real — **NÃO escrever no MD**). Escrever `redacted_value: '***REDACTED***'`.
  6. Anexar à seção "## secrets" do `sast.md` (criar/atualizar).
- Garantir que `gitleaks-report.json` (com valores reais) **não** seja commitado: gitignore recomendado + `.wize/security/` já está fora do repo por design.

## Notes for Hawkeye
- Testes em `test/security-overlay/run-gitleaks.test.js`:
  - Mocka gitleaks com finding contendo match `'AKIA...REAL...'`. Verifica que o MD gerado contém `***REDACTED***` e **não** contém `'AKIA...REAL...'`.
  - Gitleaks ausente: MD com `degraded_checks: [secrets]`, exit 0.
  - Verifica que `gitleaks-report.json` é criado em `.wize/security/` mas **não** no `src/`.