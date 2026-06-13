---
gate: design
story_id: E01-S06
ac_ids: [AC-E01-6]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 4, description: "batchScanner skips noise dirs, batches by subfolder, flags large files, full_rescan archives old state" }
  integration: { count: 1, description: "full_rescan via CLI archives state and produces new report" }
  e2e: { count: 0 }
fixtures:
  - "temporary project root with nested src/, node_modules/, .git/"
  - "file larger than MAX_FILE_LOC"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "empty directory returns zero batches"
  - "file exactly at MAX_FILE_LOC is not flagged"
  - "custom ignore patterns are respected"
---

# TEA Design — E01-S06

## Per-AC assertion shapes

- **AC-E01-6**: `batchScanner(root)` returns one result per immediate subfolder, ignoring `node_modules`, `.git`, `dist`, `build`, `coverage`.
- **AC-E01-6**: Files larger than `MAX_FILE_LOC` have `skipped: true` and `loc` capped at `MAX_FILE_LOC`.
- **AC-E01-6**: `runFullRescan(root)` archives previous `project-scan-report.json` to `_archive/` and re-runs `initial_scan`.
- **AC-E01-6**: `cmdDocumentProject({ args: ['full_rescan', 'quick'] })` archives and returns a fresh report.

## Edge cases

- E1: Root with only ignored directories returns empty array.
- E2: File at exactly 5000 LOC is not flagged as skipped.
- E3: Custom ignore list prevents scanning a named directory.

## Run plan

- Unit + integration on every PR.
