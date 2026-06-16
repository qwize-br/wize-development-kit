---
gate: design
story_id: E06-S01
ac_ids: [AC-E06-1]
status: ready-for-dev
created_at: 2026-06-17T00:00:00Z
test_split:
  unit: { count: 3, description: "skill file exists; frontmatter complete; 4 hunt areas documented" }
  integration: { count: 1, description: "module.yaml picks up via discovery walker" }
  e2e: { count: 0 }
fixtures:
  - "tmp project with PR diff"
  - "tmp project with single file"
  - "tmp project with story reference"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "scope > 500 LOC (too broad)"
  - "code has no diff (full file)"
  - "story missing"
---

# TEA Design — E06-S01

## Per-AC assertion shapes

- **AC-E06-1:** `src/core-skills/wize-review-edge-case-hunter/skill.md` exists with frontmatter `status: ready`, `module: core`, and `name: wize-review-edge-case-hunter`; documents 4 sections (Scope, Hunt, Rank, Hand-off) covering 4 areas (input, state, time/race, integration).

## Edge cases

- E1: Scope > 500 LOC → skill suggests slicing first and exits.
- E2: No diff provided → skill reads the full file as the change; flags broader scope.
- E3: Story missing → skill runs without story context (edge cases per code only).

## Run plan

- Unit on every PR.
