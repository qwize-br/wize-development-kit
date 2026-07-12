---
epic_id: 05-sast
status: done
owner: Tony Stark + Maria Hill
linked_prd: E05
priority: 5
estimate: M
---

# Epic 05: SAST (secrets + deps vulneráveis)

## Outcome
A skill `wize-sec-recon` também roda gitleaks (secrets) e osv-scanner/grype (deps) sobre o repositório do projeto, gerando `.wize/security/sast.md` com findings. Secrets listam arquivo+linha; valor do secret **nunca** aparece no HTML. Ferramenta ausente = degrada a checagem. (PRD goals G2 + G3; AC-E05-1 a AC-E05-3.)

## Stories
- **E05-S01** — `scripts/run-gitleaks.js` (secrets; redaction forçada)
- **E05-S02** — `scripts/run-osv.js` (deps via osv-scanner; fallback grype)

## Dependencies
- E02 (gate) e E03-S03 (detect) e E04-S03 (helper de parcial).
- Roda dentro de `wize-sec-recon` (decisão de arquitetura: agrupar varreduras sem app vivo no mesmo skill).

## Success
- `gitleaks detect --no-banner -f . -r` → JSON parseado; secrets viram findings com `file`, `line`, `rule`, `redacted_value: '***REDACTED***'`.
- `osv-scanner --json -r .` → lista deps com CVE + severity.
- Sem gitleaks: `sast.md` registra `degraded_checks: [secrets]`.
