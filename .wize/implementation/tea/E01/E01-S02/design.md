---
gate: design
story_id: E01-S02
ac_ids: [AC-E01-2]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 8, description: "loadRequirements columns, classifyProject monolith types, multi-part, empty, helper functions" }
  integration: { count: 0 }
  e2e: { count: 0 }
fixtures:
  - "temporary directory trees for web, backend, mobile, infra, multi-part client/server"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "CSV parsing tolerates CRLF and trailing blank lines"
  - "globMatch handles directory patterns ending in /"
  - "monorepo with unknown top-level folders falls back to monolith classification"
---

# TEA Design — E01-S02

## Per-AC assertion shapes

- **AC-E01-2**: `loadRequirements(CSV_PATH)` returns 11 rows with required columns and boolean flags parsed correctly.
- **AC-E01-2**: `classifyProject(KIT)` returns `projectTypes` containing both `cli` and `library`.
- **AC-E01-2**: Temporary web repo with `vite.config.ts` + `src/index.ts` is classified as `web`.
- **AC-E01-2**: Temporary backend repo with routes is classified as `backend`.
- **AC-E01-2**: Temporary `client/` + `server/` tree is classified as multi-part with `web` + `backend`.
- **AC-E01-2**: Temporary mobile repo with `pubspec.yaml` is classified as `mobile`.
- **AC-E01-2**: Temporary infra repo with `main.tf` is classified as `infra`.
- **AC-E01-2**: Unknown repo returns empty `projectTypes` and no parts.

## Edge cases

- E1: CSV uses Windows line endings.
- E2: Directory pattern `src/` is distinguished from file pattern.
- E3: Tie between `cli` and `library` returns both types.

## Run plan

- Unit tests on every PR.
