---
code: wize-sprint-status
name: Sprint Status
phase: 4-implementation
owner: wize-agent-pm   # Maria Hill
status: ready
---

# Sprint Status

**Goal.** Keep a snapshot of in-flight work that the team and stakeholders can read in 60 seconds. Sprint status is read by everyone, written by Hill (or delegated to Wizer); the source of truth is the file, not Slack.

Update **daily** during a sprint, or after any state change (story moves, blocker appears, gate fails).

## Inputs

- `.wize/solutioning/stories/` (current statuses)
- `.wize/implementation/tea/{epic}/{story}/gate.md` (gate outcomes)
- The team (verbal stand-up or async update)

## Output

- Updated entry in `.wize/implementation/sprint-status.md`.

## Steps

### 1. Per story, name a status

| Status | Meaning |
|---|---|
| `pulled` | Committed for this sprint, not started yet |
| `in-progress` | Engineer actively working it (or paused < 1 day) |
| `paused` | Started, paused > 1 day, reason listed |
| `blocked` | Cannot proceed; depends on a named external resolution |
| `in-review` | PR open; Hawkeye running design → trace → review |
| `gate-PASS` / `gate-CONCERNS` / `gate-FAIL` | TEA gate outcome |
| `shipped` | Merged to main + deployed (when applicable) |

### 2. Blockers up front

Blockers always appear in the top section. Each gets:
- Owner (the person who can unblock it).
- Specific ask (the action they should take).
- Deadline.

If a blocker sits longer than 2 days, Hill escalates. Stalled blockers are how sprints fail silently.

### 3. Trend

Daily, write a one-line trend: *"On track."* / *"At risk for E03-S02 due to vendor outage."* / *"Slipping; will defer E04-S01 to next sprint."*

### 4. Capture decisions

If something material was decided during the sprint that affects the plan (story sliced, scope dropped, ADR opened), append a one-line entry.

## File template

```markdown
# Sprint status

## Sprint 7 — 2026-06-12 → 2026-06-25

### Day 4 (2026-06-15)
**Trend:** On track.

**Blockers:**
- (none)

**Stories:**
- E01-S05 — gate-PASS — shipped (carry-over from S6).
- E01-S06 — in-progress — Shuri.
- E02-S02 — in-review — PR #418; Hawkeye doing trace.
- E03-S02 — in-progress — Aaliyah.
- E04-S01 — pulled — Shuri starts after E01-S06.
- E02-S03 (stretch) — pulled — Aaliyah picks up if capacity allows.

**Decisions:**
- E03-S03 sliced into two stories (E03-S03a, E03-S03b) — ADR-009 incoming.

### Day 5 (2026-06-16)
**Trend:** At risk on E02-S02 (vendor sandbox down; Hawkeye unblocked at 14:00).
**Blockers:** Resolved.
**Stories:** (changes from Day 4)
- E02-S02 — gate-PASS at 16:30; merged.
- E01-S06 — in-review — PR #419.

## Sprint 6 — 2026-05-29 → 2026-06-11
{{archived}}
```

## Daily cadence (lean)

A daily standup, when present, is 5 minutes max:

- "What did I ship since last time?"
- "What am I shipping next?"
- "Anything blocking me?"

Hill updates `sprint-status.md` immediately after; Wizer reads it before any other agent's session that day.

## Anti-patterns Hill rejects

- "Status: in progress" for 4 days with no further detail. Either it really is, in which case slice progress, or it's stuck.
- Blockers without an owner or a deadline.
- Sprint goals that drift silently (added stories without removing others).
- Stale entries in the file. Update daily or delegate the update.

## Hand-off

> `sprint-status.md` updated. Day 5 trend: at-risk-mitigated. Wizer, if asked about state, the file is the answer. Pepper, brief stays valid; no scope move triggered.
