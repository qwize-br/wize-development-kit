# Changelog

All notable changes to **wize-dev-kit** are documented here.
Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.2.1] — 2026-06-11

Focused polish: brownfield baseline finally runs end-to-end through a detected harness CLI, CI publishes without the deprecated-config warning, and every release is now smoke-tested before going up.

### Added

- **Brownfield baseline runs real now.** When the installer detects existing code and you accept the `Run wize-document-project?` prompt, it now scans your PATH for an AI harness CLI (Claude Code, then Codex, then OpenCode), prioritizes whichever you selected as an IDE target, asks you to confirm the headless invocation, and spawns it with the right flags (`claude -p`, `codex exec`, `opencode run`). If no harness CLI is on PATH, the installer prints the exact command you can run later in your IDE. Set `WIZE_SKIP_BASELINE=1` to disable the headless run entirely (used by CI and unattended setups).
- `tools/installer/baseline.js` — exports `detectHarnessCli`, `runHeadlessBaseline`, `manualInstructions`, `defaultPrompt`. Self-contained, no extra deps; uses a manual PATH walk for hermetic, cross-platform detection.
- 7 new unit tests covering detection priority, PATH isolation, the skip-baseline env, and instruction strings.

### Fixed

- CI publish workflow now strips the deprecated `always-auth=false` line from the runner's `.npmrc` before installing. Removes the `npm warn Unknown user config "always-auth"` noise that appeared in every 0.2.0 publish log. See actions/setup-node#1129.

### Added — CI

- **Smoke E2E before publish.** The workflow now packs the tarball, installs it in a temp git repo via `npx`, and asserts that `.wize/`, the Claude adapter SKILL.md, generic AGENTS-equivalent, `kit_version` in `project.toml`, `update`, and `agent list` all work — exactly like a user would experience. Fails the release if anything is off, so we never publish a broken tarball again.
- Sets `WIZE_SKIP_BASELINE=1` in the smoke step so the harness-run prompt doesn't try to spawn `claude` inside GitHub's runner.

### Tests

- Total now **94 passing** (was 87 in 0.2.0).

## [0.2.0] — 2026-06-11

First release that delivers the lifecycle end-to-end. Workflows have real bodies; CLI commands work for real; the team has a Walkthrough to follow.

### Added — CLI

- **`wize-dev-kit update`** — refreshes an installed kit to the version resolved by `node_modules/wize-dev-kit`. Re-runs every active IDE adapter, preserves `.wize/config/user.toml`, re-applies the suggested `.gitignore` block, and writes the new `kit_version` into `.wize/config/project.toml`. Prints the relevant CHANGELOG excerpt between the previous and current version.
- **`wize-dev-kit sync`** — re-renders adapter outputs for whatever `ide_targets` the project opted into. Cheap idempotent call after editing config or running `agent create`.
- **`wize-dev-kit agent list`** — lists every built-in agent (9) plus any custom or override agents the project added.
- **`wize-dev-kit agent create`** — interactive scaffold of a new custom agent. Validates `code` shape, checks for collisions with built-ins, does a dry-run write+read, then persists to `.wize/custom/agents/{code}/{agent.yaml, persona.md}`. Non-TTY callers can pass a spec via API (`fromSpec`).
- **`wize-dev-kit agent edit <code>`** — writes a `customize.toml` override for an existing built-in agent into `.wize/custom/agents/{code}/`.

### Added — UX

- **End-of-install message** now ends with: "Restart your IDE — many harnesses load skills only at startup." plus a quick-reference to the new CLI commands (`update`, `sync`, `agent list`).
- **README walkthrough** — a complete end-to-end slash-command map from `/wize-orchestrator` through `/wize-tea-gate`, plus a new "CLI commands" reference section.

### Changed — workflows now have real bodies

22 workflows that were ≈ 30–50-line stubs in 0.1.x now ship 100–250 lines of working method, examples, anti-patterns, and YAML schemas. Tone aligned with the 0.1.5 playbooks (dense, opinionated, citable).

- **Analysis (Pepper):** `wize-product-brief`, `wize-trigger-map`, `wize-research`, `wize-prfaq`, `wize-document-project`.
- **Plan (Maria Hill + Mantis):** `wize-create-prd`, `wize-validate-prd`, `wize-ux-scenarios`, `wize-ux-design`.
- **Strategy + Solutioning (Fury + Tony + Mantis):** `wize-tech-vision`, `wize-nfr-principles`, `wize-create-architecture`, `wize-design-system`, `wize-create-epics-and-stories`, `wize-check-implementation-readiness`.
- **TEA gates (Hawkeye):** `wize-tea-risk`, `wize-tea-design`, `wize-tea-trace`, `wize-tea-nfr`, `wize-tea-review`, `wize-tea-gate` — each with canonical YAML frontmatter + concrete examples.
- **Implementation (Shuri + Hill + Wizer):** `wize-create-story`, `wize-dev-story`, `wize-quick-dev`, `wize-sprint-planning`, `wize-sprint-status`, `wize-retrospective`, `wize-code-review`.

