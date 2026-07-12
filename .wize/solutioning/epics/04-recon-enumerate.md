---
epic_id: 04-recon-enumerate
status: done
owner: Tony Stark + Maria Hill
linked_prd: E04
priority: 4
estimate: M
---

# Epic 04: Recon & enumeração

## Outcome
Skills `wize-sec-recon` e `wize-sec-enumerate` rodam contra o alvo do `scope.md`, geram parciais `.wize/security/recon.md` e `.wize/security/enumerate.md` com formato padronizado, e degradam graciosamente se nmap estiver ausente. (PRD goal G2; AC-E04-1 a AC-E04-3.)

## Stories
- **E04-S01** — Skill `wize-sec-recon` com `scripts/run-nmap.js`
- **E04-S02** — Skill `wize-sec-enumerate` com `scripts/run-enumerate.js`
- **E04-S03** — Helper de escrita de parciais (frontmatter padronizado)

## Dependencies
- E02 (gate) e E03-S03 (detect) e E03-S04 (invoke) prontos.
- S03 antes de S01/S02.

## Success
- `wize-sec-recon` sozinho (sem orquestradora) roda nmap via `run-nmap.js`, escreve `recon.md` com portas/serviços.
- `wize-sec-enumerate` referencia o recon, escreve `enumerate.md`.
- Sem nmap: relatório parcial com `partial_status: incomplete`, sem abortar pipeline.
