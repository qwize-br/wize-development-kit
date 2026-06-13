---
gate: design
story_id: E03-S01
ac_ids: [AC-E03-1]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 2, description: "CLI dispatcher routes document-project and help lists it" }
  integration: { count: 1, description: "process spawn or direct main dispatch for document-project" }
  e2e: { count: 0 }
fixtures:
  - "tools/installer/wize-cli.js"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "unknown subcommand shows help"
  - "document-project passes rest args correctly"
---

# TEA Design — E03-S01

## Per-AC assertion shapes

- **AC-E03-1**: `wize-cli.js` HELP includes `document-project` command with modes.
- **AC-E03-1**: `switch` block routes `document-project` to `cmdDocumentProject({ kitRoot, projectRoot: cwd, args: rest })`.
- **AC-E03-1**: `cmdDocumentProject` accepts `quick`, `initial_scan`, `full_rescan`, `deep_dive` and `--resume`, `--target`.

## Edge cases

- E1: `document-project` without args defaults to quick.
- E2: Unknown mode returns exit code 1.

## Run plan

- Unit + integration on every PR.
