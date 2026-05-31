# Changelog

All notable changes to **wize-dev-kit** are documented here.
Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.2] — 2026-05-31

### Added

- **Claude Code adapter is now functional.** `npx wize-dev-kit install` (when `claude-code` is selected as IDE target) generates `.claude/skills/wize-*/SKILL.md` for every agent, workflow and skill in the kit. Each SKILL.md uses the Claude Code skill frontmatter so the slash menu picks up `/wize-orchestrator`, `/wize-product-brief`, `/wize-create-prd`, `/wize-tea-gate`, etc.
- **`wize-help` reworked as an orchestrator-aware skill.** Moved from `core-skills/` to `orchestrator-skills/`. The skill instructs Wizer to read `.wize/config/project.toml` plus the state of `.wize/planning/`, `.wize/solutioning/`, `.wize/implementation/` and reply with a phase-aware "what to do next" answer. Four modes: default, `next`, `status`, `personas`.
- **Interactive prompts in the installer.** Profile and IDE-target selection now use arrow-keys + space (checkbox) via the `prompts` dependency. Non-TTY environments fall back to the previous number-based prompt automatically (preserves CI scriptability).
- Adapter test suite (`test/adapter-claude-code.test.js`) covering: per-agent SKILL.md emission, overlay-gate behavior (core-only vs full), `wize-help` content checks, dry-run safety.

### Changed

- Profile gating now lives inside the Claude Code adapter: overlay workflows (`wize-web-*`, `wize-app-*`) are only emitted when the corresponding overlay is in the selected profiles.

### Dependencies

- Added `prompts@^2.4.2` (1 sub-dependency, ~5 KB). Only used by the interactive installer; not bundled into the kit's runtime artifacts.

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

[Unreleased]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/qwize-br/wize-development-kit/releases/tag/v0.1.0
