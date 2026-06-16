---
code: wize-correct-course
name: Correct Course
phase: 4-implementation
owner: wize-agent-pm   # Maria Hill, with wize-orchestrator
status: ready
---

# Correct Course

**Goal.** React when a sprint drifts. Detect the deviation, classify the cause, propose one of three corrective moves (cut scope, re-route, escalate), and update `sprint-status.yaml` after the user confirms.

Maria Hill chairs. Wizer is on call for cross-cutting decisions. The human always confirms the action.

## When to run

- `wize-sprint-status` flagged a risk: “slipping” or “at risk”.
- The team says "we won’t make it" during a stand-up.
- A story’s TEA gate came back as `FAIL` mid-sprint.
- An external event (incident, vendor outage) consumed capacity.

## Inputs

- `.wize/implementation/sprint-status.yaml`
- `.wize/implementation/tea/{epic}/{story}/gate.md` (when a gate failed)
- `.wize/knowledge/document-project/risk-spots.md` (for context on known risks)
- A free-form reason from the user: chat message, stand-up note, or incident link.

## Output

- Updated `.wize/implementation/sprint-status.yaml` (statuses changed, items deferred).
- One-line entry in `.wize/implementation/course-corrections.md` with date, cause, action, owner.

## Steps

### 1. Detect

Wizer pulls the latest status file. If `last_updated` is older than 2 days, the sprint is stale. Mark this as risk #0: stale signal.

### 2. Classify

Pick exactly one cause:

- **Cut scope.** Story is bigger than estimated, or a non-essential AC can be deferred.
- **Re-route.** Story needs a different agent (e.g., Mantis for UX) or skill (e.g., `wize-investigate` for a regression).
- **Escalate.** Story needs more hands, or a decision outside the team.

A sprint can have multiple causes; the workflow handles one per run. Re-run for additional causes.

### 3. Propose

For each cause, propose 1–3 specific actions. Each action is bounded: a story ID to move, a date to defer to, or a person to page. No vague "communicate more" — that’s not an action.

### 4. Confirm with the human

List the actions; the human picks which to apply. Apply only what the human approved.

### 5. Update the sprint

For each approved action:

- Change `sprint-status.yaml` statuses (e.g., story from `in-progress` → `backlog` if deferred).
- Append a row to `course-corrections.md` with `date`, `cause`, `action`, `owner`.

### 6. Hand off

Notify the next workflow that should run (usually `wize-sprint-status` to confirm the new state, or `wize-dev-story` to continue the remaining work).

## Output template — `course-corrections.md`

```markdown
# Course corrections

| Date | Sprint | Cause | Action | Owner |
|---|---|---|---|---|
| 2026-06-15 | 4 | cut scope | E04-S02 split into S02a + S02b; S02b deferred to S5 | Hill |
| 2026-06-15 | 4 | escalate | Paged Tony to unblock E04-S01 (waiting on ADR-010) | Wizer |
```

## Anti-patterns Hill rejects

- Cutting scope without confirming the trade-off with the user.
- Moving a story to `done` to "stop tracking it" when it isn’t actually done.
- Re-routing to an agent who doesn’t have the context (always include a 3-sentence brief).
- Escalating without naming a specific decision blocker.

## Hand-off

> "Course correction applied at `.wize/implementation/course-corrections.md`. Sprint {N} updated. Run `/wize-sprint-status` to confirm the new state."
