---
gate: design
story_id: E05-S04
ac_ids: [AC-E05-6]
status: ready-for-dev
created_at: 2026-06-16T00:00:00Z
test_split:
  unit: { count: 3, description: "workflow file exists; frontmatter complete; 4 sections present" }
  integration: { count: 1, description: "module.yaml picks up via discovery walker" }
  e2e: { count: 0 }
fixtures:
  - "tmp project with ux-design + prd"
  - "tmp project with web-overlay profile"
  - "tmp project with no UX design (gap)"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "ux-design missing (gap)"
  - "core-only profile, framework ambiguous"
  - "screen with 0 ACs"
---

# TEA Design — E05-S04

## Per-AC assertion shapes

- **AC-E05-6:** `src/tea-skills/wize-qa-generate-e2e-tests/workflow.md` exists with frontmatter `status: ready`, documents 4 sections (Map, Cases, Selectors, Triage), and an output path of `.wize/implementation/tea/e2e-cases/{screen}.md`.

## Edge cases

- E1: `ux-design/` missing → workflow exits with a one-line error pointing to `/wize-ux-design`.
- E2: Core-only profile → workflow proposes both Playwright and Detox; the user picks.
- E3: Screen with 0 ACs → workflow flags as a gap in the Map section and skips case generation for that screen.

## Run plan

- Unit on every PR.
