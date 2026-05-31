# Wize Development Kit

> **Full-lifecycle AI-assisted development kit** with Test Architect and Whiteport Design Studio embedded.
> Inspired by [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) and [WDS Expansion](https://github.com/bmad-code-org/bmad-method-wds-expansion).

[![npm version](https://img.shields.io/npm/v/wize-dev-kit?color=blue)](https://www.npmjs.com/package/wize-dev-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange)](#status)
[![Repo](https://img.shields.io/badge/repo-qwize--br%2Fwize--development--kit-181717?logo=github)](https://github.com/qwize-br/wize-development-kit)

---

## Install

In any greenfield or brownfield repo:

```bash
npx wize-dev-kit install
```

Or straight from GitHub (no npm required):

```bash
npx github:qwize-br/wize-development-kit install
```

The installer asks:

1. Profile(s) to enable (Core / +Web / +App — multi-select).
2. IDE target(s) (Claude Code, Cursor, Windsurf, Codex, Continue, Kimi Code, OpenCode, Antigravity, or generic fallback — multi-select).
3. Language preferences (communication + document output).
4. Output folder (default `.wize/`).
5. For brownfield repos: offers to run `wize-document-project` to baseline the existing codebase.

After install, open your IDE and start with:

> "Activate Wizer and brief him on the project."

Wizer will route you to the right persona (Pepper for brief, Mantis for UX baseline, Tony for architecture preferences, etc.).

---

## What it is

Wize Development Kit (WDK) is an installable AI agent stack that takes a project from **brief → PRD → UX strategy → architecture → tested implementation** through 9 specialized agents (Marvel-themed) and a structured workflow library. It runs inside your AI IDE (Claude Code, Cursor, Windsurf, and others) and writes structured artifacts to a hidden `.wize/` folder in the target repo.

Three profiles, combinable in monorepos:

| Profile | What it adds |
|---|---|
| **Wize Dev Core** | Full lifecycle (analysis → plan → solution → implementation) + Test Architect + Whiteport UX + Agent Builder. Always installed. |
| **Wize Web Dev** (overlay) | Web stack scaffolds, SEO, analytics, WCAG playbook for Mantis, Playwright/Vitest playbook for Hawkeye. |
| **Wize App Development** (overlay) | Mobile scaffolds, store-listing, platform guidelines (HIG/Material 3), Detox/Maestro playbook for Hawkeye. |

---

## The roster

| # | Persona | Code | Role |
|---|---|---|---|
| 1 | **Wizer** | `wize-orchestrator` | Orchestrator, knowledge base, briefing, routing |
| 2 | **Pepper Potts** | `wize-agent-analyst` | Business Analyst + WDS Saga (product brief, trigger map) |
| 3 | **Peggy Carter** | `wize-agent-tech-writer` | Technical Writer (transversal) |
| 4 | **Maria Hill** | `wize-agent-pm` | Product Manager (PRD, epics, sprints) |
| 5 | **Mantis** | `wize-agent-ux-designer` | UX Designer + WDS Freya (scenarios, design, design system) |
| 6 | **Nick Fury** | `wize-agent-solution-strategist` | Solution Strategy, tech vision, NFR principles |
| 7 | **Tony Stark** | `wize-agent-architect` | System Architect (architecture, ADRs, epics, stories) |
| 8 | **Hawkeye** | `wize-agent-test-architect` | Test Architect — 6 gates (risk, design, trace, nfr, review, gate) |
| 9 | **Shuri** | `wize-agent-dev` | Senior Developer (TDD, code, refactor) |

See [`ROSTER.md`](ROSTER.md) for personas, styles and BMAD equivalences.

---

## Output layout (in the target repo)

```
.wize/
├── config/             # project.toml, user.toml, tea.toml
├── planning/           # brief, research, ux/, prd, tech-vision, nfr-principles
├── solutioning/        # architecture, adrs, epics, stories
├── implementation/     # sprint-status, retrospective, tea/{gates}
├── knowledge/          # long-lived docs and references
└── custom/             # agents/skills/workflows created by Agent Builder
```

---

## Documentation

- [`ARCH.md`](ARCH.md) — full architecture: distribution, fluxos, layout, installer.
- [`ROSTER.md`](ROSTER.md) — 9 personas with style, role, BMAD equivalences.
- [`DECISIONS.md`](DECISIONS.md) — decisions log from the design interview.

---

## Status

**Alpha — v0.1.0.** This release is a working skeleton: directory tree, agent descriptors, workflow stubs, installer scaffolding, and IDE adapter placeholders. The core flow (brief → PRD → architecture → story → TEA gates) is **scaffolded but not yet wired end-to-end**. Production-readiness target: v0.5.0.

---

## Inspiration & credits

- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) by Brian (BMad) Madison — for the agile AI lifecycle, agent personas, installer pattern, module system.
- [Whiteport Design Studio expansion](https://github.com/bmad-code-org/bmad-method-wds-expansion) — for the UX-first methodology, Norse pantheon (Saga, Freya), phase structure.

Wize Development Kit is an **independent adaptation** — not affiliated with or endorsed by BMAD or WDS authors. Marvel persona names are used as creative references under nominative fair use.

---

## License

MIT — see [`LICENSE`](LICENSE).
