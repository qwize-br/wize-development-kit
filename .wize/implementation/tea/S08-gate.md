---
story: E09-S08
gate: gate
status: done
created: 2026-08-08
owner: Hawkeye
epic: 09-ux-intent
decision: FAIL
policy: advisory
---

# Gate Decision — E09-S08: Metadata hygiene + CI

## AC → Test Traceability

| AC ID | Description | Evidence | Status |
|---|---|---|---|
| AC-S08-a1 | `wize-edit-prd` phase normalized to `2-plan` | `src/method-skills/2-plan-workflows/wize-edit-prd/workflow.md` line 4: `phase: 2-plan` | PASS |
| AC-S08-a2 | `wize-tech-vision` phase normalized to `3-solutioning` | `src/method-skills/3-solutioning/wize-tech-vision/workflow.md` line 4: `phase: 3-solutioning` | PASS |
| AC-S08-a3 | `wize-nfr-principles` phase normalized to `3-solutioning` | `src/method-skills/3-solutioning/wize-nfr-principles/workflow.md` line 4: `phase: 3-solutioning` | PASS |
| AC-S08-a4 | TEA skills use `phase:` instead of `gate:` | 6 TEA skills have `phase: 4-implementation` BUT also retain `gate:` key | ⚠️ PARTIAL |
| AC-S08-a5 | All 31 workflow.md files have consistent phase labels | 37 workflow.md files, all use valid phases (`1-analysis`, `2-plan`, `3-solutioning`, `4-implementation`). No `2-plan-workflows` or `2-to-3-boundary` remain. | PASS |
| AC-S08-b1 | `doctor.js` suggestions use slash-command format | `tools/installer/commands/doctor.js:255,261` — both use `/wize-refresh-knowledge` | PASS |
| AC-S08-b2 | `wize-refresh-knowledge` suggestion fixed | Line 255: `Run \`/wize-refresh-knowledge\`` | PASS |
| AC-S08-c1 | No standalone `/wize` alias (pre-S10) | AGENTS.md references `/wize-help` (not bare `/wize`). S10 adds the real alias — expected in same sprint. | PASS |
| AC-S08-d1 | Header no longer says "v0.1 scaffold" | `wize-cli.js:6` — `v0.11.0 — Full-lifecycle CLI` | PASS |
| AC-S08-d2 | Header reflects current subcommands | `wize-cli.js:4` — lists install, update, uninstall, list, sync, agent, workflow, help. Line 7-8 adds validate, doctor, document-project. | PASS |
| AC-S08-e1 | `.github/workflows/ci.yml` exists | **File not found.** No `.github/workflows/` directory exists. | FAIL |
| AC-S08-e2 | CI runs `npm test` on push/PR | Cannot verify — ci.yml missing | FAIL |
| AC-S08-e3 | CI runs `npm run validate` on push/PR | Cannot verify — ci.yml missing | FAIL |
| AC-S08-e4 | CI uses Node.js >= 20 | Cannot verify — ci.yml missing | FAIL |
| AC-S08-f1 | Tool contract test for CLI exists (RETRO-1) | `test/tool-contract-wize-cli.test.js` **not found**. Existing contract tests (`tool-contract-exploit.test.js`, `tool-contract-recon.test.js`) are security-overlay only. | FAIL |
| AC-S08-f2 | Contract test validates `--help` | Cannot verify — file missing | FAIL |
| AC-S08-f3 | Contract test validates `--version` | Cannot verify — file missing | FAIL |
| AC-S08-f4 | Contract test validates `validate` subcommand | Cannot verify — file missing | FAIL |
| AC-S08-f5 | Contract test skips gracefully when binary absent | Cannot verify — file missing | FAIL |

## Test Results

- **Suite**: `npm test` — 441 pass, 0 fail, 5 skipped
- **No dedicated test files**: `test/metadata-hygiene.test.js`, `test/ci-smoke.test.js`, and `test/tool-contract-wize-cli.test.js` do not exist. The test design specified 16 unit + 3 integration tests; none were created.

## NFR Assessment

- **Maintainability**: Phase label normalization is complete and consistent. All 37 workflow.md files use canonical phase labels. This prevents future routing bugs.
- **Reliability**: Without CI, there is no automated guard against regressions. Tests only run locally or on publish-by-tag. This is the #1 risk from the risk profile (S08 CI should be prioritized to protect the rest of the epic).
- **Security**: No CI means no automated validation of security-overlay tool contracts on push. A regression in `wize-sec-*` tools could ship undetected.

## Findings

1. **Finding**: TEA skills (risk, design, trace, nfr, review, gate) have `phase: 4-implementation` added but the old `gate:` key was NOT removed. All 6 files carry both keys.
   **Impact**: Medium. `collectAssets` in `render-shared.js` reads `phase` for fallback descriptions. The `gate:` key is dead metadata — it doesn't break anything, but it violates the "use `phase:` instead of `gate:`" requirement and creates confusion about which key is authoritative.
   **Recommendation**: Remove the `gate:` key from all 6 TEA workflow.md files. Shuri owns this.

2. **Finding**: `.github/workflows/ci.yml` does not exist. This is a FAIL for AC-S08-e1 through AC-S08-e4.
   **Impact**: Critical. The risk profile explicitly states "S08 CI should be the FIRST story implemented, or at minimum implemented in parallel with S01." Without CI, every other story in the epic ships without automated regression protection. A parser fix (S01), 46 description edits (S02), or routing change (S03) could break the test suite and nobody would know until the next manual `npm test`.
   **Recommendation**: Create `.github/workflows/ci.yml` with triggers on `push` and `pull_request`, Node.js >= 20, and steps: `npm ci` → `npm test` → `npm run validate`. Shuri owns this.

3. **Finding**: `test/tool-contract-wize-cli.test.js` does not exist. This is a FAIL for AC-S08-f1 through AC-S08-f5.
   **Impact**: Medium. RETRO-1 from a previous sprint requested tool contract tests. Without them, CLI regressions (broken `--help`, `--version`, `validate`) are not caught automatically. The existing security-overlay contract tests (`tool-contract-exploit.test.js`, `tool-contract-recon.test.js`) prove the pattern works.
   **Recommendation**: Create `test/tool-contract-wize-cli.test.js` with smoke tests for `--help`, `--version`, and `validate`, using `execSync` with timeouts and graceful skip when the binary is absent. Shuri owns this.

4. **Finding**: The test design specified 19 tests across 2 new files. Zero were created. All AC verification was done via manual inspection of source files.
   **Impact**: Low for this gate (I verified manually), but high for regression protection. If someone changes a phase label or doctor.js suggestion format, no test will catch it.
   **Recommendation**: Create the test files as specified in the test design. Not blocking for this gate, but should be done before the epic closes.

## Gate Decision: FAIL

**Rationale**: Two AC groups are unimplemented: CI workflow (e1-e4) and tool contract tests (f1-f5). These are not cosmetic — CI is the #1 risk mitigation for the entire epic, and contract tests are a RETRO-1 requirement. The phase label normalization (a1-a5) and doctor.js fixes (b1-b2) are correctly implemented, with the minor caveat that TEA skills retain the deprecated `gate:` key.

**What must be fixed**:
1. Create `.github/workflows/ci.yml` (AC-S08-e1 through e4)
2. Create `test/tool-contract-wize-cli.test.js` (AC-S08-f1 through f5)
3. Remove deprecated `gate:` key from 6 TEA workflow.md files (AC-S08-a4)

**Owner**: Shuri
**Blocking**: No (advisory policy). However, the risk profile explicitly recommends CI be prioritized. Proceeding with S02/S03 without CI is a known risk.
