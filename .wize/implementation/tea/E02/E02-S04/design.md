---
gate: design
story_id: E02-S04
ac_ids: [AC-E02-4]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 1, description: "deep-dive-template.md exists with all required sections" }
  integration: { count: 0 }
  e2e: { count: 0 }
fixtures:
  - "src/method-skills/1-analysis/wize-document-project/templates/deep-dive-template.md"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "template includes Overview, File Inventory, Patterns, Data Flow, Integration Points, Testing, Modification Guidance"
---

# TEA Design — E02-S04

## Per-AC assertion shapes

- **AC-E02-4**: `deep-dive-template.md` exists and includes sections: Overview, Complete File Inventory, Key Implementation Details, Patterns, Data Flow, Integration Points, Testing, TODOs, Modification Guidance.
- **AC-E02-4**: Template uses `{{target_name}}` placeholder and outputs to `deep-dive-{sanitized-target-name}.md`.

## Edge cases

- E1: Missing required section fails validation.

## Run plan

- Unit tests on every PR.
