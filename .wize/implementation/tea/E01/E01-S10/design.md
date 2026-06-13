---
gate: design
story_id: E01-S10
ac_ids: [AC-E01-10]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 50, description: "aggregate across document-project-* test files" }
  integration: { count: 0 }
  e2e: { count: 0 }
fixtures:
  - "temporary project roots"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "full npm test passes with new tests"
  - "no test leaks temp directories"
---

# TEA Design — E01-S10

## Per-AC assertion shapes

- **AC-E01-10**: `test/document-project-cli.test.js` covers CLI dispatcher routing.
- **AC-E01-10**: `test/document-project-classify.test.js` covers CSV loading and classifier.
- **AC-E01-10**: `test/document-project-state.test.js` covers state file init/load/update/archive.
- **AC-E01-10**: `test/document-project-cli.test.js` + `test/document-project-integration.test.js` cover quick mode idempotency and output.
- **AC-E01-10**: `test/document-project-integration.test.js` covers initial_scan conditional docs.
- **AC-E01-10**: `test/document-project-batch-scanner.test.js` covers batch scanner ignore/batching.
- **AC-E01-10**: `test/document-project-integration.test.js` covers deep_dive output sections.
- **AC-E01-10**: `test/document-project-render-index.test.js` covers index rendering + markers.
- **AC-E01-10**: `npm test` passes.

## Edge cases

- E1: Tests clean up temp dirs even on failure.

## Run plan

- Full suite on every PR.
