---
gate: design
story_id: E06-S02
ac_ids: [AC-E06-2]
status: ready-for-dev
created_at: 2026-06-17T00:00:00Z
test_split:
  unit: { count: 3, description: "skill file exists; frontmatter complete; 5 sections documented" }
  integration: { count: 1, description: "module.yaml picks up via discovery walker" }
  e2e: { count: 0 }
fixtures:
  - "tmp project with full .wize tree"
  - "tmp project with empty sections"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "section has 0 files"
  - "file has no frontmatter and no H1"
  - "deeply nested subfolder (deeper than expected)"
---

# TEA Design — E06-S02

## Per-AC assertion shapes

- **AC-E06-2:** `src/core-skills/wize-index-docs/skill.md` exists with frontmatter `status: ready`, `module: core`, and `name: wize-index-docs`; documents 4 sections (Scan, Group, Write, Hand-off) and an output path of `.wize/knowledge/index.md` with 5 group sections.

## Edge cases

- E1: Section has 0 files → skill omits the heading (no empty H2).
- E2: File has no frontmatter and no H1 → skill uses the kebab-case file name as title.
- E3: Deeply nested subfolder → skill flattens into the parent section.

## Run plan

- Unit on every PR.
