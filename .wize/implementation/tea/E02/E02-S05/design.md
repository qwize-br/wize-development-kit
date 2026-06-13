---
gate: design
story_id: E02-S05
ac_ids: [AC-E02-5]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 2, description: "schema exists with required fields; valid/invalid state validation" }
  integration: { count: 1, description: "npm run validate includes schema in structural checks" }
  e2e: { count: 0 }
fixtures:
  - "src/method-skills/1-analysis/wize-document-project/templates/project-scan-report-schema.json"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "schema rejects missing required fields"
  - "schema accepts optional fields"
---

# TEA Design — E02-S05

## Per-AC assertion shapes

- **AC-E02-5**: `project-scan-report-schema.json` exists and requires `workflow_version`, `timestamps`, `mode`, `scan_level`, `completed_steps`, `current_step`.
- **AC-E02-5**: Schema supports optional `findings`, `outputs_generated`, `resume_instructions`, `validation_status`, `deep_dive_targets`.
- **AC-E02-5**: `npm run validate` checks the schema or references it.

## Edge cases

- E1: State file missing required field fails validation.
- E2: Empty object fails validation.

## Run plan

- Unit + validate on every PR.
