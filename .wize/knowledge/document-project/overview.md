---
status: baseline
owner: Pepper Potts + Peggy Carter
created: 2026-06-13
last_refreshed: 2026-07-04
---

# Overview

**Project:** wize-dev-kit  
**What it is:** Installable AI-assisted development lifecycle kit. Brings 9 lifecycle personas + a 10th security-overlay persona (red-teamer, opt-in) (Wizer, Pepper, Peggy, Maria Hill, Mantis, Nick Fury, Tony Stark, Hawkeye, Shuri) into the user's repo via IDE-specific adapters, producing structured artifacts under `.wize/`.

**Current version:** 0.8.0 (npm package `wize-dev-kit`).

**Repository:** https://github.com/qwize-br/wize-development-kit

**License:** MIT

## Size

- Total tracked lines (src + tools + adapters + schemas + test): ~26,300 LOC (code dirs).
- Runtime dependency count: 1 (`prompts`).
- Test files: 24 (246 tests) (Node built-in `node:test` framework).
- Recent commits (last 3 months): 50, all by André Dantas.
- Markdown docs: README, ARCH, ROSTER, DECISIONS, CHANGELOG, AGENTS, plus per-adapter READMEs.

## What it ships

- **Core runtime:** Node.js CLI (`tools/installer/wize-cli.js`) with subcommands: `install`, `update`, `uninstall`, `list`, `sync`, `agent`, `workflow`, `validate`, `doctor`, `document-project`, `version`, `help`.
- **Method library:** 31 workflows under `src/method-skills/` covering analysis → planning → solutioning → implementation.
- **Core skills:** 10 core skills (advanced-elicitation, brainstorming, shard-doc, review-adversarial, review-edge-case-hunter, index-docs, editorial-review-prose, editorial-review-structure, customize, spec).
- **TEA (Hawkeye):** 6 gates (risk, design, trace, nfr, review, gate) with advisory-by-default policy.
- **Builder skills:** 3 meta-skills to create agents, skills, and workflows.
- **Web / App overlays:** 3 workflows + playbook docs each.
- **IDE adapters:** 9 targets (Claude Code, Cursor, Windsurf, Codex, Continue, Kimi Code, OpenCode, Antigravity, generic fallback).
- **Schemas:** JSON Schema for agent, workflow, skill, module definitions.
- **CI/CD:** GitHub Actions publish workflow with npm Trusted Publishing + GitHub Release generation from CHANGELOG.

## Install footprint

When installed into a target repo, the CLI creates:

```
.wize/
├── config/{project,user,tea}.toml
├── planning/{brief,research,ux/}
├── solutioning/{architecture,adrs,epics,stories,design-system}
├── implementation/{sprint-status,retrospective,tea/}
├── knowledge/{document-project,decisions}
└── custom/{agents,skills,workflows}
```

IDE adapters render the same assets into each selected IDE's native format (e.g. `.claude/skills/wize-*/SKILL.md`, `.cursor/rules/wize-*.mdc`).

## User-facing maturity

- v0.8.0 ships the opt-in security-overlay pipeline (red-teamer persona + `wize-sec-pentest`), OpenCode native wiring (personas/workflows mapped to harness-native agents/commands), and the `document-project` CLI subcommand.
- Installer, update, sync, agent list/create/edit, and structural validation are implemented and smoke-tested in CI.
- Many workflows are **ready** markdown specs but still executed by the IDE reading the skill; they are not independent Node scripts.
- Self-dogfooding: this baseline itself is produced by the `wize-document-project` workflow (the kit documenting itself).

## 2026-06-17 — security-overlay persona

- **red-teamer** added to the agent roster (security overlay). Drives the
  `wize-sec-pentest` orchestrator through recon → enumerate → sast → dast
  → report. Default passivo; exploits gated by `--active`; every refusal
  is audited. Scope gate is the single source of truth.

## 2026-07-04 — per-harness docs + OpenCode highlighted

- New `docs/harnesses/<name>.md` (+ `.pt-BR.md`) — one pair per IDE
  adapter (opencode, claude-code, codex, kimi-code, antigravity, cursor,
  windsurf, continue, generic), documenting each adapter's real output
  path and format from `adapters/*/render.js`.
- README.md / README.pt-BR.md gained a "Supported harnesses" /
  "Harnesses suportadas" table linking to each doc, calling out that
  **OpenCode** is the only adapter where personas/workflows map onto a
  harness-native primitive (`mode: primary|subagent`, `agent:`,
  `subtask:`) instead of being flattened into one file type.
- Shuri's persona gained a "reuse ladder" (YAGNI → reuse in repo →
  stdlib → native/framework → dependency → one-liner → new code); Wizer's
  persona gained a documented subagent fan-out pattern generalized from
  `wize-code-review`'s own fan-out step.
