---
gate: design
story_id: E03-S05
ac_ids: [AC-E03-5]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 0 }
  integration: { count: 1, description: "publish.yml smoke step runs document-project quick and asserts 6 baseline files" }
  e2e: { count: 0 }
fixtures:
  - ".github/workflows/publish.yml"
mocks: []
environment: "GitHub Actions ubuntu-latest"
risk_links: []
edges:
  - "smoke fails if any baseline file is missing"
  - "WIZE_SKIP_BASELINE=1 not used in document-project smoke"
---

# TEA Design — E03-S05

## Per-AC assertion shapes

- **AC-E03-5**: `.github/workflows/publish.yml` smoke step runs `wize-dev-kit document-project quick` in a throwaway repo.
- **AC-E03-5**: Smoke asserts that `overview.md`, `architecture-snapshot.md`, `conventions.md`, `dependencies.md`, `risk-spots.md`, `open-questions.md` exist.
- **AC-E03-5**: Smoke step fails if a baseline file is missing.

## Edge cases

- E1: Smoke runs without AI harness.

## Run plan

- On publish workflow / tag push.
