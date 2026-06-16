---
gate: design
story_id: E04-S02
ac_ids: [AC-E04-4, AC-E04-5]
status: ready-for-dev
created_at: 2026-06-15T00:00:00Z
test_split:
  unit: { count: 3, description: "workflow file exists; frontmatter complete; 5 sections present" }
  integration: { count: 1, description: "module.yaml picks up via discovery walker" }
  e2e: { count: 0 }
fixtures:
  - "tmp project with stale sprint-status.yaml"
  - "tmp project with FAIL gate"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "sprint-status.yaml missing"
  - "no FAIL gate but trend is at-risk"
  - "human declines all proposed actions"
---

# TEA Design — E04-S02

## Per-AC assertion shapes

- **AC-E04-4:** `src/method-skills/4-implementation/wize-correct-course/workflow.md` exists and frontmatter has `status: ready`.
- **AC-E04-5:** Workflow file has 5 sections matching the template (Detect, Classify, Propose, Confirm, Update) plus an Output template and a Hand-off.

## Edge cases

- E1: `sprint-status.yaml` missing → workflow exits with a one-line error pointing the user to `/wize-sprint-planning`.
- E2: No FAIL gate but trend is "at risk" → workflow still runs (correct-course handles any drift).
- E3: Human declines all actions → no changes applied; one log row records "no action taken".

## Run plan

- Unit on every PR.
