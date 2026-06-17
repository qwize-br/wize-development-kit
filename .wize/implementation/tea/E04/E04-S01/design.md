---
gate: design
story_id: E04-S01
ac_ids: [AC-E04-1, AC-E04-2, AC-E04-3]
status: ready-for-dev
created_at: 2026-06-15T00:00:00Z
test_split:
  unit: { count: 4, description: "stub removed; frontmatter status ready; ACs covered" }
  integration: { count: 1, description: "discovery via filesystem reads in onboarding" }
  e2e: { count: 0 }
fixtures:
  - "tmp project with no .wize"
  - "tmp project with brief only"
  - "tmp project with PRD only"
  - "tmp project with active sprint"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "no .wize at all"
  - "user.toml missing name"
  - "PRD and brief both exist"
  - "sprint-status stale (>2 days)"
---

# TEA Design — E04-S01

## Per-AC assertion shapes

- **AC-E04-1:** Reading a project with `package.json` and `src/` produces `brownfield: true` and detects `S1` state.
- **AC-E04-1:** Reading a project with no signals produces `greenfield: true` and `S0` state.
- **AC-E04-2:** When `sprint-status.yaml` exists, onboarding suggests `/wize-sprint-status`; otherwise it does not.
- **AC-E04-3:** When only `brief.md` exists, onboarding suggests `/wize-create-prd`; when `prd.md` exists, suggests `/wize-sprint-planning`; when neither, suggests `/wize-product-brief` or `/wize-document-project` (brownfield).

## Edge cases

- E1: `.wize/` missing entirely → onboarding prints a one-line message asking the user to run `npx wize-dev-kit install`.
- E2: `user.toml` has empty name → onboarding asks once and persists.
- E3: Multiple artifacts present → use the latest (PRD > brief > baseline) as the current state.

## Run plan

- Unit + integration on every PR.
