---
gate: design
story_id: E03-S04
ac_ids: [AC-E03-4]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 1, description: "workflow.md mentions documentation gaps and has required sections" }
  integration: { count: 0 }
  e2e: { count: 0 }
fixtures:
  - "src/tea-skills/wize-tea-risk/workflow.md"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "workflow structural tests pass"
  - "documentation gap findings reference index.md and baseline age"
---

# TEA Design — E03-S04

## Per-AC assertion shapes

- **AC-E03-4**: `wize-tea-risk/workflow.md` mentions documentation gaps as a risk category.
- **AC-E03-4**: Workflow raises findings when `index.md` contains `_(To be generated)_` markers.
- **AC-E03-4**: Workflow raises findings when baseline files are older than 60 days.
- **AC-E03-4**: Severity is `medium` for gaps, `high` if no baseline exists in brownfield repo.

## Edge cases

- E1: No baseline in greenfield repo is not a finding.

## Run plan

- Structural tests on every PR.
