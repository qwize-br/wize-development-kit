# Changelog

All notable changes to **wize-dev-kit** are documented here.
Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.1] — 2026-05-31

### Changed

- `README.md`: `Install` section now appears right after the badges (was buried in the middle).
- `ROSTER.md`: rewritten entirely in English; Wizer's motto no longer references a personal name — now reads "I know the qwize methodology, I know the project — I activate the right agent."
- Installer: now asks **two** language questions separately (BMAD parity):
  - **Communication language** — how agents talk to you in chat.
  - **Document output language** — language used in generated files (`brief.md`, `prd.md`, `architecture.md`, gates, etc.).
  - Both stored under `[language]` in `.wize/config/project.toml`.
  - Includes a curated catalog of common BCP-47 codes (en, pt-BR, pt-PT, es, fr, de, it, zh-CN, ja, vi) with free-text fallback for any other locale.
- `package.json`: corrected `repository`, `homepage`, `bugs` to point at `qwize-br/wize-development-kit` (was `qwize/wize-dev-kit`).
- `package.json`: added `prepublishOnly` running tests + structural validators.

### Added

- `.github/workflows/publish.yml`: GitHub Actions workflow that publishes to npm on tag push (`v*`) using **Trusted Publishing** (OIDC). No long-lived `NPM_TOKEN` secret. Emits `--provenance` attestation.

## [0.1.0] — 2026-05-31

### Added

- Initial skeleton (v0.1.0 scaffold).
- 9-persona Marvel roster: Wizer, Pepper Potts, Peggy Carter, Maria Hill, Mantis, Nick Fury, Tony Stark, Hawkeye, Shuri.
- Three profile structure: Wize Dev Core + Wize Web Dev overlay + Wize App Development overlay.
- Test Architect (Hawkeye) with 6 canonical gates: risk, design, trace, nfr, review, gate.
- Whiteport Design Studio embedded: Pepper absorbs Saga (Analyst), Mantis absorbs Freya (Designer).
- Agent Builder skill set: `wize-create-agent`, `wize-create-skill`, `wize-create-workflow`.
- Multi-IDE adapters: Claude Code, Cursor, Windsurf, Codex, Continue, Kimi Code, OpenCode, Antigravity, generic fallback.
- Installer CLI skeleton with greenfield/brownfield detection.

### References

- Inspired by [BMAD Method v6.8.0](https://github.com/bmad-code-org/BMAD-METHOD).
- WDS module inspired by [bmad-method-wds-expansion](https://github.com/bmad-code-org/bmad-method-wds-expansion).

[Unreleased]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/qwize-br/wize-development-kit/releases/tag/v0.1.0
