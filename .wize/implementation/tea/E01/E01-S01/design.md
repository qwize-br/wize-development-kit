---
gate: design
story_id: E01-S01
ac_ids: [AC-E01-1]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 5, description: "parseMode defaults, modes, resume, unknown mode; cmdDocumentProject dispatcher routing" }
  integration: { count: 1, description: "wize-cli.js dispatcher passes args to document-project command" }
  e2e: { count: 0 }
fixtures:
  - "temporary project root with .wize/config/project.toml"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "mode alias collision: quick vs scan-level quick argument"
  - "multiple positional arguments produce error"
  - "--resume before or after mode"
---

# TEA Design — E01-S01

## Per-AC assertion shapes

- **AC-E01-1**: `parseMode([])` returns `{ mode: 'quick', resume: false }`.
- **AC-E01-1**: `parseMode(['initial_scan'])`, `parseMode(['full_rescan'])`, `parseMode(['deep_dive'])` return matching mode.
- **AC-E01-1**: `parseMode(['initial_scan', '--resume'])` returns `{ mode: 'initial_scan', resume: true }`.
- **AC-E01-1**: `parseMode(['nope'])` returns `{ mode: null, error: /unknown mode/i }`.
- **AC-E01-1**: `cmdDocumentProject({ args: ['quick'] })` returns `{ ok: true, mode: 'quick', changed: true }` and baseline files exist.
- **AC-E01-1**: `cmdDocumentProject({ args: ['nope'] })` returns `{ ok: false, exitCode: 1 }`.

## Edge cases

- E1: `parseMode(['quick', 'deep'])` — `deep` is treated as scan level only for modes that accept it.
- E2: `parseMode(['--resume', 'initial_scan'])` — flag order is flexible.
- E3: `parseMode(['initial_scan', 'full_rescan'])` — rejects second mode as unexpected extra argument.

## Run plan

- Unit + integration on every PR.
