---
epic_id: E01
status: done
owner: Tony Stark + Maria Hill
linked_prd: document-project-expansion
priority: 1
estimate: L
---

# Epic 01: Expand `wize-document-project` with modes and project-type classification

## Outcome

`wize-document-project` supports `quick` (default), `initial_scan`, `full_rescan`, and `deep_dive` modes. It classifies repos by project type and produces richer documentation while keeping the lightweight baseline as default.

## Stories

- E01-S01: Add CLI argument parsing for document-project subcommand/mode
- E01-S02: Create project-type classification CSV and classifier module
- E01-S03: Implement JSON state file + resume flow
- E01-S04: Implement quick scan path (default baseline, existing behavior preserved)
- E01-S05: Implement initial_scan mode with conditional scans per project type
- E01-S06: Implement full_rescan mode that archives old state and re-runs
- E01-S07: Implement deep_dive mode for specific areas
- E01-S08: Generate master index.md with `(To be generated)` markers
- E01-S09: Update workflow markdown skill to describe new modes
- E01-S10: Add structural tests for all new modules

## Dependencies

- Existing baseline docs in `.wize/knowledge/document-project/` (already generated).
- `wize-cli.js` dispatcher extended to accept `document-project [mode]`.

## Success

- All E01 stories PASS TEA gate.
- `npm test` and `npm run validate` remain green.
- Smoke E2E still passes.