### Added — engineering

- `tools/installer/commands/{update,sync,agent}.js` — modular command implementations with a minimal TOML reader for the `project.toml` subset.
- `test/cli-commands.test.js` — coverage for update / sync / agent list / agent create / agent edit (10 tests).
- `test/workflow-bodies.test.js` — guards that every workflow.md has ≥ 1.5 KB body and ≥ 4 H2 sections, with an explicit allow-list for intentionally short workflows (overlay scaffolds, builder helpers, orchestrator helpers).
- Test count: **87 passing** (was 33).

### Notes

This release closes JTBD backlog categories 3 (CLI commands real) and 2 (workflows with body) plus 4 (end-of-install UX, README walkthrough). Categories 5 (CI hygiene incl. smoke E2E) and 6 (monorepo routing, TEA enforcing helper) remain on the roadmap.

## [0.1.5] — 2026-06-01

### Added — promises kept

All files that previous releases declared in `module.yaml` but never shipped are now in the kit, with real content (not placeholders).

**Web overlay playbooks** (`src/web-overlay/playbooks/`):

- `wcag-aa.md` — WCAG 2.2 AA checklist for Mantis, with the newer SCs (2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8) and an audit toolchain.
- `responsive-breakpoints.md` — mobile-first stack with container queries, fluid typography (`clamp`), layout primitives (Stack/Cluster/Switcher/Sidebar/Grid/Cover/Frame), image strategy.
- `semantic-html.md` — landmarks, headings, the 12 must-reach-first elements, ARIA rules, common widget patterns with minimum ARIA, anti-patterns.
- `playwright-vitest.md` — Hawkeye's split (70/20/10), Vitest + Testing Library + MSW setup, Playwright POM pattern, selector hierarchy (role → label → text → testid), CI sketch, anti-patterns.
- `web-perf-budgets.md` — Core Web Vitals targets, baseline budgets per resource class, image/font strategy, third-party audit checklist, critical rendering path snippet, lighthouse-ci config, field measurement via `web-vitals` beacon.

**App overlay playbooks** (`src/app-overlay/playbooks/`):

- `apple-hig.md` — POUR-equivalent four principles, layout (status bar/nav/tab/safe-area), navigation patterns, SF Symbols, Dynamic Type, motion, common idioms, iPad specifics, do-not list.
- `material-design-3.md` — pillars, color/type/shape tokens, elevation-by-color, component starter set, adaptive windows (Compact/Medium/Expanded/Large), motion + reduced motion, Material You theming.
- `touch-targets-and-gestures.md` — minimums per platform (iOS 44pt / Android 48dp / web 24px), hit-area snippets per stack, thumb reach zones, reserved gestures, multi-touch, drag-and-drop with keyboard fallback, haptics, reduce-motion.
- `permissions-ux.md` — the four states (not-determined/granted/denied/limited), pre-flight pattern, per-permission guidance (camera/photos/location/notifications/contacts/BLE/health/tracking), denied-state UI + Settings deep-link, copy template.
- `detox-maestro.md` — when to pick each, Maestro YAML + cloud, Detox config + `testID` discipline, cross-platform CI sketch, flakiness rules, critical journeys to cover.
- `mobile-perf-budgets.md` — cold/warm start, TTI, FPS, jank, app size, memory, battery; per-platform targets; size reductions that work; build-time + field measurement.
- `device-matrix.md` — three buckets (floor/volume/ceiling), 2026 iOS + Android matrices, cloud farm comparison, accessibility runs, network conditions, locale coverage.

**Stack catalogs**:

- `src/web-overlay/stack-catalog.md` — Tony's reference for the web architecture interview: frameworks (Next/Nuxt/SvelteKit/Astro/Remix/SPA/Laravel-Inertia), back-end (Supabase/PlanetScale/Drizzle/Prisma/tRPC/GraphQL), auth, hosting, styling, state, forms; ADR record path.
- `src/app-overlay/stack-catalog.md` — Tony's mobile architecture reference: frameworks (RN+Expo / RN bare / Flutter / SwiftUI / Compose / Compose-Multiplatform / Capacitor / native+KMP), build & release, auth, data/sync, state, storage, push, analytics, anti-patterns; ADR record path.

### Added — tests

- `test/playbooks-and-catalogs.test.js`: guards that every playbook declared in an overlay `module.yaml` exists on disk, has frontmatter, and is non-trivial (> 400 chars). Stack catalog presence + size also asserted. Total tests now: **39** (was 33).

### Notes

This release closes Category 1 of the backlog ("promessas vazias"). Categories 2–6 (workflow bodies, `update`/`sync`/`agent create` CLI, polish, Node-24 CI, OIDC return, monorepo & TEA-enforcing) remain on the roadmap.

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

[Unreleased]: https://github.com/qwize-br/wize-development-kit/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/qwize-br/wize-development-kit/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.5...v0.2.0
[0.1.5]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/qwize-br/wize-development-kit/releases/tag/v0.1.0
