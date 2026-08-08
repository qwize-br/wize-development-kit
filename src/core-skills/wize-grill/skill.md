---

code: wize-grill
description: "Use quando uma demanda chegar vaga e precisar de entrevista exaustiva para alcançar entendimento compartilhado antes de produzir qualquer artefato."
name: Grill
module: core
status: ready
---

# Grill

**Goal.** Interview the user exhaustively about a demand until both sides reach **shared understanding** — before any artifact is drafted. Sharper answers make a sharper brief, PRD, epic, story, or plan. Grill is an input-quality tool, not an artifact of its own.

Any persona about to author an artifact can invoke it: Pepper before a brief, Maria Hill before a PRD, Tony before epics/stories/architecture, Wizer when a demand arrives fuzzy. Wizer also **suggests** it from `/wize` (or `/wize-help`) — always suggest, never force.

## The five rules

1. **One question at a time.** Ask, then wait for the answer. A batch of questions is bewildering and produces shallow answers.
2. **Every question ships with a recommendation.** State your recommended answer and a one-line reason. The user confirms or corrects — far cheaper than answering from scratch.
3. **Facts are looked up; decisions are asked.** If the answer lives in the repo, `.wize/`, or the environment (stack, existing behavior, conventions, prior artifacts), fetch it — never ask. Only genuine decisions — trade-offs, priorities, scope calls — go to the user.
4. **Walk the decision tree in dependency order.** Resolve upstream decisions before the downstream ones that depend on them. Don't ask about scope before the problem is agreed.
5. **No drafting until confirmed.** Close with a compact summary of every decision made and ask for confirmation of shared understanding. Only then hand back to the authoring workflow.

## Question ladder (dependency order)

Climb top-down; **skip any rung an existing artifact already answers** (brief, trigger map, PRD, architecture — check first, rule 3).

| Rung | Resolves | Feeds |
|---|---|---|
| 1. Problem | What hurts, for whom, what's the evidence it hurts | Brief vision / story context |
| 2. Outcome | The observable result that means "solved" — metric, target, deadline | Success criteria / PRD goals |
| 3. Audience | Primary user (role + JTBD), who else is affected | Brief audience / trigger map |
| 4. Scope | What's in, what's explicitly out, non-goals | PRD scope table / story restrictions |
| 5. Constraints | Deadline, budget, compliance, integrations, protected behaviors | Brief constraints / restrictions |
| 6. Risks & assumptions | What, if wrong, changes the plan | PRD assumptions / risk profile |
| 7. Validation | How we'll verify — which checks, which ACs, what "done" means | ACs / validation contract |

When an answer comes back vague, apply a technique from `wize-advanced-elicitation` (5 Whys, laddering, premortem) to that one rung before moving on.

## Calibration — how hard to grill

| Demand class | Depth |
|---|---|
| **Quick Dev** (bug fix, copy edit, dep bump) | Don't grill. One clarifying question max — grilling a typo fix is theater. |
| **Full Lifecycle, incremental** (new story in a known epic) | Short pass: rungs 4, 5, 7 only — the upstream rungs live in the PRD. |
| **Full Lifecycle, new value** (new feature, new product, new plan) | Full ladder. |

Momentum shortcut: after **three consecutive "as you recommend"** answers, switch to batch mode — state the remaining recommendations as one list and ask for a single confirmation. Respect the user's time; the point is clarity, not ceremony.

## Where answers land

Grill produces no separate file. Route each decision to its home:

- **Decisions** → the target artifact's fields (brief sections, PRD scope/ACs, story restrictions/validation contract) — in the artifact's own words, not chat quotes.
- **Unresolved questions** → the artifact's *Open questions*, each with owner + priority (`blocker` / `important` / `nice-to-know`).
- **Load-bearing trade-offs** → the artifact's decision log (or `DECISIONS.md` / an ADR when architectural).

## Stop conditions

Stop grilling when **any** of these hits:

- Every relevant rung is resolved or explicitly parked as an open question with an owner.
- The user says "enough" / "just go" — park the rest as open questions and proceed with your recommendations, flagged as assumptions.
- The summary is confirmed — shared understanding reached.

## Anti-patterns

- Multiple questions in one message.
- Asking a fact `grep` or `.wize/` would answer.
- A question without a recommendation ("So… what do you want?").
- Grilling a Quick Dev demand.
- Re-opening a confirmed decision without new information.
- Continuing to interrogate after confirmation — grill is a phase, not a personality.

## Hand-off

> Shared understanding confirmed: {n} decisions captured, {m} open questions parked with owners. Handing back to {persona} / `{workflow}` to draft the {artifact}.
