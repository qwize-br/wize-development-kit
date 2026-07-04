---
description: "1-analysis: Product Brief"
agent: wize-agent-analyst
---

# Product Brief

# Product Brief

**Goal.** Convert raw demand into a one-page brief the team can ship from. The brief is the single source of truth at this point — every other artifact (PRD, UX, architecture) references back to it.

Pepper drives. Peggy edits prose. Output lands in `.wize/planning/brief.md`.

## Inputs

- Raw demand (chat message, doc, ticket, screenshot, recording).
- Optional existing materials (deck, doc, prior brief).
- `.wize/config/project.toml`.

## Outputs

- `.wize/planning/brief.md`
- Optionally `.wize/knowledge/research/` if Pepper pulled external sources.

## Steps

### 1. Frame in one paragraph

What is being asked, by whom, and by when. If you can't write it in three sentences, you don't understand it yet. Ask one clarifying question, then write.

### 2. Audience

- **Primary user** (one, name them by role + JTBD).
- **Secondary users** (≤ 2).
- **Stakeholders** (≤ 3 — the people whose lives change if this ships).

If the user list overflows, the brief is too broad. Force the cut.

### 3. Vision

One sentence describing the desired future state. Future tense. Concrete. No buzzwords. Test: can a new dev one month from now repeat it after a 30-second read?

### 4. Success criteria

3–5 measurable outcomes. Numbers, not adjectives.

Examples:
- ✓ "Median TTI on the checkout page ≤ 1.5s on a mid-range Android by Q3."
- ✗ "Faster checkout."

### 5. Non-goals

What this is *not*. Cut ambiguity early. If a feature isn't ruled in or out here, it will be in the PRD review.

### 6. Constraints

Hard limits. Pick from:
- Deadline (and what slipping it means).
- Budget envelope (one-time and run-rate).
- Compliance (GDPR, LGPD, SOC2, PCI, HIPAA, etc.).
- Integrations the product must speak to.
- Team / hiring envelope.

### 7. Open questions

Each with the human who can answer it. Each marked priority `blocker` / `important` / `nice-to-know`. Blockers must be resolved before the PRD starts.

### 8. Hand-off

- Mark `status: ready-for-prd` in the brief.
- Notify Wizer: "Brief ready, hand to Hill."
- Move to `wize-trigger-map` next (Pepper continues).

## Brief template

```markdown
---
status: ready-for-prd | draft
owner: Pepper Potts
created: YYYY-MM-DD
---

# Brief — {{project_name}}

## Vision
…

## Audience
- **Primary:** … (one role + their JTBD)
- **Secondary:** …
- **Stakeholders:** …

## Success criteria
1. …
2. …
3. …

## Non-goals
- …

## Constraints
- **Deadline:** …
- **Budget:** …
- **Compliance:** …
- **Integrations:** …

## Open questions
- [ ] **(blocker)** … — *owner: NAME*
- [ ] **(important)** … — *owner: NAME*
- [ ] **(nice-to-know)** … — *owner: NAME*
```

## Anti-patterns Pepper rejects

- "Make the product better." → no audience, no outcome, not a brief.
- Pasting a stakeholder's slack message verbatim. Rewrite in the brief voice.
- Success criteria like "increase engagement". Reword: which event, how much, by when.
- Hidden assumptions ("everyone has fast internet"). Surface them in *Constraints* or *Open questions*.
- Open questions with no owner. If nobody owns it, the answer never comes.

## When to skip

This workflow is **not optional** for new products / new features. For tiny fixes (typo, copy, dependency bump), use `wize-quick-dev` instead — Pepper isn't called.

## Hand-off

When the brief is approved, Pepper notifies Wizer:

> Brief is ready in `.wize/planning/brief.md`. No blockers open. Hill, your call on PRD.
