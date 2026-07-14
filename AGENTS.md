# Agents — Wize Development Kit

This repo is wired with the [`wize-dev-kit`](https://www.npmjs.com/package/wize-dev-kit).
Detailed artifacts live under `.wize/`. The agents below are activated through your AI IDE
using slash commands (Claude Code, Codex, Cursor, Windsurf, Antigravity all read this file).

## Operating context

Treat `.wize/`, this `AGENTS.md`, and the installed `wize-*` skills as your operating
instructions and persistent memory — not background reading. Read project state before
acting; write what you change back into `.wize/` so the next session inherits it.

Before editing, classify the demand via `/wize-help`: **Quick Dev** (small, predictable,
~≤1h, no new feature / architecture / UX / security) or **Full Lifecycle**. Never pick
Quick Dev just to skip artifacts.

When a skill fans out to subagents, match the model tier to the task: a lightweight tier
for mechanical work (reads, greps, formatting, short summaries), the standard tier for
implementation and review, a high-capability tier only for architecture, critical
decisions, or final adversarial review.

## Roster

- **Hawkeye** (`wize-agent-test-architect`) — Test Architect (TEA). |
- **red-teamer** (`wize-sec-red-teamer`) — Security Overlay — Red-Teamer. |
- **Wizer** (`wize-orchestrator`) — Orchestrator / Knowledge Base. |
- **Shuri** (`wize-agent-dev`) — Senior Developer. |
- **Nick Fury** (`wize-agent-solution-strategist`) — Solution Strategy / Tech Vision. |
- **Tony Stark** (`wize-agent-architect`) — System Architect. |
- **Mantis** (`wize-agent-ux-designer`) — UX Designer (Whiteport Design Studio). |
- **Maria Hill** (`wize-agent-pm`) — Product Manager. |
- **Peggy Carter** (`wize-agent-tech-writer`) — Technical Writer. |
- **Pepper Potts** (`wize-agent-analyst`) — Business Analyst (incl. WDS Saga). |

## Where to start

Activate the orchestrator: `wize-orchestrator` (Wizer). Then ask `/wize-help`.
