---
gate: design
story_id: E03-S03
ac_ids: [AC-E03-3]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 2, description: "installer prompts for document-project mode, non-TTY fallback to quick" }
  integration: { count: 1, description: "cmdInstall brownfield flow offers mode selection" }
  e2e: { count: 0 }
fixtures:
  - "temporary project root with package.json"
mocks:
  - "prompts library responses"
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "WIZE_SKIP_BASELINE=1 still skips documentation"
  - "non-TTY defaults to quick baseline"
  - "mode selection passes correct args to cmdDocumentProject"
---

# TEA Design — E03-S03

## Per-AC assertion shapes

- **AC-E03-3**: Brownfield install prompts user to choose: quick baseline (default), initial_scan, full_rescan, or skip.
- **AC-E03-3**: Non-TTY fallback defaults to quick baseline.
- **AC-E03-3**: `WIZE_SKIP_BASELINE=1` skips documentation entirely.
- **AC-E03-3**: Selected mode calls `cmdDocumentProject` with correct args.

## Edge cases

- E1: User selects skip → no baseline generated.
- E2: CI environment (non-TTY) still produces quick baseline.

## Run plan

- Unit + integration on every PR.
