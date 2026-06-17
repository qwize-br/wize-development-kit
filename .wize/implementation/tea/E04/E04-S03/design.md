---
gate: design
story_id: E04-S03
ac_ids: [AC-E04-6, AC-E04-7]
status: ready-for-dev
created_at: 2026-06-15T00:00:00Z
test_split:
  unit: { count: 3, description: "workflow file exists; frontmatter complete; 4 edit types documented" }
  integration: { count: 1, description: "module.yaml picks up via discovery walker" }
  e2e: { count: 0 }
fixtures:
  - "tmp project with valid PRD"
  - "tmp project with prd-changelog.md"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "PRD missing"
  - "edit touches > 25% of PRD"
  - "changelog already has rows"
---

# TEA Design — E04-S03

## Per-AC assertion shapes

- **AC-E04-6:** `src/method-skills/2-plan-workflows/wize-edit-prd/workflow.md` exists with frontmatter `status: ready`.
- **AC-E04-7:** Workflow file documents 4 edit types (A: AC, B: scope, C: non-goal, D: decision) and includes the changelog template.

## Edge cases

- E1: `prd.md` missing → workflow exits with one-line error pointing the user to `/wize-create-prd`.
- E2: Edit touches > 25% of PRD → workflow routes to `/wize-create-prd` instead.
- E3: Changelog already has rows → append without overwriting.

## Run plan

- Unit on every PR.
