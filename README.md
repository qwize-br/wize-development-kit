# Wize Development Kit

> **Full-lifecycle AI-assisted development kit** — takes a project from brief to tested implementation through 10 specialized agents, with a Test Architect, a Whiteport UX studio, and an AI Pentester embedded. Runs inside your AI IDE.

[![npm version](https://img.shields.io/npm/v/wize-dev-kit?color=blue)](https://www.npmjs.com/package/wize-dev-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-beta-green)](#status)
[![Repo](https://img.shields.io/badge/repo-qwize--br%2Fwize--development--kit-181717?logo=github)](https://github.com/qwize-br/wize-development-kit)

**🌐 Languages:** **English** · [Português (pt-BR)](README.pt-BR.md) · [Español](README.es.md)

---

## TL;DR

```bash
npx wize-dev-kit install
```

Pick your profiles and IDE, then in your AI IDE say *"Activate Wizer and brief him on the project."* Wizer routes you through the right agent for each phase — brief, PRD, UX, architecture, tested code — and (optionally) runs an AI pentest of your app.

---

## What it is

Wize Development Kit (WDK) is an installable **AI agent stack** that runs inside your AI IDE (Claude Code, Cursor, Windsurf, Codex, and others) and writes structured artifacts to a hidden `.wize/` folder in your repo. It takes a project from **brief → PRD → UX strategy → architecture → tested implementation**, and can also **pentest the running app and plan the remediation sprint**.

It is **file-first and zero-runtime**: the agents are Markdown skills your IDE reads; the tooling is plain Node (no new npm dependencies). Nothing is mocked — every step reads the previous artifact and writes a real one.

### Profiles (combinable in monorepos)

| Profile | What it adds |
|---|---|
| **Wize Dev Core** | Full lifecycle (analysis → plan → solution → implementation) + Test Architect + Whiteport UX + Agent Builder. Always installed. |
| **Wize Web Dev** *(overlay)* | Web scaffolds, SEO, analytics, WCAG playbook for Mantis, Playwright/Vitest for Hawkeye. |
| **Wize App Development** *(overlay)* | Mobile scaffolds, store listing, platform guidelines (HIG / Material 3), Detox/Maestro for Hawkeye. |
| **Wize Security** *(overlay)* 🆕 | **AI Pentester.** File-first pentest pipeline (recon → enumerate → SAST → DAST → report) driven by the `red-teamer` persona, with a scope gate, OWASP/CVSS classification, and a stakeholder report. |

---

## Install

In any greenfield or brownfield repo:

```bash
npx wize-dev-kit install
```

Or straight from GitHub (no npm needed):

```bash
npx github:qwize-br/wize-development-kit install
```

The installer asks:

1. **Profile(s)** — Core / +Web / +App / +Security (multi-select).
2. **IDE target(s)** — Claude Code, Cursor, Windsurf, Codex, Continue, Kimi Code, OpenCode, Antigravity, or generic fallback (multi-select).
3. **Languages** — communication + document output.
4. **Output folder** — default `.wize/`.
5. **Brownfield** — offers to run `wize-document-project` to baseline the existing codebase.

After install, open your IDE and say:

> "Activate Wizer and brief him on the project."

---

## Supported harnesses

All 9 IDE targets render from the same source; format and mechanics differ per harness. **OpenCode** gets the deepest integration — the kit's persona/workflow split maps onto OpenCode's own primitives (`mode: primary|subagent`, `agent:`, `subtask:`) instead of being flattened into one file type.

| Harness | Output | Notable |
|---|---|---|
| **OpenCode** 🆕 | `.opencode/agents/` + `.opencode/commands/` | Native `mode: primary\|subagent`; commands auto-bind to their owning persona (`agent:`); fan-out workers run isolated (`subtask: true`). [Docs →](docs/harnesses/opencode.md) |
| **Claude Code** | `.claude/skills/*/SKILL.md` | Anthropic Skill format; ad-hoc Task/Agent-tool fan-out (`wize-code-review`). [Docs →](docs/harnesses/claude-code.md) |
| **Codex** | `.agents/skills/*/SKILL.md` | Same Skill format + root `AGENTS.md`. [Docs →](docs/harnesses/codex.md) |
| **Kimi Code** | `.kimi/skills/*/SKILL.md` | Same Skill format; auto-detects Claude/Codex skill trees. [Docs →](docs/harnesses/kimi-code.md) |
| **Antigravity** | `.agent/skills/*/SKILL.md` | Same Skill format + root `AGENTS.md`. [Docs →](docs/harnesses/antigravity.md) |
| **Cursor** | `.cursor/rules/*.mdc` | On-demand rules (`alwaysApply: false`), matched by description. [Docs →](docs/harnesses/cursor.md) |
| **Windsurf** | `.windsurf/rules/*.md` | Plain markdown; activation mode set inside the IDE. [Docs →](docs/harnesses/windsurf.md) |
| **Continue.dev** | `.continue/prompts/*.prompt` | `invokable: true` slash commands. [Docs →](docs/harnesses/continue.md) |
| **Generic fallback** | `.wize/agents/*.md` + root `AGENTS.md` | For any IDE without a dedicated adapter. [Docs →](docs/harnesses/generic.md) |

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
| 10 | **red-teamer** 🆕 | `red-teamer` (security overlay) | AI Pentester — recon, SAST/DAST, scoped offensive testing, reporting |

See [`ROSTER.md`](ROSTER.md) for personas, styles and BMAD equivalences.

---

## Walkthrough — a full project, end to end

Each step is a slash command in your IDE; each persona reads the previous artifact before writing its own.

```
1.  /wize-orchestrator          Wizer greets, reads config, detects state, routes you.

2.  /wize-product-brief         Pepper turns raw demand into brief.md.
    /wize-trigger-map           Pepper maps user psychology → business goals (WDS).
    /wize-research              Pepper synthesizes external evidence (optional).

3.  /wize-create-prd            Maria Hill writes prd.md (goals, scope, ACs).
    /wize-validate-prd          Maria Hill (+ Mantis/Fury) signs off.

4.  /wize-ux-scenarios          Mantis runs the 8-question WDS dialog.
    /wize-ux-design             Mantis writes page specs (one .md per screen).

5.  /wize-tech-vision           Fury picks the stack family + non-negotiables.
    /wize-nfr-principles        Fury writes the NFR budget (perf, sec, a11y…).

6.  /wize-create-architecture   Tony writes architecture.md + ADRs (8 steps).
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

Cross-cutting:
    /wize-help                  Wizer figures out where you are and the next step.
    /wize-quick-dev             Shuri takes a small fix without the full ride.
    /wize-code-review           Adversarial peer review before Hawkeye's TEA gate.
    /wize-party-mode            Wizer convenes multi-persona for hard calls.
```

> Use `/wize-help next` whenever you're unsure — it inspects `.wize/` and tells you the single next action.

---

## 🛡️ Security overlay — AI Pentester

When the **Wize Security** profile is installed, the `red-teamer` persona runs a file-first pentest of your project and produces a stakeholder-ready report.

### How it works

1. **Authorize the target.** You declare allowed hosts/URLs in a signed `.wize/security/scope.md` (SHA-256 integrity). Anything outside the allowlist is **refused and audited** — the tool never touches a target you didn't authorize.
2. **Run the pipeline.**
   ```
   /wize-sec-pentest                 # passive by default (read-only checks)
   /wize-sec-pentest --active        # enables active exploit tooling (sqlmap, ffuf)
   ```
   It chains: **recon** (nmap) → **enumerate** (HTTP surface) → **SAST** (gitleaks secrets + osv-scanner/grype deps) → **DAST** (nuclei, nikto, sqlmap, ffuf) → **report**.
3. **Read the report.** `report.md` + a self-contained `report.html` (offline, WCAG 2.2 AA) with:
   - **Risk score 0–100** + executive **briefing** (what the risk means for the business),
   - findings classified by **CVSS v3.1** and **OWASP Top 10**, with redacted secrets,
   - **honest coverage** ("audit confidence" — what was and wasn't tested),
   - a **prioritized action plan** (P0/P1/P2).
4. **Plan the fix.** The scan emits `security-backlog.md` (remediation epics grouped by theme, traceable to findings) and prints the exact command to turn it into a sprint:
   ```
   /wize-create-epics-and-stories --from .wize/security/security-backlog.md
   ```

### Design guarantees

- **Zero runtime of its own** — Node built-ins only; no new npm dependency; the overlay never invokes a skill (it prints the command for you/the agent to run).
- **Data stays local** — reports and findings are written under `.wize/security/`, never uploaded anywhere.
- **Tools are detected, never auto-installed** — a preflight checks your toolchain and generates an OS-aware `install-pentest-tools.sh` (apt for nmap/nikto/sqlmap; GitHub releases for gitleaks/nuclei/ffuf/osv-scanner; official script for grype). Missing tools degrade a single check gracefully — the pipeline keeps going.
- **Default passive** — offensive tooling (sqlmap/ffuf) runs only with `--active`; dangerous flags (`--dump`, `--os-shell`) are vetoed by an allowlist regardless of input.

> ⚠️ **Dual-use tool.** Only test systems you own or are explicitly authorized to test.

---

## Output layout (in the target repo)

```
.wize/
├── config/             # project.toml, user.toml, tea.toml
├── planning/           # brief, research, ux/, prd, tech-vision, nfr-principles
├── solutioning/        # architecture, adrs, epics, stories
├── implementation/     # sprint-status, retrospective, tea/{gates}
├── knowledge/          # long-lived docs and references
├── security/           # scope.md, report.{md,html}, security-backlog.md (security overlay)
└── custom/             # agents/skills/workflows created by Agent Builder
```

---

## CLI commands

```bash
npx wize-dev-kit install         # interactive setup
npx wize-dev-kit update          # bring an installed kit up to the current version
npx wize-dev-kit sync            # re-render IDE adapters after editing config
npx wize-dev-kit agent list      # list built-in + custom agents
npx wize-dev-kit agent create    # scaffold a new custom agent (validated + dry-run)
npx wize-dev-kit agent edit <code>  # override a built-in agent
npx wize-dev-kit doctor          # diagnose kit / project / adapters / gates
npx wize-dev-kit validate        # structural checks on the kit assets
npx wize-dev-kit document-project [quick|initial_scan|full_rescan|deep_dive] [--resume] [--target <path>]
npx wize-dev-kit uninstall       # remove .wize/ (your code is left untouched)
```

---

## Documentation

- [`ARCH.md`](ARCH.md) — full architecture: distribution, flows, layout, installer.
- [`ROSTER.md`](ROSTER.md) — personas with style, role, BMAD equivalences.
- [`DECISIONS.md`](DECISIONS.md) — decisions log.
- [`CHANGELOG.md`](CHANGELOG.md) — release history.
- [`docs/harnesses/`](docs/harnesses/) — one doc per [supported harness](#supported-harnesses), in English + [pt-BR](README.pt-BR.md#harnesses-suportadas).

---

## Status

**v0.8.0 — beta.** The full lifecycle (analysis → plan → solution → implementation) is wired with 10 agents and a structured skill library. The `security-overlay` (AI Pentester) ships a complete pentest pipeline, a stakeholder report (risk score + briefing + AI action plan), and post-scan remediation planning — validated end-to-end against a real Laravel/PHP app. IDE adapters for Claude Code, Cursor, Windsurf, Codex, Continue, Kimi Code, OpenCode, and Antigravity are regenerated automatically — [OpenCode](docs/harnesses/opencode.md) gets native `mode`/`agent`/`subtask` wiring, the deepest integration of the 9.

---

## Inspiration & credits

- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) by Brian (BMad) Madison — agile AI lifecycle, agent personas, installer pattern, module system.
- [Whiteport Design Studio expansion](https://github.com/bmad-code-org/bmad-method-wds-expansion) — UX-first methodology, Norse pantheon (Saga, Freya), phase structure.

Wize Development Kit is an **independent adaptation** — not affiliated with or endorsed by BMAD or WDS authors. Marvel persona names are used as creative references under nominative fair use.

---

## License

MIT — see [`LICENSE`](LICENSE).
