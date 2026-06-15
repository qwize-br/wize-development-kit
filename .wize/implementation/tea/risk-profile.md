---
status: complete
owner: Hawkeye
created_at: 2026-06-14
---

# TEA Risk Profile — wize-dev-kit v0.4.1

**Scope:** document-project engine expansion (E01–E03), v0.3.1 release.

## Risk Summary

| ID | Risk | Probability | Impact | Mitigation | Status |
|---|---|---|---|---|---|
| R-1 | Brownfield repo classification misidentifies project type | Medium | Medium | CSV rules + smoke tests; user can override via `--mode` | Mitigated |
| R-2 | State file `project-scan-report.json` becomes stale or corrupt | Low | High | Resume flow validates schema; corrupt files trigger re-scan | Mitigated |
| R-3 | Batch scanner hits large files (>5000 LOC) and blows context | Low | Medium | Hard cap skips oversized files | Mitigated |
| R-4 | IDE adapter regeneration overwrites user customizations | Low | Medium | Custom overrides live in `.wize/custom/` | Mitigated |
| R-5 | Installer prompt residual input stalls non-TTY CI | Low | High | Fixed in v0.4.1; TTY detection + harness launch | Mitigated |

## Risk-Test Mapping

- R-1 → `test/document-project-classify.test.js`
- R-2 → `test/document-project-state.test.js`
- R-3 → `test/document-project-batch-scanner.test.js`
- R-4 → `test/adapter-*.test.js`
- R-5 → `test/cli-commands.test.js`, CI smoke

## Notes

- All HIGH-impact risks are mitigated.
- No blockers for next epic.
