---
gate: design
story_id: E01-S03
ac_ids: [AC-E01-3]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 10, description: "statePath, initState, loadState missing/invalid, updateState merge, archiveOldState, stateAgeDays" }
  integration: { count: 0 }
  e2e: { count: 0 }
fixtures:
  - "temporary project roots with .wize/knowledge/document-project"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "state file older than 24h triggers archive"
  - "invalid JSON returns null instead of throwing"
  - "updateState array merge appends rather than replaces"
---

# TEA Design — E01-S03

## Per-AC assertion shapes

- **AC-E01-3**: `statePath(root)` ends with `.wize/knowledge/document-project/project-scan-report.json`.
- **AC-E01-3**: `initState(root, 'initial_scan', 'deep')` writes a valid JSON file matching the schema.
- **AC-E01-3**: `loadState(root)` reads the state and returns the same mode/scan_level.
- **AC-E01-3**: `loadState(root)` returns `null` when file is missing or malformed.
- **AC-E01-3**: `updateState(root, patch)` merges patch arrays/objects and writes updated file.
- **AC-E01-3**: `archiveOldState(root)` moves existing file to `_archive/` and removes active file.
- **AC-E01-3**: `archiveOldState(root)` returns `false` when no state exists.
- **AC-E01-3**: `stateAgeDays` returns `1` for a state 25h old and `null` for invalid input.

## Edge cases

- E1: State file created yesterday is archived before new scan.
- E2: Patch with array values appends to existing arrays.
- E3: Patch with object values shallow-merges.

## Run plan

- Unit tests on every PR.
