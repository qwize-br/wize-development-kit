---
code: wize-review-edge-case-hunter
name: Edge Case Hunter
module: core
status: ready
subtask: true
---

# Edge Case Hunter

**Goal.** Focused edge-case pass on a code change. Returns a structured list of edge cases, ranked by likelihood × impact, with a hand-off to test or guard each one.

Shuri runs the hunt. Hawkeye on call for test design. Wizer on call for cross-cutting risk.

## When to use

- "Hunt edge cases in this PR."
- "What can break in this code?"
- "Give me the edge case list before I refactor."

## When NOT to use

- Full adversarial code review → use `wize-code-review`.
- Generate E2E test cases → use `wize-qa-generate-e2e-tests`.
- Quick-dev fix → use `wize-quick-dev`.

## Inputs

- A code change (diff, file, or story reference).
- A short scope statement (one sentence: what is this code trying to do?).
- Optional: the relevant story file (`.wize/solutioning/stories/{epic}/{story}.md`).

## Output

- A markdown list of edge cases, grouped by category, with line-level `file:line` references when possible.
- Suggested action per case: write a test, add a guard, accept, or defer.

## Steps

### 1. Scope

Read the change + the one-line scope statement. Confirm the boundary: what is in scope (changed code) and what is not (existing dependencies, framework). Reject if the scope is too broad (> 500 LOC); suggest slicing first.

### 2. Hunt (per area)

Walk 4 areas in order:

- **Input edges.** Empty, null, unicode, max length, malformed, wrong type, wrong encoding. Boundary values (0, 1, max, max+1).
- **State edges.** Concurrent writes, stale reads, missing state, mixed state (some fields set, others not), partial failure.
- **Time / race.** Timeouts, retries, clock skew, ordering, idempotency.
- **Integration edges.** Vendor down, slow vendor, malformed vendor response, network partition, version skew.

For each area, list specific cases in 1 line each. Cite `file:line` when relevant.

### 3. Rank

For each case, score:

- **Likelihood** (low / medium / high): probability of triggering.
- **Impact** (low / medium / high): what happens when it triggers.

Order cases by `(likelihood + impact)`. The top 5 are P0; the rest P1/P2.

### 4. Hand off

For each P0 case, propose an action:

- **Test** → the user adds a test.
- **Guard** → the user adds input validation or a defensive check.
- **Accept** → the user documents the risk and moves on.
- **Defer** → the user opens a follow-up story.

Output is a markdown table. The user picks what to apply.

## Output template

```markdown
---
date: 2026-06-17
scope: "Refactor of validateInviteEmail — split into 3 helpers"
author: Shuri
---

# Edge cases — {scope}

## Top 5 (P0)

| # | Case | Likelihood | Impact | Action | Location |
|---|---|---|---|---|---|
| 1 | Empty email string | high | medium | test | src/validate.ts:42 |
| 2 | Email with leading/trailing whitespace | high | low | guard | src/validate.ts:55 |
| 3 | Email with internationalized TLD (e.g. .中国) | medium | medium | test | src/validate.ts:48 |
| 4 | Email longer than 254 chars | low | medium | guard | src/validate.ts:48 |
| 5 | Null vs undefined | high | low | test | src/validate.ts:33 |

## Other (P1/P2)

- Unicode normalization mismatch — P1 — test
- Two plus signs in local part — P2 — accept
- Trailing dot in domain — P2 — defer (open E06-S05)
```

## Anti-patterns Shuri rejects

- Listing 50 cases per area. (Top 5 P0; cap at 15 total.)
- Auto-fixing (hunt, don't fix).
- Skipping the rank step. (Without rank, the user cannot prioritize.)
- Skipping the action per case. (An edge case without an action is just noise.)
- Hunting only one area (e.g., only input). (All 4 areas.)

## Hand-off

> "Edge case hunt complete. {N} cases ranked. P0: {M}. Next: implement P0 (Shuri) or open follow-up stories (Hill)."
