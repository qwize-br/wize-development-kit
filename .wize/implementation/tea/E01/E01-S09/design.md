---
gate: design
story_id: E01-S09
ac_ids: [AC-E01-9]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 1, description: "workflow.md has non-stub body and valid frontmatter" }
  integration: { count: 0 }
  e2e: { count: 0 }
fixtures:
  - "src/method-skills/1-analysis/wize-document-project/workflow.md"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "frontmatter remains valid YAML"
  - "body length exceeds stub threshold"
---

# TEA Design — E01-S09

## Per-AC assertion shapes

- **AC-E01-9**: `workflow.md` contains CLI usage block with `quick`, `initial_scan`, `full_rescan`, `deep_dive`.
- **AC-E01-9**: `workflow.md` contains Modes table with scan levels.
- **AC-E01-9**: `workflow.md` lists `project-scan-report.json` and `index.md` in Outputs.
- **AC-E01-9**: Existing structural tests pass (`workflow-bodies.test.js`).

## Edge cases

- E1: Frontmatter `code` and `status` remain unchanged.

## Run plan

- Structural tests on every PR.
