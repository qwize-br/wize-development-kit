---
description: "4-implementation: Sprint Planning"
---

# Sprint Planning

# Sprint Planning

**Goal.** Pick what enters this sprint. Capacity-honest, priority-honest, risk-honest. The sprint is a commitment about a small slice of the future, not a wish list.

Maria Hill chairs. Tony advises on slicing. Hawkeye flags risk on stories. Shuri commits to the load.

## Inputs

- Story backlog: `.wize/solutioning/stories/`
- Velocity history: `.wize/implementation/sprint-status.md` (previous sprints) — when present.
- `.wize/implementation/tea/risk-profile.md`
- Open `tea-gate` outcomes from last sprint.
- Team availability for the next interval (vacations, on-call rotation, planned meetings).

## Output

- New sprint block appended to `.wize/implementation/sprint-status.md`.
- Story files updated `priority: 1` for chosen stories.

## Rules

1. **Capacity = min(history velocity, declared availability).** Not the average of optimistic estimates.
2. **High-risk stories** (linked to `R-x` HIGH in risk profile) get TEA design done in the planning meeting, not at story start.
3. **Stretch goals** are explicit, named, not silent. If a stretch ships, great. If not, the sprint isn't a failure.
4. **Don't carry over without reason.** A carried-over story gets a one-line "why" in the sprint log.

## Steps

### 1. Look back (3 min)

Last sprint: what shipped, what slipped, what surprised. Don't relitigate; observe.

### 2. Refresh capacity

- Person-days available this sprint = sum(working days) × (1 - meetings load).
- Subtract on-call burden, oncall handoff time, planned reviews.

### 3. Pull stories (in priority order)

Default selection algorithm:
- Always pull continuation stories (in-flight from last sprint) first.
- Then highest-priority stories that fit the capacity.
- Then risk-driven: high-risk stories (R-HIGH) preferred over more low-risk ones when capacity is tight.

For each pulled story, confirm INVEST still holds; re-slice if needed.

### 4. Reserve buffer

10–15% buffer for unknowns (bug fixes, support escalations). Don't fill the sprint to 100% — you'll always pay.

### 5. Walk the gate plan

For each story pulled, what's the TEA gate cadence? Most stories: design at start, trace + review + gate at end. High-risk: include NFR re-check at epic close.

### 6. Commit (verbal + written)

Each engineer reads back the stories they're owning. Hill writes them into the sprint block. Sprint starts.

## Sprint block template (appended to `sprint-status.md`)

```markdown
## Sprint 7 — 2026-06-12 → 2026-06-25

**Capacity:** 24 person-days (3 engineers × 10 days × 0.8 utilization)
**Carry-over:** E01-S05 (90% done; Shuri); E03-S01 (TEA review pending)
**Pulled:**
- E01-S06 — M — owner: Shuri — gate cadence: design+gate
- E02-S02 — L — owner: Shuri — gate cadence: design+trace+review+gate (R-3)
- E03-S02 — M — owner: Aaliyah — gate cadence: design+trace+review+gate (R-1)
- E04-S01 — S — owner: Shuri — gate cadence: smoke (quick-dev pattern)
- E02-S03 — S — stretch

**Out (deferred to Sprint 8):**
- E03-S03 — reason: depends on E03-S02 ADR
- E05-S01 — reason: out of NFR-cost budget; revisit

**Risks flagged:**
- E02-S02 — auth refresh story; high-risk; TEA design done at planning.
```

## Anti-patterns Hill rejects

- **"Optimistic" velocity that ignores history.** Use observed velocity.
- **Stories pulled without owners.** Don't aspire; commit.
- **Stretch goals so big they're really plan.** Stretch = optional, not "we hope we can."
- **Pulling a story when its dependency hasn't shipped.** It will sit blocked.
- **No buffer.** Real sprints have surprises.

## Hand-off

> Sprint 7 committed at `.wize/implementation/sprint-status.md`. Shuri owns most; Aaliyah picks up E03-S02. Hawkeye, NFR gate due on E03 at sprint end. Wizer, retro on the 25th.
