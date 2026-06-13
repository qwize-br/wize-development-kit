---
gate: design
story_id: E01-S05
ac_ids: [AC-E01-5]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 2, description: "runInitialScan quick and deep scan levels" }
  integration: { count: 2, description: "CLI dispatcher for initial_scan with deep level; state contains batch results" }
  e2e: { count: 0 }
fixtures:
  - "temporary project root with package.json and .wize/config/project.toml"
  - "temporary src/ folder with one JS file for deep scan"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "quick initial scan writes only baseline + index, no batches"
  - "deep initial scan records batches_completed in state"
  - "multi-part repo generates per-part docs (deferred to E01-S06/E01-S08)"
---

# TEA Design — E01-S05

## Per-AC assertion shapes

- **AC-E01-5**: `runInitialScan(root, { scanLevel: 'quick' })` writes baseline files + `index.md`.
- **AC-E01-5**: `runInitialScan(root, { scanLevel: 'deep' })` writes baseline + `index.md` and records `findings.batches_completed` in state.
- **AC-E01-5**: `cmdDocumentProject({ args: ['initial_scan', 'deep'] })` returns `{ ok: true, mode: 'initial_scan' }` and writes `index.md`.
- **AC-E01-5**: `parseMode(['initial_scan', 'deep'])` extracts `scanLevel: 'deep'`.

## Edge cases

- E1: `initial_scan` without scan level defaults to quick.
- E2: Deep scan on empty project still produces empty batches array.

## Run plan

- Unit + integration on every PR.
