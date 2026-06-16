---
gate: design
story_id: E05-S01
ac_ids: [AC-E05-1, AC-E05-2]
status: ready-for-dev
created_at: 2026-06-16T00:00:00Z
test_split:
  unit: { count: 3, description: "workflow file exists; frontmatter complete; 5 sections present" }
  integration: { count: 1, description: "module.yaml picks up via discovery walker" }
  e2e: { count: 0 }
fixtures:
  - "tmp project with all 6 source artifacts present"
  - "tmp project with only brief and prd"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "no artifacts at all (greenfield)"
  - "ADR folder empty"
  - "risk-profile.md missing"
---

# TEA Design — E05-S01

## Per-AC assertion shapes

- **AC-E05-1:** `src/method-skills/3-solutioning/wize-project-context/workflow.md` exists with frontmatter `status: ready`.
- **AC-E05-2:** Workflow file documents 5 sections (Vision, Audience, Tech stack, Key ADRs, Active risks) and an output path of `.wize/knowledge/project-context.md`.

## Edge cases

- E1: None of the 6 source artifacts exist → workflow exits with a one-line error pointing to `/wize-product-brief` first.
- E2: ADR folder empty → workflow writes 0 ADRs in that section, leaves the heading.
- E3: `risk-profile.md` missing → workflow writes "no risk profile yet" in the risks section.

## Run plan

- Unit + integration on every PR.
