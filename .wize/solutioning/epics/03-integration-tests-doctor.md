---
epic_id: E03
status: ready
owner: Hawkeye + Shuri
linked_prd: document-project-expansion
priority: 3
estimate: M
---

# Epic 03: Integrate new document-project with CLI, doctor, and TEA

## Outcome

The new document-project modes are reachable from the CLI, observable by `wize-dev-kit doctor`, and produce inputs Hawkeye can use for risk/profile gates.

## Stories

- E03-S01: Wire `wize-dev-kit document-project [mode]` into CLI dispatcher
- E03-S02: Add `doctor` checks for baseline freshness and scan state
- E03-S03: Update installer brownfield flow to offer mode selection
- E03-S04: Add TEA risk profile guidance for documentation gaps
- E03-S05: Add CI smoke test for `document-project quick` on a sample repo
- E03-S06: Update README/ARCH with new document-project capabilities

## Dependencies

- E01-S01 (CLI argument parsing)
- E01-S04 (quick path stable)
- E01-S08 (index.md generation)

## Success

- `wize-dev-kit doctor` reports `document-project` status accurately.
- CI smoke test exercises the new command end-to-end.
- README no longer says alpha v0.1.0.
