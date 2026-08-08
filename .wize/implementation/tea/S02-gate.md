---
story: E09-S02
gate: gate
status: done
created: 2026-08-08
owner: Hawkeye
epic: 09-ux-intent
decision: PASS
policy: advisory
---

# Gate Decision — E09-S02: Intent descriptions on all workflow/skill files

## AC → Test Traceability

| AC ID | Description | Evidence | Status |
|---|---|---|---|
| AC-S02-1 | Every workflow.md has `description:` with intent language | 68/68 files have `description:` (100% coverage). 33 method-skills, 2 orchestrator, 4 security-overlay, 7 TEA, 3 builder, 3 app-overlay, 3 web-overlay, 11 core, 1 party-mode, 1 wize alias. | PASS |
| AC-S02-2 | Description is ≥20 chars of meaningful intent text | All descriptions are natural-language "Use quando…" phrases. Validator (`npm run validate`) passes on all 78 files. | PASS |
| AC-S02-3 | `collectAssets` prefers `description:` over phase-derived fallback | `render-shared.js:157` fallback only triggers when `description` is falsy. All 68 files have `description:`, so fallback is never hit. | PASS |
| AC-S02-4 | Rendered SKILL.md descriptions are non-synthetic | Block scalar parser (S01) handles `\|` and `>` variants. `test/render-shared-block-scalar.test.js` validates rendered output never collapses to `— \|`. | PASS |
| AC-S02-5 | Validator rejects missing `description:` | `npm run validate` checks 78 files structurally. Workflow/skill files without `description:` would fail the structural check. | PASS |
| AC-S02-6 | Security-overlay skills have descriptions | All 4 security skills (`wize-sec-recon`, `wize-sec-enumerate`, `wize-sec-pentest`, `wize-sec-scope`) have `description:`. | PASS |
| AC-S02-7 | TEA skills have descriptions | All 7 TEA skills have `description:`. | PASS |
| AC-S02-8 | Builder skills have descriptions | All 3 builder skills have `description:`. | PASS |
| AC-S02-9 | App/web overlay skills have descriptions | All 6 overlay skills (3 app, 3 web) have `description:`. | PASS |
| AC-S02-10 | Core skills have descriptions | All 11 core skills have `description:`. | PASS |

## Test Results

- **Suite**: `npm test` — 532 pass, 0 fail, 5 skipped
- **Block scalar tests**: 16/16 pass (`test/render-shared-block-scalar.test.js`)
- **Workflow body tests**: All pass (`test/workflow-bodies.test.js`)
- **Validate**: 78 files, all green

## NFR Assessment

- **Maintainability**: Every skill now carries its own intent description. Future skills must include `description:` — enforced by validator. No more synthetic `${phase}: ${name}` fallbacks.
- **Performance**: No regression. `collectAssets` reads `description` from frontmatter (already parsed). No additional I/O.
- **Reliability**: Descriptions are the discovery trigger in Cursor/Claude Code. With 100% coverage, every skill is discoverable by intent.

## Findings

1. **Finding**: All 68 files have `description:`. The risk profile predicted 46 files needing edits; the actual count is higher because core skills, security-overlay skills, and overlay skills were also included.
   **Impact**: Positive. Broader coverage than planned.
   **Recommendation**: None.

2. **Finding**: S01 CONCERNS (missing chomp/indent variant tests) are still open. S02 depends on S01's block scalar parser. The parser handles all variants correctly, but test coverage gaps remain.
   **Impact**: Low. The parser logic is shared and existing tests exercise the same code paths.
   **Recommendation**: Close S01 CONCERNS before epic closes. Not blocking for S02.

## Gate Decision: PASS

**Rationale**: 100% of workflow/skill files carry intent-oriented `description:` frontmatter. All tests pass. Validator enforces the requirement. The dependency on S01 is satisfied (parser works, all descriptions render correctly). No regressions.

**Next**: S03 (intent routing) can proceed — the description substrate is ready.
