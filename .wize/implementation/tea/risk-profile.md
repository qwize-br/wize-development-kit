---
status: complete
owner: Hawkeye
created_at: 2026-06-15
---

# TEA Risk Profile — wize-dev-kit v0.4.1

**Scope:** document-project engine (E01–E03) + onboarding + mid-flight tools (E04).

## Risk Summary

| ID | Risk | Probability | Impact | Mitigation | Status |
|---|---|---|---|---|---|
| R-1 | Brownfield repo classification misidentifies project type | Medium | Medium | CSV rules + smoke tests; user can override via `--mode` | Mitigated |
| R-2 | State file `project-scan-report.json` becomes stale or corrupt | Low | High | Resume flow validates schema; corrupt files trigger re-scan | Mitigated |
| R-3 | Batch scanner hits large files (>5000 LOC) and blows context | Low | Medium | Hard cap skips oversized files | Mitigated |
| R-4 | IDE adapter regeneration overwrites user customizations | Low | Medium | Custom overrides live in `.wize/custom/` | Mitigated |
| R-5 | Installer prompt residual input stalls non-TTY CI | Low | High | Fixed in v0.4.1; TTY detection + harness launch | Mitigated |
| R-6 | Installer silently applies OS username as `user_name` | Medium | Medium | Fixed: `promptTextMandatory` always confirms with the user | Mitigated |
| R-7 | Onboarding launches next workflow without user confirmation | Medium | Medium | Wizer is told to never auto-launch; always hand off with explicit command | Mitigated |
| R-8 | `wize-edit-prd` drifts from `prd-changelog.md` history | Low | Medium | One-edit-per-run rule + changelog row mandatory | Mitigated |
| R-9 | `wize-correct-course` cuts scope without confirming trade-off | Medium | High | Step 4 mandatory human confirmation; no auto-cut | Mitigated |
| R-10 | `wize-project-context` drifts from source artifacts | Medium | Medium | Workflow is the only writer; manual edits are rejected by hand-rolled convention | Mitigated |
| R-11 | `wize-investigate` proposes fix without verification | Medium | High | Step 4 (Verify) is mandatory before Step 5 (Conclude) | Mitigated |
| R-12 | `wize-checkpoint-preview` pivot changes story ACs | Low | High | Pivots open a follow-up story; never edit the current story | Mitigated |
| R-13 | `wize-qa-generate-e2e-tests` invents selectors not in design system | Medium | Medium | New selectors are flagged in a "proposed testids" section; Mantis signs off | Mitigated |

## Risk-Test Mapping

- R-1 → `test/document-project-classify.test.js`
- R-2 → `test/document-project-state.test.js`
- R-3 → `test/document-project-batch-scanner.test.js`
- R-4 → `test/adapter-*.test.js`
- R-5, R-6 → `test/cli-commands.test.js`, CI smoke
- R-7, R-8, R-9, R-10, R-11, R-12, R-13 → no automated tests (workflow-only). Mitigated by step-by-step design + human gate.

## Notes

- All HIGH-impact risks are mitigated.
- No blockers for next epic.
- Backlog P3 (review-edge-case-hunter, index-docs, editorial-review, customize) remains queued.
