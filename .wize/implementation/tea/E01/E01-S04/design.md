---
gate: design
story_id: E01-S04
ac_ids: [AC-E01-4]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 3, description: "quick mode writes 6 baseline files; idempotency; no source reading" }
  integration: { count: 1, description: "cmdDocumentProject quick produces baseline through CLI" }
  e2e: { count: 0 }
fixtures:
  - "temporary project root with package.json"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "missing package.json uses directory name as project name"
  - "re-running quick updates last_refreshed"
  - "quick mode does not read src files for content"
---

# TEA Design — E01-S04

## Per-AC assertion shapes

- **AC-E01-4**: `runQuick(root)` writes `overview.md`, `architecture-snapshot.md`, `conventions.md`, `dependencies.md`, `risk-spots.md`, `open-questions.md`.
- **AC-E01-4**: Re-running `runQuick(root)` overwrites files with updated `last_refreshed` and no duplicate content.
- **AC-E01-4**: `runQuick(root)` does not scan source file contents beyond package.json.
- **AC-E01-4**: `cmdDocumentProject({ args: [] })` delegates to quick mode and returns `{ changed: true }`.

## Edge cases

- E1: Project root without `package.json` still produces files.
- E2: Re-run updates only the date, preserves structure.

## Run plan

- Unit + integration on every PR.
