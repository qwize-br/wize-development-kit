---
story_id: E05-S02
epic: 05-sast
status: ready-for-dev
priority: 1
estimate: M
linked_acs: [AC-E05-2, AC-E05-3]
---

# Story: SAST deps (osv-scanner / grype)

## Context
PRD AC-E05-2: deps vulneráveis listadas com CVE + severidade. Toolkit decide: `osv-scanner` primário, `grype` fallback (decisão do brief).

## Acceptance criteria
- **AC-E05-2:** Manifesto de deps do projeto (auto-detect: `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc.) é varrido; findings em `sast.md` com `package`, `version`, `cve`, `severity`, `cvss`.
- **AC-E05-3:** Osv-scanner ausente E grype ausente → `degraded_checks: [deps]`. Pipeline não aborta. Um dos dois ausente → fallback para o outro.

## Out of scope
- SAST de secrets — E05-S01.
- SBOM completo — fora do escopo v1.

## Notes for Shuri
- Criar `src/security-overlay/skills/wize-sec-recon/scripts/run-osv.js`.
- Lógica:
  1. `detectTools(['osv-scanner', 'grype'])`.
  2. Ambos ausentes: `degraded_checks: [deps]`. Exit 0.
  3. Apenas osv-scanner: usar osv-scanner. Apenas grype: usar grype. Ambos: preferir osv-scanner.
  4. `filterArgs` aplicado; `execFile` com timeout 5min.
  5. Auto-detectar manifestos: ler `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `composer.json`, `Gemfile`. Passar diretório raiz como `-r`.
  6. Parsear JSON de saída; para cada vulnerabilidade, extrair `package`, `installed_version`, `cve`, `severity`, `cvss_score`.
  7. Anexar à seção "## deps" do `sast.md`.

## Notes for Hawkeye
- Testes em `test/security-overlay/run-osv.test.js`:
  - Mocka osv-scanner com JSON de saída exemplo. Verifica que `sast.md` contém `package: lodash`, `cve: CVE-...`, `cvss: 7.5`.
  - Manifestos vazios → `degraded_checks: [deps-no-manifest]`.
  - Sem tools: `degraded_checks: [deps]`.