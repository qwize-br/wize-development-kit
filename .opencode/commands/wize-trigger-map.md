---
description: "1-analysis: Trigger Map"
agent: wize-agent-analyst
---

# Trigger Map

# Trigger Map

**Goal.** Map user psychology to business goals. For each user action the product wants to drive, name the **trigger** (the need/anxiety/desire that precedes it), the **friction** that blocks it today, the **business outcome** unlocked, and the **signal** that confirms it happened.

This is the bridge between Pepper's brief and Maria Hill's PRD: it forces the team to argue *why* users would do the thing before *what* the team will build.

Pepper drives. Output lands in `.wize/planning/ux/trigger-map.md`.

## Inputs

- `.wize/planning/brief.md` (vision + audience + success criteria).
- `.wize/planning/research.md` (when present — strengthens triggers with evidence).

## Outputs

- `.wize/planning/ux/trigger-map.md`

## Steps

### 1. List target user actions

From the brief, list **3–8 actions** users must take for the product to succeed. Verb-led. Concrete.

- ✓ "Sign up using a work email."
- ✓ "Add a teammate."
- ✓ "Confirm the first invoice."
- ✗ "Get value." (too abstract)

If you have more than 8, you're conflating products. Trim.

### 2. Per row: trigger / friction / business outcome / signal

For each action, fill four cells. Each cell ≤ 1 sentence.

| Field | What goes here |
|---|---|
| **Trigger** | The mental state preceding the action. *Need / anxiety / desire.* What makes the user think "I need to do this now"? |
| **Friction** | The cost of doing it today (in the current workaround or competitor). What stops them? |
| **Business outcome** | What changes for the business when this action happens. Revenue, retention, cost, NPS, risk reduction. |
| **Signal** | The telemetry event/state-change proving it happened. Name it like an event (`signup_succeeded`), not a phrase ("user signs up"). |

### 3. Mark each row evidence-backed or hypothesis

Every cell must be tagged:

- `evidence:<source>` — when based on an interview, survey, analytics or a citable doc.
- `hypothesis` — when we believe it but haven't proven it.

Hypotheses are fine. Hidden hypotheses are not. Force the label.

### 4. Wire to success criteria

For each of Pepper's success criteria in the brief, identify **which row of the map is the load-bearing one**. If a criterion has no row mapped to it, either it's not a real success criterion or the map is missing an action.

### 5. Hand off

Mark `status: ready-for-prd`. Tell Wizer the next step is Maria Hill.

## Output template

```markdown
---
status: ready-for-prd | draft
owner: Pepper Potts
created: YYYY-MM-DD
---

# Trigger Map — {{project_name}}

## Actions

| # | Action | Trigger | Friction | Business outcome | Signal | Evidence |
|---|---|---|---|---|---|---|
| 1 | Sign up with work email | "We need a tool we can hand to the team next week." | Existing tool requires manual SSO; we want self-serve. | New paid-team conversion. | `signup_completed` | research:user-interview-2026-04 |
| 2 | Invite first teammate | Won't move forward solo. | Email + reminder loops cost manager 10min. | Activation. | `teammate_invited` | hypothesis |
| … | … | … | … | … | … | … |

## Coverage of brief success criteria

- **Criterion 1** ("TTI ≤ 1.5s on Android by Q3") → covered by row 4 (`page_loaded`).
- **Criterion 2** ("…") → covered by row 1.
- …
```

## Anti-patterns Pepper rejects

- **Triggers written as features.** "Wants the dashboard." Wrong layer. Reword to the emotion/need: "Wants to know if the team is okay."
- **Friction in vague language.** "It's confusing." Wrong. Name the step that breaks: "After invite, no email arrives for 4 hours."
- **Business outcomes with no metric.** "Drives engagement." Wrong. "Reduces churn by ≥ 1pp in cohort C." If you can't measure it, it's not an outcome — it's a hope.
- **Signals that fire on intent, not completion.** `signup_button_clicked` is intent. `signup_completed` is the signal.
- **Same row repeated for two actions.** Each row must justify a distinct action. If you can collapse them, do it.

## Hand-off

> Trigger map is in `.wize/planning/ux/trigger-map.md`. Hill, the PRD goals should anchor on rows 1, 3, and 5 — they map to the success criteria in the brief.
