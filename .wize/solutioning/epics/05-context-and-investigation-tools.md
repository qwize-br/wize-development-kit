---
epic_id: 05-context-and-investigation-tools
status: done
owner: Tony Stark + Maria Hill + Hawkeye
priority: 2
estimate: L
---

# Epic 05: Project context, checkpoint, investigation, and E2E test generation

## Outcome

The kit gains four operational tools: a canonical project context, a mid-story checkpoint, an investigation workflow for Shuri, and an E2E test generator for Hawkeye. Together they reduce the cognitive load on every other agent and give Shuri + Hawkeye self-serve paths for routine work.

## Stories

- E05-S01: Create `wize-project-context` (consolidate brief+prd+ux+architecture+decisions into one file)
- E05-S02: Create `wize-checkpoint-preview` (pause mid-story to validate direction)
- E05-S03: Create `wize-investigate` (debug/RCA for failed tests and regressions)
- E05-S04: Create `wize-qa-generate-e2e-tests` (Hawkeye generates E2E cases from ux-design)

## Dependencies

- `.wize/knowledge/document-project/` baseline (already exists)
- Existing workflows (`wize-dev-story`, `wize-tea-design`, `wize-tea-trace`)

## Success

- 4 workflow files exist with frontmatter `status: ready`.
- `npm test` remains green (≥ 224 tests).
- Adapters IDE regenerated for 8 targets.
- All 4 stories gated PASS in TEA.
