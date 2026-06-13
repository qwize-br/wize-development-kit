---
gate: design
story_id: E02-S01
ac_ids: [AC-E02-1]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 3, description: "templates exist, have frontmatter, contain placeholders" }
  integration: { count: 0 }
  e2e: { count: 0 }
fixtures:
  - "src/method-skills/1-analysis/wize-document-project/templates/*.md"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "template files are non-empty"
  - "template files include status: baseline frontmatter"
---

# TEA Design — E02-S01

## Per-AC assertion shapes

- **AC-E02-1**: `index-template.md` exists with Wize frontmatter and `{{project_name}}` placeholder.
- **AC-E02-1**: `project-overview-template.md` exists with frontmatter and `{{project_type}}` placeholder.
- **AC-E02-1**: `source-tree-template.md` exists with frontmatter and `{{complete_source_tree}}` placeholder.

## Edge cases

- E1: Missing template causes test failure.

## Run plan

- Unit tests on every PR.
