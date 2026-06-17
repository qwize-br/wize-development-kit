---
status: baseline
owner: Peggy Carter
created: 2026-06-13
last_refreshed: 2026-06-13
sampled: "wize-cli.js, detect.js, render-shared.js, structure.test.js, agent.yaml files, workflow.md files, module.yaml files"
---

# Conventions (observed, not prescribed)

## Naming

- **Files:** kebab-case everywhere (`wize-cli.js`, `risk-profile.md`, `wize-agent-architect/`).
- **Folders:** kebab-case, prefixed by purpose (`wize-*`, `tea-*`, `1-analysis`, `2-plan-workflows`).
- **Agent codes:** `wize-(agent|orchestrator)-<role>`.
- **Workflow/skill codes:** `wize-<verb-or-domain>`.
- **YAML keys:** snake_case.
- **Node modules:** required via `node:` prefix (`node:fs`, `node:path`, `node:test`).

## Folder structure

- **src/** organized by capability module, not by file type:
  - `method-skills/{phase}/wize-*/{agent.yaml,persona.md,workflow.md}`
  - `tea-skills/wize-tea-*/workflow.md`
  - `core-skills/wize-*/skill.md`
  - `orchestrator-skills/wize-*/{agent.yaml,persona.md,workflow.md}`
  - `builder-skills/wize-create-*/workflow.md`
  - `web-overlay/` and `app-overlay/` with `module.yaml` + workflows + `playbooks/`.
  - `security-overlay/` (AI Pentester, overlay técnico, file-first) with skills + `_shared/` + `data/` + agents/. Skills/workflows under it must carry `overlay: security` in frontmatter.
  - File naming for assets under `src/**/skills/` is lowercase `skill.md` (not `SKILL.md`) — see `tools/installer/validators/walk.js`.
- **tools/installer/** holds all runtime JS.
- **adapters/** holds one directory per IDE target with `adapter.yaml`, `render.js`, `README.md`.
- **schemas/** holds JSON Schema files.
- **test/** co-located at repo root; uses Node built-in `node:test`.

## Markdown frontmatter

- Agent descriptors: `agent.yaml` with `code`, `name`, `title`, `module`, `description`.
- Workflows/skills: markdown with YAML frontmatter (`---` block) carrying `code`, `name`, `phase`, `owner`, `status`, `overlay`, `gate`.
- All generated knowledge docs carry `status`, `owner`, `created`, `last_refreshed`.

## Test placement

- Tests live in `test/*.test.js`, not co-located with source.
- Framework: Node built-in `node:test` + `node:assert`.
- Style: descriptive test names, temp directory helpers, cleanup with `fs.rmSync`.

## Code style

- `'use strict';` in every JS file.
- No semicolon-free style; statements end with semicolons.
- Comments are sparse but explanatory; JSDoc-style blocks for module entry points.
- Error handling: try/catch around filesystem reads; no centralized logger.
- No linter or formatter config found in the repo (no `.eslintrc`, `prettier.config.*`, `biome.json`, `.editorconfig`).

## Observed deviations

- README still says "alpha — v0.1.0" in the status section while package.json and CHANGELOG are at v0.3.0.
- Some source workflow files are marked `status: ready` but rely on the IDE to execute; there is no runtime runner for them.
- `wize-cli.js` mixes CLI dispatcher, install logic, prompt helpers, and adapter rendering in a single large file.

## 2026-06-17 — security-overlay E05-S01

- Secrets found by SAST (gitleaks) are written to `sast.md` with
  `redacted_value: ***REDACTED***`. The actual secret value NEVER appears
  in any partial — only file/line/rule. The full gitleaks report (with
  raw values) lives in `.wize/security/gitleaks-report.json` and is
  intentionally NOT committed (the directory is gitignored).
