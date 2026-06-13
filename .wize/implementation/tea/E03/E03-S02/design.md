---
gate: design
story_id: E03-S02
ac_ids: [AC-E03-2]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 4, description: "doctor detects baseline age, scan report age, index markers, suggests refresh" }
  integration: { count: 1, description: "cmdDoctor returns knowledge status with markers and scan report age" }
  e2e: { count: 0 }
fixtures:
  - "temporary project root with .wize/knowledge/document-project"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "baseline >60d triggers refresh suggestion"
  - ">=5 To be generated markers trigger document-project suggestion"
  - "missing scan report is noted but not an error"
---

# TEA Design — E03-S02

## Per-AC assertion shapes

- **AC-E03-2**: `cmdDoctor` reports whether `.wize/knowledge/document-project/` exists.
- **AC-E03-2**: `cmdDoctor` reports `last_refreshed` age per baseline file.
- **AC-E03-2**: `cmdDoctor` reports presence and age of `project-scan-report.json`.
- **AC-E03-2**: `cmdDoctor` counts `_(To be generated)_` markers in `index.md`.
- **AC-E03-2**: If baseline >60 days old or ≥5 pending markers, suggestion to run `wize-document-project` or `wize-refresh-knowledge` appears.

## Edge cases

- E1: Missing `index.md` reports 0 markers.
- E2: Missing `project-scan-report.json` reports no scan state.

## Run plan

- Unit + integration on every PR.
