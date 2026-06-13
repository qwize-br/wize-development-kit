---
gate: design
story_id: E03-S06
ac_ids: [AC-E03-6]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 2, description: "README has correct version, CLI commands include document-project; ARCH has document-project section" }
  integration: { count: 0 }
  e2e: { count: 0 }
fixtures:
  - "README.md"
  - "ARCH.md"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "README version matches package.json"
  - "README CLI list matches wize-cli.js HELP"
  - "ARCH describes modes, scan levels, state file, index"
---

# TEA Design — E03-S06

## Per-AC assertion shapes

- **AC-E03-6**: `README.md` status section reflects current version `0.3.x` and maturity.
- **AC-E03-6**: `README.md` CLI commands list includes `wize-dev-kit document-project [mode]`.
- **AC-E03-6**: `ARCH.md` contains a section explaining `document-project` modes, scan levels, state file, and index.
- **AC-E03-6**: No placeholders left in README/ARCH sections touched.

## Edge cases

- E1: README mentions alpha v0.1.0 → update to current.

## Run plan

- Manual review + structural tests on every PR.
