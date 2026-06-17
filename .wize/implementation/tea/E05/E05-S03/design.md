---
gate: design
story_id: E05-S03
ac_ids: [AC-E05-4, AC-E05-5]
status: ready-for-dev
created_at: 2026-06-16T00:00:00Z
test_split:
  unit: { count: 3, description: "workflow file exists; frontmatter complete; 5 sections present" }
  integration: { count: 1, description: "module.yaml picks up via discovery walker" }
  e2e: { count: 0 }
fixtures:
  - "tmp project with failing test"
  - "tmp project with production incident"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "obvious cause (skip to quick-dev)"
  - "security finding (escalate immediately)"
  - "unreproducible after N attempts"
---

# TEA Design — E05-S03

## Per-AC assertion shapes

- **AC-E05-4:** `src/method-skills/4-implementation/wize-investigate/workflow.md` exists with frontmatter `status: ready`.
- **AC-E05-5:** Workflow file documents 5 sections (Frame, Reproduce, Hypothesize, Verify, Conclude) and an output path of `.wize/implementation/investigations/{date}-{slug}.md`.

## Edge cases

- E1: Obvious cause from diff → workflow recommends `/wize-quick-dev` and exits.
- E2: Security finding suspected → workflow prints a "ESCALATE" warning and routes to `/wize-correct-course` instead.
- E3: Unreproducible after 3 attempts → workflow records "not reproducible" and exits with no fix path.

## Run plan

- Unit on every PR.
