---
gate: design
story_id: E02-S06
ac_ids: [AC-E02-6]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 11, description: "each required template exists, is non-empty, has frontmatter, and contains expected sections" }
  integration: { count: 0 }
  e2e: { count: 0 }
fixtures:
  - "src/method-skills/1-analysis/wize-document-project/templates/*.md"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "renamed or missing template fails test"
  - "removed required section fails test"
---

# TEA Design — E02-S06

## Per-AC assertion shapes

- **AC-E02-6**: Required templates exist: index, project-overview, source-tree-analysis, architecture, component-inventory, development-guide, api-contracts, data-models, deployment-guide, contribution-guide, deep-dive.
- **AC-E02-6**: Every template is non-empty and has valid frontmatter (`status: baseline`, `owner`, `created`, `last_refreshed`).
- **AC-E02-6**: Each template contains expected section headings.

## Edge cases

- E1: Template renamed → test fails with missing file.
- E2: Required section removed → test fails.

## Run plan

- Unit tests on every PR.
