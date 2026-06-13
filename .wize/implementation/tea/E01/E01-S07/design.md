---
gate: design
story_id: E01-S07
ac_ids: [AC-E01-7]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 6, description: "resolveTarget path/feature/api_group/component_group, listFilesInScope, readFileSummary, index update" }
  integration: { count: 2, description: "CLI deep_dive folder and feature; index links new deep-dive doc" }
  e2e: { count: 0 }
fixtures:
  - "temporary project root with src/lib/, src/components/, src/routes/"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "missing target returns error exitCode 1"
  - "feature search with no match returns empty but still writes doc"
  - "api_group prefix resolves route files"
  - "component_group prefix resolves component files"
---

# TEA Design — E01-S07

## Per-AC assertion shapes

- **AC-E01-7**: `runDeepDive(root, { target: 'src/lib' })` writes `deep-dive-lib.md` with file inventory, exports, TODOs, and modification guidance.
- **AC-E01-7**: `runDeepDive(root, { target: 'feature:auth' })` resolves files whose path or content matches `auth` and writes a deep-dive doc.
- **AC-E01-7**: `runDeepDive(root, { target: 'api:users' })` resolves files under `src/routes/` or `src/api/` matching `users`.
- **AC-E01-7**: `runDeepDive(root, { target: 'component:Button' })` resolves files under `src/components/` or `src/ui/` matching `Button`.
- **AC-E01-7**: `runDeepDive(root, { target: 'missing' })` returns `{ ok: false, exitCode: 1 }`.
- **AC-E01-7**: After deep-dive, `index.md` includes a link to the generated deep-dive file under Generated Documentation.

## Edge cases

- E1: Target path is a single file.
- E2: Feature search returns zero files — still writes doc stating no matches.
- E3: Deep-dive output filename is sanitized and lower-cased.

## Run plan

- Unit + integration on every PR.
