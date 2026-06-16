---
gate: design
story_id: E06-S03
ac_ids: [AC-E06-3, AC-E06-4]
status: ready-for-dev
created_at: 2026-06-17T00:00:00Z
test_split:
  unit: { count: 4, description: "both skill files exist; frontmatter complete; review areas documented" }
  integration: { count: 1, description: "module.yaml picks up via discovery walker" }
  e2e: { count: 0 }
fixtures:
  - "tmp project with prd.md"
  - "tmp project with adr.md"
  - "tmp project with gate.md"
mocks: []
environment: "Node.js 20+ local test runner"
risk_links: []
edges:
  - "artifact type unknown"
  - "file has no template"
  - "all sections are present (no findings)"
---

# TEA Design — E06-S03

## Per-AC assertion shapes

- **AC-E06-3:** `src/core-skills/wize-editorial-review-prose/skill.md` exists with frontmatter `status: ready` and documents 4 areas (voice, jargon, hedging, pronouns).
- **AC-E06-4:** `src/core-skills/wize-editorial-review-structure/skill.md` exists with frontmatter `status: ready` and documents 4 areas (missing, misordered, heading level, empty).

## Edge cases

- E1: Artifact type unknown → skill exits with a one-line error listing known types.
- E2: No template for the type → skill skips the structural check and runs prose only.
- E3: All sections are present → skill reports "no findings" and exits.

## Run plan

- Unit on every PR.
