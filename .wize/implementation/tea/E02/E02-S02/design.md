---
gate: design
story_id: E02-S02
ac_ids: [AC-E02-2]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 3, description: "architecture, component-inventory, development-guide templates exist and have required sections" }
  integration: { count: 0 }
  e2e: { count: 0 }
fixtures:
  - "src/method-skills/1-analysis/wize-document-project/templates/*.md"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "templates support single-part and per-part suffix naming via placeholders"
  - "component inventory includes categorization and design system sections"
---

# TEA Design — E02-S02

## Per-AC assertion shapes

- **AC-E02-2**: `architecture-template.md` exists with sections for entry points, components, integrations, data flow.
- **AC-E02-2**: `component-inventory-template.md` exists with sections for categorization, reuse, and design system.
- **AC-E02-2**: `development-guide-template.md` exists with sections for setup, dev workflow, testing, conventions.

## Edge cases

- E1: Template is empty.
- E2: Required section heading is missing.

## Run plan

- Unit tests on every PR.
