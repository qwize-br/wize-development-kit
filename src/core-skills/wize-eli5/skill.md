---
code: wize-eli5
description: "Use quando alguém pedir para explicar um conceito, trecho de código, erro ou decisão para um público específico — adapta vocabulário, analogias, tom, profundidade e framing ao ouvinte."
name: ELI5
module: core
status: ready
---

# ELI5 — Explain Like I Am 5

**Goal.** Explain anything to anyone — a concept, a piece of code, an error, an architecture decision, a business rule — calibrated to the listener. The same idea gets a different explanation for a 5-year-old, a manager, an engineer, or a client. ELI5 is a communication tool, not an artifact of its own: it produces the explanation in the conversation (or as a short doc when asked).

Inspired by [ELI5](https://github.com/dreambigou/eli5) by Andrew Ou — adapted to the Wize method: audience detection first, explicit calibration, and a comprehension check before handing off.

## Step 1 — Detect the audience

Read the prompt for an explicit or implicit audience. If none is given, ask **one** question with a recommendation (rule 2 of `wize-grill`): "I'll explain it for a non-technical stakeholder — or would you prefer the engineering version?"

| Category | Examples |
|---|---|
| **Ages** | 5, 10, 15, 20, 30, 40+ |
| **Grade levels** | 5th grade, middle school, high school, college, graduate |
| **Job roles** | Manager, engineer, designer, director, product manager, client, stakeholder |
| **Relationships** | Wife, husband, parents, kids, friend, investor |

## Step 2 — Calibrate on five axes

| Axis | Non-technical / child | Technical / peer |
|---|---|---|
| **Vocabulary** | No jargon; everyday words; define any term you must use | Proper terminology, precise names |
| **Analogies** | Toys, playground, kitchen, games | Systems, patterns, prior art, math |
| **Tone** | Playful, warm, patient | Direct, professional, dense |
| **Depth** | Short and sweet; one idea at a time | Nuanced; trade-offs; edge cases |
| **Framing** | What it does for *them*, in their world | Impact/risk, architecture, constraints |

Role-specific framing:
- **Manager / director** → business outcome, cost, risk, timeline. No implementation detail unless asked.
- **Designer** → user experience, flow, visual impact.
- **Engineer** → mechanism, contracts, failure modes.
- **Client / stakeholder** → what changes for them, what they must decide, what it costs.
- **Child / layperson** → one concrete analogy, one sentence per idea, check understanding.

## Step 3 — Explain

1. **One idea per beat.** Short sentences. If the explanation needs more than ~5 beats, structure it (numbered steps or a tiny table).
2. **Lead with the analogy for non-technical audiences** — then, only if asked, bridge to the real mechanism ("it's like a library card catalog… and the actual index is a B-tree").
3. **For code**: show the *behavior* first (what it does), then the *why* (why it exists), then the *how* (mechanism) — in that order, stopping at the depth the audience needs.
4. **For errors**: plain-language what happened → why it happened → what we do about it. Never dump a stack trace at a non-technical audience.
5. **For decisions**: the decision → the reason → the alternative considered → the cost of being wrong.

## Step 4 — Verify comprehension

Close with a lightweight check, matched to the audience:

- **Child / layperson**: "Does that make sense? Want me to say it with a different example?"
- **Manager / client**: one-line summary + the single decision or action they own.
- **Engineer**: offer the next level: "Want the implementation details / the failure modes / the alternatives?"

If the listener asks a follow-up, re-calibrate — the audience may have shifted (a manager asking "how does that work technically?" is now an engineer).

## Anti-patterns

- Explaining to a 5-year-old with the same depth as a code review.
- Dumping jargon at a non-technical audience ("it's a distributed consensus algorithm").
- Over-simplifying for an engineer (no hand-waving at peers).
- Skipping the audience check when the prompt is ambiguous.
- Explaining *everything* — answer the question asked, then stop.
- Using the same analogy for every audience (a playground analogy lands for a child, not for a CFO).

## Hand-off

> Explained {topic} for {audience} — calibrated on vocabulary, analogies, tone, depth and framing. Comprehension check: {result}. {One-line summary or next action for the listener.}
