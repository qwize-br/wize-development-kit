---
gate: design
story_id: E05-S02
ac_ids: [AC-E05-3]
status: ready-for-dev
created_at: 2026-06-16T00:00:00Z
test_split:
  unit: { count: 3, description: "workflow file exists; frontmatter complete; 4 sections present" }
  integration: { count: 1, description: "module.yaml picks up via discovery walker" }
  e2e: { count: 0 }
fixtures:
  - "tmp project with in-progress story"
  - "tmp project with completed story"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "no in-progress story"
  - "multiple pivots in one checkpoint"
  - "story is < 50% done (anti-pattern)"
---

# TEA Design — E05-S02

## Per-AC assertion shapes

- **AC-E05-3:** `src/method-skills/4-implementation/wize-checkpoint-preview/workflow.md` exists with frontmatter `status: ready` and documents 4 sections (Pause, Snapshot, Sanity check, Decide) plus the output path.

## Edge cases

- E1: No in-progress story → workflow prints a warning and exits; the user must start a story first.
- E2: Multiple pivots attempted in one run → workflow keeps the first and prints a warning.
- E3: Story < 50% done with no surprise → workflow recommends skipping the checkpoint (still records the snapshot).

## Run plan

- Unit on every PR.
