---
status: baseline
owner: Pepper Potts + Peggy Carter
created: 2026-06-13
last_refreshed: 2026-06-13
---

# Overview

**Project:** wize-dev-kit  
**What it is:** Installable AI-assisted development lifecycle kit. Brings 9 Marvel-themed agents (Wizer, Pepper, Peggy, Maria Hill, Mantis, Nick Fury, Tony Stark, Hawkeye, Shuri) into the user's repo via IDE-specific adapters, producing structured artifacts under `.wize/`.

**Current version:** 0.3.0 (npm package `wize-dev-kit`).

**Repository:** https://github.com/qwize-br/wize-development-kit

**License:** MIT

## Size

- Total tracked lines (src + tools + adapters + schemas + test): ~10,200 LOC.
- Runtime dependency count: 1 (`prompts`).
- Test files: 10 (Node built-in `node:test` framework).
- Recent commits (last 3 months): 22, all by André Dantas.
- Markdown docs: README, ARCH, ROSTER, DECISIONS, CHANGELOG, AGENTS, plus per-adapter READMEs.

## What it ships

- **Core runtime:** Node.js CLI (`tools/installer/wize-cli.js`) with subcommands: `install`, `update`, `uninstall`, `list`, `sync`, `agent`, `workflow`, `validate`, `doctor`, `help`.
- **Method library:** 30 workflows under `src/method-skills/` covering analysis → planning → solutioning → implementation.
- **Core skills:** 4 reusable skills (advanced-elicitation, brainstorming, shard-doc, review-adversarial).
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

- v0.3.0 adds `doctor` and automated GitHub Releases.
- Installer, update, sync, agent list/create/edit, and structural validation are implemented and smoke-tested in CI.
- Many workflows are **ready** markdown specs but still executed by the IDE reading the skill; they are not independent Node scripts.
- Self-dogfooding: this baseline itself is produced by the `wize-document-project` workflow (the kit documenting itself).

## 2026-06-17 — security-overlay persona

- **red-teamer** added to the agent roster (security overlay). Drives the
  `wize-sec-pentest` orchestrator through recon → enumerate → sast → dast
  → report. Default passivo; exploits gated by `--active`; every refusal
  is audited. Scope gate is the single source of truth.
