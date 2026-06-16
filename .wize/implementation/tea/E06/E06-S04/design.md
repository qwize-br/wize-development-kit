---
gate: design
story_id: E06-S04
ac_ids: [AC-E06-5, AC-E06-6]
status: ready-for-dev
created_at: 2026-06-17T00:00:00Z
test_split:
  unit: { count: 3, description: "skill file exists; frontmatter complete; customize.toml template documented" }
  integration: { count: 1, description: "module.yaml picks up via discovery walker" }
  e2e: { count: 0 }
fixtures:
  - "tmp project with built-in agent"
  - "tmp project with existing customize.toml"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "code does not exist in built-in roster"
  - "override already exists"
  - "tools field syntax invalid"
---

# TEA Design — E06-S04

## Per-AC assertion shapes

- **AC-E06-5:** `src/core-skills/wize-customize/skill.md` exists with frontmatter `status: ready`, `module: core`, and `name: wize-customize`.
- **AC-E06-6:** Skill file documents 6 sections (Identify, Inspect, Ask, Generate, Re-sync, Hand-off) and the customize.toml template.

## Edge cases

- E1: Code does not exist in built-in roster → skill suggests `wize-create-agent` and exits.
- E2: Override already exists → skill reads and merges, never overwrites without confirmation.
- E3: Tools field syntax invalid → skill validates against the known tool list.

## Run plan

- Unit on every PR.
