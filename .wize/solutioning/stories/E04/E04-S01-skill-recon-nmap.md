---
story_id: E04-S01
epic: 04-recon-enumerate
status: ready-for-dev
priority: 1
estimate: M
linked_acs: [AC-E04-1, AC-E04-2]
---

# Story: Skill wize-sec-recon (nmap)

## Context
Skill standalone (AC-E03-3): invocável sozinha. Chama gate (E02), detect (E03-S03), helper de parcial (E04-S03). Nmap é a primeira varredura da fase de recon.

## Acceptance criteria
- **AC-E04-1:** `wize-sec-recon` rodando contra alvo na allowlist executa nmap em modo passivo (sem flag `--script`, sem `-A`) e grava `.wize/security/recon.md` com frontmatter (scope_sha256, tools, partial_status) + seção "## open_ports" listando portas/serviços.
- **AC-E04-2:** Nmap ausente → `recon.md` tem `partial_status: incomplete`, com seção "## degraded_checks" listando o que faltou. Pipeline não aborta.

## Out of scope
- SAST (gitleaks, osv) — coberto em E05 (mas **compartilha** o skill `wize-sec-recon` na decisão de arquitetura; aqui é só a parte nmap).
- Enumeração de superfície — E04-S02.

## Notes for Shuri
- Criar `src/security-overlay/skills/wize-sec-recon/SKILL.md` com frontmatter `name`, `overlay: security`, `commands: [run-recon.js]`.
- `scripts/run-recon.js`:
  1. Parse argv (`--active`, `--target=<host>` opcional; default = `scope.body.dast_target.url` parseado).
  2. `loadScope` (gate); em erro, abort.
  3. `detectTools(['nmap'])`.
  4. Se nmap ausente: `writePartial({ phase: 'recon', status: 'incomplete', sections: { degraded_checks: 'nmap ausente' } })`; exit 0.
  5. `assertTargetInScope(scope, target)`; recusa logada se fora.
  6. `filterArgs('nmap', ['-sV', '-Pn', '-p-', '--open', '-T4', target])` + `execFile` com timeout 60s.
  7. Parseia stdout (XML ou greppable); extrai portas/serviços.
  8. `writePartial({ phase: 'recon', status: 'complete', sections: { open_ports: ... } })`.
- **Default é passivo**: sem `--active`, `-sV` é omitido (só `-sn` ou `-Pn` simples).

## Notes for Hawkeye
- Testes em `test/security-overlay/wize-sec-recon.test.js`:
  - Mocka `child_process.execFile`; verifica que `nmap` é chamado com `filterArgs` aplicado.
  - Nmap ausente: parcial gerado com `partial_status: incomplete`.
  - Target fora do scope: parcial gerado com `degraded_checks` mencionando a recusa; nmap **não** é chamado.
  - Exit 0 mesmo com nmap ausente.
