---

code: wize-retrospective
description: "Use quando o sprint terminar e precisar de retrospectiva facilitada com todo o time."
name: Retrospective
phase: 4-implementation
owner: wize-orchestrator   # Wizer facilitates; whole team contributes
status: ready
---

# Retrospective

**Goal.** Capture what worked, what didn't, what surprised, and **one concrete change for next sprint**. A retro that ends in a vibe is a retro that didn't ship a change.

Wizer facilitates. Hill enforces output discipline. Everyone (including Pepper, Mantis, Fury) contributes.

## When to run

- End of every sprint (cadence).
- After any incident (separate; pulls from incident timeline).
- At major milestones (epic close, release, year-end).

## Inputs

- `.wize/implementation/sprint-status.md` (current sprint)
- All `gate.md` files from current sprint
- `tea/nfr/{epic}.md` if an epic closed this sprint
- Quick-dev log
- Git history for the sprint window (tag range, or first → last commit)

## Output

- `.wize/implementation/retrospective/{YYYY-MM-DD}.md`

## Format (60 minutes, fixed)

| Minutes | Section |
|---|---|
| 0–5 | Frame: Wizer reads the sprint stats (capacity, shipped, slipped, gates). |
| 5–15 | **Worked** — what we want to repeat. |
| 15–25 | **Didn't work** — what we want to change. |
| 25–35 | **Surprised us** — externalities, signals, anything not on plan. |
| 35–45 | Pick **1–3 changes**. Vote with effort/impact dots. |
| 45–55 | Each change gets an owner + deadline. |
| 55–60 | Wizer reads back the doc; everyone confirms; close. |

Going over 60 minutes is a sign the retro became therapy. Time-box.

## Steps

### 1. Open with stats

Wizer reads the sprint dashboard from `sprint-status.md`:
- Stories committed vs shipped (a count, not a velocity metric — we don't estimate).
- Number of gates: PASS / CONCERNS / FAIL / WAIVED.
- Blockers and their resolution times.
- Carry-over count.

Stats anchor the retro in observations, not feelings.

#### Code accounting (numbers, not adjectives)

Measured from git over the sprint window. Report the numbers even when they look bad — especially then:

| Metric | How to get it |
|---|---|
| Lines added / removed / net | `git diff --shortstat <base>..<head>` (base = last sprint's tag or first commit) |
| Files touched | count of distinct files in the range: `git diff --name-only <base>..<head> \| wc -l` |
| Dependencies | entries added/removed in the manifest diff (`package.json`, `composer.json`, `pyproject.toml`, `Cargo.toml`) |
| New abstractions | modules, classes, or interfaces introduced by the sprint (count from the diff) |
| Debt markers | `wize-debt:` added vs retired this sprint (run `/wize-debt`) |
| Complexity | cyclomatic-complexity delta from `tea/nfr/{epic}.md` when an epic closed |

Why this exists: the kit's discipline (reuse ladder, `/wize-subtract`, debt markers) is only verifiable with numbers. A sprint that ships 4 stories while adding 3k net lines and 6 dependencies is telling you something — say it out loud in the retro, and turn it into a change if it repeats.

### 2. Worked / didn't / surprised

Each engineer brings 2–3 items per section, written in advance ideally. Time-box discussion: any item that takes > 3 min becomes a follow-up.

### 3. Changes (1–3 max)

A change is:
- **Specific:** "Pair-program for E04-S02 because R-3 is high" — not "communicate more."
- **Owned:** a person.
- **Bounded:** a deadline or a sprint to land it.

If you pick 4+ changes, you'll execute 0. Choose.

### 4. Write the doc

Use the template; close the retro with the doc in front of the team.

### 5. Trigger reads

Wizer notifies Hill (who plugs the changes into next sprint planning), Hawkeye (who may revise risk profile), Fury (when an NFR principle change emerges).

## Output template

```markdown
---
sprint: 7
date: 2026-06-25
facilitator: Wizer
attendees: [Hill, Tony, Mantis, Pepper, Fury, Hawkeye, Shuri]
---

# Retrospective — Sprint 7

## Sprint snapshot
- Committed: 4 stories + 1 stretch
- Shipped: 4 stories
- Stretch: not pulled
- Gates: 4 PASS, 1 CONCERNS, 0 FAIL
- Blockers: 1 (vendor sandbox, resolved Day 5)
- Carry-over to S8: 0

## Code accounting
- Lines: +1.842 / −2.310 (net −468) across 71 files
- Dependencies: +1 (`zod`), −0
- New abstractions: 2 (one repository interface, one mapper — both with a single implementation; flagged by `/wize-subtract`)
- Debt markers: +3 added, −1 retired (2 with a trigger, 1 `no-trigger`)
- Complexity: no NFR delta this sprint (no epic closed)

## Worked
- Pairing on E03-S02 (auth refresh) — issue caught at integration test instead of in prod.
- TEA design done at planning for R-3 stories paid off.
- Mantis' "before/after" recordings in PRs accelerated review.

## Didn't work
- Sprint-status entries went stale mid-sprint (Hill on vacation).
- E02-S02 was too big for one PR and should have been sliced; it stalled the sprint.
- Vendor outage with no fallback caught us cold.

## Surprised us
- A11y audit caught 3 issues on a screen Mantis had already signed off on (axe found dynamic-content edge cases).
- Cost dashboard showed mailer spend doubled — outbox retry was too aggressive.

## Changes for Sprint 8

1. **Sprint-status delegation rotation** — when Hill is OOO, Wizer takes over. *Owner: Wizer. By: Sprint 8 Day 1.*
2. **Slice-check every story at planning** — any story that can't be described as a single PR gets split before it's pulled. *Owner: Tony. By: Sprint 8 planning.*
3. **Vendor fallback drill** — quarterly, simulate top-3 vendor outages. *Owner: Hawkeye + Tony. By: end of Q3.*

## Decisions made
- Mailer retry policy updated (NFR-01-1).
- Risk profile revised: R-1 mitigation now confirmed.

## Notes for next sprint
- Carry zero stories; everyone starts S8 fresh.
- Stretch goal in S8: catch up on REV-01 (copy fix from S7).
```

## Anti-patterns Wizer rejects (politely)

- **A retro without a change.** Then it was venting.
- **"We need to communicate better."** Specific or it doesn't count.
- **Adopting > 3 changes.** None will land.
- **No owner / no deadline.** Hopes, not plans.
- **Skipping the retro to "save time."** The next sprint costs more.

## Hand-off

> Retro at `.wize/implementation/retrospective/2026-06-25.md`. 3 changes; owners assigned. Sprint 8 planning anchors on them. Hawkeye, please update `risk-profile.md` with the R-1 mitigation confirmed.
