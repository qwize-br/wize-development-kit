# TEA Gate Decision

> gate: TEA Gate Decision

# TEA — Gate Decision

**Goal.** Final per-story decision. **PASS / CONCERNS / FAIL / WAIVED** with documented rationale, score, and policy mode. This is the line: a story doesn't advance past it without a recorded gate.

Hawkeye drives. The four inputs (`design`, `trace`, `review`, plus `nfr` at epic boundary) feed in. Policy is read from `.wize/config/tea.toml`.

## Inputs

- `.wize/implementation/tea/{epic}/{story}/design.md`
- `.wize/implementation/tea/{epic}/{story}/trace.md`
- `.wize/implementation/tea/{epic}/{story}/review.md`
- `.wize/implementation/tea/nfr/{epic}.md` (when the story is the last of its epic)
- `.wize/config/tea.toml`

## Output

- `.wize/implementation/tea/{epic}/{story}/gate.md`

## Decision rules

| Inputs | Recommendation |
|---|---|
| All ACs `met`, no findings | **PASS** |
| All ACs `met`, only low/medium non-blocking findings | **PASS** with notes (or **CONCERNS** depending on count) |
| Any AC `partial` | **CONCERNS** |
| Any AC `not-met` | **FAIL** |
| NFR `FAIL` on the epic (last story) | **FAIL** |
| `tea-review` flagged `knowledge_axes_touched` ≠ `knowledge_axes_updated` (any axis touched without update) | **CONCERNS** (advisory mode) / **FAIL** (enforcing mode) — adds finding `KN-NN` |
| Failing AC OR non-neg NFR with documented business rationale + senior signoff | **WAIVED** |

Score (0–100): heuristic. `100 - (10 × high) - (5 × medium) - (2 × low)`. Floor 0.

## Policy

`.wize/config/tea.toml` sets `policy = "advisory"` (default) or `"enforcing"`.

- **Advisory:** `FAIL` is a visible warning in PR; merge isn't auto-blocked. The team decides.
- **Enforcing:** `FAIL` blocks merge via CI status check (`tea-gate`). PASS / CONCERNS allowed through.

## Steps

### 1. Read the three inputs

If trace shows `partial`, you know the recommendation. If review recommends FAIL, you've got your decision. The gate doc just records it.

### 2. Compute score

Don't game it. The score communicates magnitude to humans skimming a backlog.

### 3. Write the doc

Frontmatter is the structured truth. The body is the narrative for humans.

### 4. Notify

Update the PR description with the gate verdict + link to the doc. Maria Hill watches the gate status in `sprint-status.md`.

## YAML frontmatter (canonical)

```yaml
---
gate: gate
story_id: E01-S03
status: PASS
score: 95
policy: advisory
inputs:
  design: ".wize/implementation/tea/E01-S03/design.md"
  trace:  ".wize/implementation/tea/E01-S03/trace.md"
  review: ".wize/implementation/tea/E01-S03/review.md"
  nfr:    null   # not the last story of E01
findings:
  - id: REV-01
    severity: low
    summary: "Empty-state copy slightly differs from Mantis' spec."
    recommendation: "Update `<EmptyTeamPanel>` heading in a follow-up."
  - id: KN-01
    severity: medium
    summary: "Story added a new component (`<InviteForm>`) but architecture-snapshot.md was not updated."
    recommendation: "Add 2 lines to `.wize/knowledge/document-project/architecture-snapshot.md` under a dated bullet referencing the new component + its public testid contract."
    owner: shuri
    blocking: false   # advisory mode; would be true under enforcing
waived_by: null
waived_reason: null
created_at: 2026-06-11T20:30:00Z
---
```

## Body of `gate.md`

```markdown
## Verdict
**PASS** (score 95)

## Why
- All ACs met with observed evidence.
- Trace clean; coverage 100% on ACs, partial on edges (E3, E4) — tracked for follow-up.
- Review found one low-severity copy finding (REV-01).
- Story is not the last in epic 01; NFR gate runs separately at epic boundary.

## Notes for follow-up
- Open a tiny story (or include in next sprint planning) to fix REV-01 and close edges E3, E4.

## Trail
- design.md → 4/1/1 split (unit/integration/e2e) + 4 edges declared.
- trace.md → all ACs `covered`; E3 `partial`, E4 `missing` (follow-up).
- review.md → ACs `met`, scope mostly disciplined, copy nit.
- nfr.md → N/A (mid-epic).
```

## When to WAIVE

Rare. Examples:
- A failing E2E that depends on a flaky external sandbox; the production code is unaffected; sign-off by Tony + Hill.
- A non-negotiable temporarily slipped because of an external integration blocker; we ship with mitigation in place; sign-off by Fury.

A WAIVE always lists:
- Who waived (`waived_by`).
- Why (`waived_reason`).
- The compensating control (a follow-up story, an SLA monitor, a feature flag).

## Anti-patterns Hawkeye rejects

- **Gating without `review.md`.** No review → no gate.
- **PASS with a `not-met` AC.** Auto-fail.
- **WAIVED with no `waived_by` field.** Reject.
- **Scoring jiggered to clear a threshold.** Trust trumps point-scoring; if the count says 70, don't write 91.
- **Enforcing mode gates without CI check wiring.** Ghost gate; remove or wire it.

## Hand-off

> Gate for E01-S03: **PASS** (score 95). One low-severity finding logged for follow-up. Maria Hill, sprint-status updated; Shuri, ready to start the next story.
