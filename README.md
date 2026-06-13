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

## Walkthrough — a full project, end to end

Below is the canonical flow Wizer drives in a real session. Each step is a slash command in your IDE; each persona reads the previous artifact before writing its own. Nothing is mocked.

```
1.  /wize-orchestrator          Wizer greets, reads .wize/config/{project,user}.toml.
                                Detects the project state and routes you.

2.  /wize-product-brief         Pepper turns raw demand into brief.md.
    /wize-trigger-map           Pepper maps user psychology → business goals (WDS).
    /wize-research              Pepper synthesizes external evidence (optional).
                                Or run a focused pass:
                                /wize-market-research, /wize-domain-research,
                                /wize-technical-research.

3.  /wize-create-prd            Maria Hill writes prd.md (goals, scope, ACs).
    /wize-validate-prd          Maria Hill (+ Mantis/Fury) signs off.

4.  /wize-ux-scenarios          Mantis runs the 8-question WDS dialog.
    /wize-ux-design             Mantis writes page specs (one .md per screen).

5.  /wize-tech-vision           Fury picks the stack family + non-negotiables.
    /wize-nfr-principles        Fury writes the NFR budget (perf, sec, a11y…).

6.  /wize-create-architecture   Tony writes architecture.md + ADRs via 8 steps
                                (context → decisions → patterns → structure → validation).
    /wize-design-system         Mantis writes design-system/ (tokens + components).
    /wize-create-epics-and-stories
                                Tony slices epics → stories (each has ACs).

7.  /wize-tea-risk              Hawkeye builds the global risk profile.
    /wize-tea-design            Hawkeye writes test design for the next story.
    /wize-dev-story             Shuri implements (TDD, AC IDs in commits).
    /wize-tea-trace             Hawkeye maps each AC → tests.
    /wize-tea-review            Hawkeye runs story review.
    /wize-tea-gate              Hawkeye emits PASS / CONCERNS / FAIL / WAIVED.

8.  /wize-sprint-status         Maria Hill keeps the daily snapshot updated.
    /wize-retrospective         Wizer facilitates retro at end of each sprint.
    /wize-tea-nfr               Hawkeye assesses NFRs at epic boundary.

Cross-cutting:
    /wize-help                  Wizer figures out where you are and proposes
                                the next step (use anytime).
    /wize-quick-dev             Shuri takes a small fix without the full ride.
    /wize-code-review           Shuri runs an adversarial peer review (Blind Hunter,
                                Edge Case Hunter, Acceptance Auditor) before Hawkeye's TEA review.
    /wize-spec                  Distill any intent into a canonical five-field spec.
    /wize-party-mode            Wizer convenes multi-persona for hard calls.
```

> Use `/wize-help next` whenever you're unsure — it inspects `.wize/` and tells
> you the single next action.

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

## CLI commands

```bash
npx wize-dev-kit install         # interactive setup
npx wize-dev-kit update          # bring an installed kit up to the current package version
npx wize-dev-kit sync            # re-render IDE adapters after editing config
npx wize-dev-kit agent list      # list built-in + custom agents
npx wize-dev-kit agent create    # scaffold a new custom agent (validated + dry-run)
npx wize-dev-kit agent edit <code>  # override a built-in via .wize/custom/agents/<code>/customize.toml
npx wize-dev-kit doctor          # diagnose kit / project / adapters / gates and suggest fixes
npx wize-dev-kit validate        # structural checks on the kit assets
npx wize-dev-kit document-project [quick|initial_scan|full_rescan|deep_dive] [--resume] [--target <path>]
                                 # document the current repo; quick baseline by default
npx wize-dev-kit uninstall       # remove .wize/ (your code is left untouched)
```

---

## Documentation

- [`ARCH.md`](ARCH.md) — full architecture: distribution, fluxos, layout, installer.
- [`ROSTER.md`](ROSTER.md) — 9 personas with style, role, BMAD equivalences.
- [`DECISIONS.md`](DECISIONS.md) — decisions log from the design interview.

---

## Status

**v0.3.0+ — beta.** The core lifecycle is scaffolded, the `document-project` engine is wired, and selected BMAD step flows have been adapted into Wize skills: `wize-spec`, `wize-create-architecture` (8-step), `wize-code-review` (adversarial triage), and vertical research skills (`wize-market-research`, `wize-domain-research`, `wize-technical-research`). IDE adapters for Claude Code, Cursor, Windsurf, and others are regenerated automatically. Production-readiness target remains v0.5.0.

---

## Inspiration & credits

- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) by Brian (BMad) Madison — for the agile AI lifecycle, agent personas, installer pattern, module system.
- [Whiteport Design Studio expansion](https://github.com/bmad-code-org/bmad-method-wds-expansion) — for the UX-first methodology, Norse pantheon (Saga, Freya), phase structure.

Wize Development Kit is an **independent adaptation** — not affiliated with or endorsed by BMAD or WDS authors. Marvel persona names are used as creative references under nominative fair use.

---

## License

MIT — see [`LICENSE`](LICENSE).
