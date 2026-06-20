---
epic_id: 07-report
status: ready
owner: Tony Stark + Maria Hill
linked_prd: E07
priority: 7
estimate: M
---

# Epic 07: Relatório consolidado (MD + HTML)

## Outcome
A skill `wize-sec-report` consolida os parciais em `.wize/security/report.md` + `.wize/security/report.html` (single-file self-contained, sem rede, CSS inline, badges CVSS/OWASP coloridos, axe-friendly). Ofuscação redundante de secrets no HTML. Idempotente sobre os parciais existentes. (PRD goal G5; AC-E07-1 a AC-E07-6.)

## Stories
- **E07-S01** — `_shared/cvss.js` (cálculo do score v3.1 a partir do vetor)
- **E07-S02** — Skill `wize-sec-report` + `scripts/render-report.js` (MD final)
- **E07-S03** — Render do HTML (template single-file, CSS inline)
- **E07-S04** — Teste axe em CI rodando contra `report.html` de smoke

## Dependencies
- E07-S01 antes de S03 (badge CVSS usa o score).
- E04-S03 (partial helper) usado para ler parciais.
- E05/E06 alimentam parciais.
- S04 depende de S03.

## Success
- `report.md` lista todos os findings com `cvss`, `owasp`, `severity`, `poc`, `evidence`.
- `report.html` abre sem rede em qualquer browser moderno.
- axe em CI não reporta violações bloqueantes.
- Secrets permanecem redacted no HTML.
- Rerun é idempotente (diff = vazio).
