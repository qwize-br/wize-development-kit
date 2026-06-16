---
epic_id: 06-polish-and-coverage
status: done
owner: Shuri + Peggy Carter + Tony Stark
priority: 3
estimate: M
---

# Epic 06: Edge case hunter, index docs, editorial review, and customize

## Outcome

The kit gains four polishing skills: a dedicated Edge Case Hunter (callable independently from `wize-code-review`), a docs indexer (keeps the .wize/ tree navigable), two editorial review skills (prose + structure) for Peggy, and a customize skill that guides the user through overriding built-ins.

## Stories

- E06-S01: Create `wize-review-edge-case-hunter` (callable, generates edge case lists)
- E06-S02: Create `wize-index-docs` (rebuilds `.wize/knowledge/index.md` from the actual tree)
- E06-S03: Create `wize-editorial-review-prose` and `wize-editorial-review-structure` (Peggy's review)
- E06-S04: Create `wize-customize` (guide user through `.wize/custom/` overrides)

## Dependencies

- Existing core skills (`wize-code-review`, `wize-spec`, `wize-shard-doc`)
- `.wize/custom/` directory (already exists)

## Success

- 4 new skill/workflow files exist with `status: ready`.
- `npm test` remains green (≥ 228 tests).
- Adapters IDE regenerated for 8 targets.
- All 4 stories gated PASS.
