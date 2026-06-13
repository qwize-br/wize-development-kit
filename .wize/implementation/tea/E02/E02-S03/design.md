---
gate: design
story_id: E02-S03
ac_ids: [AC-E02-3]
status: ready-for-dev
created_at: 2026-06-13T00:00:00Z
test_split:
  unit: { count: 4, description: "api-contracts, data-models, deployment-guide, contribution-guide templates exist with required sections" }
  integration: { count: 0 }
  e2e: { count: 0 }
fixtures:
  - "src/method-skills/1-analysis/wize-document-project/templates/*.md"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "skipped templates do not produce empty files"
  - "templates declare placeholder section lists"
---

# TEA Design — E02-S03

## Per-AC assertion shapes

- **AC-E02-3**: `api-contracts-template.md` exists with endpoint, method, request, response sections.
- **AC-E02-3**: `data-models-template.md` exists with entity, fields, relationships sections.
- **AC-E02-3**: `deployment-guide-template.md` exists with CI/CD, infra, environment sections.
- **AC-E02-3**: `contribution-guide-template.md` exists with setup, conventions, PR process sections.

## Edge cases

- E1: Empty template fails test.
- E2: Missing required heading fails test.

## Run plan

- Unit tests on every PR.
