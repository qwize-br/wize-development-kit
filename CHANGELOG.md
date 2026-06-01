# Changelog

All notable changes to **wize-dev-kit** are documented here.
Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.4] — 2026-06-01

### Added

- **`user_name` prompt at install time.** The installer asks "How should the agents call you?" (default = `$USER`), and persists the answer to `.wize/config/user.toml` under `[user] name`. Wizer and `wize-help` read this file and greet the user by name (e.g., *"Welcome back, [USER_NAME]. {project} — {profiles}. Next: …"*).
- **Opt-in suggested `.gitignore` block.** The installer asks whether to apply the suggested entries. When accepted, an idempotent block is injected between `# >>> wize-dev-kit (managed) >>>` and `# <<< wize-dev-kit (managed) <<<` markers covering: per-developer files (`user.toml`, `scratch/`, `.local/`, `quick-dev-log.md`) and the generated IDE adapter outputs (`.claude/skills/wize-*`, `.agent/skills/wize-*`, `.cursor/rules/wize-*.mdc`, etc.). Re-running install only updates lines between the markers; everything outside is untouched. Declining keeps `.gitignore` exactly as it was.
- `tools/installer/setup-helpers.js`: pure-ish helpers for `applyGitignore()` (create / append / replace / unchanged) and `generateUserToml()`.
- 8 new unit tests covering gitignore idempotency (create, append, idempotent re-run, stale-block replace, dry-run) and user.toml generation (name, escaping, optional role). Total: 33 passing.

### Changed

- Wizer (orchestrator) persona and `wize-help` skill now instruct the agent to read `.wize/config/user.toml` and use `[user] name` when greeting.
- `project.toml` template comment clarifies "personal preferences live in user.toml".

### Recommended layout (for a team repo)

Commit: `.wize/config/project.toml`, `.wize/config/tea.toml`, `.wize/planning/`, `.wize/solutioning/`, `.wize/implementation/tea/`, `.wize/implementation/retrospective/`, `.wize/knowledge/`, `.wize/custom/`, `AGENTS.md`.
Ignore (handled by the suggested block): `.wize/config/user.toml`, `.wize/scratch/`, `.wize/.local/`, `.wize/implementation/quick-dev-log.md`, and all generated adapter outputs (each developer runs `npx wize-dev-kit install` for their own IDE target).

## [0.1.3] — 2026-06-01

### Added

- **All 9 IDE adapters now ship real renderers** (previously 8 of them were stub printers). Each adapter writes files at the canonical path each harness expects:
  - **Claude Code** → `.claude/skills/wize-{code}/SKILL.md`
  - **Antigravity (Google)** → `.agent/skills/wize-{code}/SKILL.md` (singular `.agent`; `.antigravitycli/` is the CLI's own state and is left untouched)
  - **OpenAI Codex CLI** → `.agents/skills/wize-{code}/SKILL.md`
  - **Moonshot Kimi Code** → `.kimi/skills/wize-{code}/SKILL.md`
  - **Cursor** → `.cursor/rules/wize-{code}.mdc` (with `description`, `globs`, `alwaysApply` frontmatter)
  - **Windsurf (Codeium)** → `.windsurf/rules/wize-{code}.md`
  - **Continue.dev** → `.continue/prompts/wize-{code}.prompt` (`invokable: true` → slash command)
  - **OpenCode (sst/opencode)** → `.opencode/agents/wize-{code}.md` (personas, with `mode: primary` for Wizer and `mode: subagent` for the others) + `.opencode/commands/wize-{code}.md` (workflows/skills as slash commands)
  - **Generic fallback** → `.wize/agents/wize-{code}.md` + a root `AGENTS.md` baseline (read by Codex, Cursor, Windsurf and Antigravity even without their dedicated adapter)
- New shared module `tools/installer/render-shared.js` centralizes kit traversal, asset parsing, and the Anthropic-style SKILL.md emitter reused by Claude Code, Antigravity, Codex and Kimi adapters.
- Adapter test suite expanded from 12 → 25 passing tests, with one sanity test per adapter plus format-specific checks (Cursor frontmatter shape, Continue `invokable: true`, OpenCode primary/subagent mode split, generic AGENTS.md emission).

### Fixed

- Antigravity adapter previously created/touched nothing useful. It now emits skills at the correct location (`.agent/skills/`) and explicitly avoids `.antigravitycli/` (CLI state, owned by the Antigravity CLI itself).

### Notes

- Several harnesses inject custom skills at session startup; you may need to restart the IDE after `wize-dev-kit install` for slash commands to appear.

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

[Unreleased]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/qwize-br/wize-development-kit/releases/tag/v0.1.0
