---
epic_id: 06-dast
status: ready
owner: Tony Stark + Maria Hill
linked_prd: E06
priority: 6
estimate: L
---

# Epic 06: DAST (nuclei + nikto + sqlmap + ffuf)

## Outcome
A skill `wize-sec-exploit` roda ferramentas DAST contra o alvo do `scope.md`, gera `.wize/security/dast.md` com findings cobrindo ≥6 categorias OWASP Top 10. Default é passivo; ferramentas ativas (sqlmap, ffuf) só com `--active`. Ferramenta ausente = degrada a checagem. (PRD goals G2 + G3; AC-E06-1 a AC-E06-4.)

## Stories
- **E06-S01** — Skill `wize-sec-exploit` + `run-nuclei.js` (passive default)
- **E06-S02** — `run-nikto.js` (passive safe checks)
- **E06-S03** — `run-sqlmap.js` (gated por `--active`)
- **E06-S04** — `run-ffuf.js` (gated por `--active`)
- **E06-S05** — Helper `data/owasp-top10.json` + tagger de findings

## Dependencies
- E02 (gate), E03 (orquestradora), E03-S03 (detect), E04-S03 (helper de parcial), E05 (achados SAST alimentam contexto).
- S01–S04 são sequenciais (skills standalone, mas integradas na orquestradora).
- S05 antes de S01 (tagger é usado em todos).

## Success
- `wize-sec-exploit` produz `dast.md` com findings taggeados com OWASP Top 10.
- ≥6 categorias OWASP cobertas quando todas as tools presentes.
- Sem `--active`: nuclei + nikto rodam (passive), sqlmap/ffuf **não**.
- Tool ausente: degrada, não aborta.