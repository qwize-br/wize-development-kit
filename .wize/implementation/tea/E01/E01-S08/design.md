---
gate: design
story_id: E01-S08
ac_ids: [AC-E01-8]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 5, description: "renderIndex single-part, multi-part, marker removal, deep-dive links, existing docs section" }
  integration: { count: 1, description: "index.md produced by initial_scan" }
  e2e: { count: 0 }
fixtures:
  - "temporary project root"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "missing conditional doc shows To be generated marker"
  - "generated conditional doc removes marker"
  - "multi-part repo lists per-part docs"
---

# TEA Design — E01-S08

## Per-AC assertion shapes

- **AC-E01-8**: `renderIndex(root, { projectTypes: ['web'] })` writes `index.md` with links to overview, architecture (marked), component inventory (marked), etc.
- **AC-E01-8**: `renderIndex(root, { generated: ['architecture.md'] })` writes architecture link without marker.
- **AC-E01-8**: `renderIndex(root, { parts: [...] })` writes per-part sections for multi-part repo.
- **AC-E01-8**: `renderIndex(root, { existing: ['/abs/README.md'] })` includes Existing Documentation section.
- **AC-E01-8**: `renderIndex(root, { deepDiveFiles: ['deep-dive-lib.md'] })` includes Deep-Dive Docs section.
- **AC-E01-8**: `runInitialScan(root)` produces `index.md`.

## Edge cases

- E1: Empty generated list marks every conditional doc.
- E2: Re-render overwrites previous index with updated markers.

## Run plan

- Unit + integration on every PR.
