---
story: E09-S05
gate: gate
status: done
created: 2026-08-08
owner: Hawkeye
epic: 09-ux-intent
decision: PASS
policy: advisory
---

# Gate Decision — E09-S05: --sign-scope + guided scope creation

## AC → Test Traceability

| AC ID | Description | Test(s) | Status |
|---|---|---|---|
| AC-S05-1 | `--sign-scope` flag recomputes SHA-256 and rewrites `scope_sha256` | `sign-scope.test.js:54` — "signScope recomputes scope_sha256 and rewrites the file" | PASS |
| AC-S05-2 | `--sign-scope` on unsigned scope → creates signature | `sign-scope.test.js:54` — writes scope with wrong hash, signScope fixes it | PASS |
| AC-S05-3 | `--sign-scope` on tampered scope → updates signature | `sign-scope.test.js:90` — "signScope updates hash after body edit" | PASS |
| AC-S05-4 | `signScope` is idempotent | `sign-scope.test.js:78` — "running twice on the same body produces the same hash" | PASS |
| AC-S05-5 | `signScope` throws on missing file | `sign-scope.test.js:108` — ScopeError(MISSING_FILE) | PASS |
| AC-S05-6 | `signScope` throws on invalid format | `sign-scope.test.js:116` — throws on non-frontmatter content | PASS |
| AC-S05-7 | `signScope` preserves `accepted_by` and `accepted_at` | `sign-scope.test.js:219` — fields preserved after re-sign | PASS |
| AC-S05-8 | `signScope` only replaces `scope_sha256` in frontmatter, not body | `sign-scope.test.js:233` — body `scope_sha256` untouched | PASS |
| AC-S05-9 | `generateScope` creates valid scope.md | `sign-scope.test.js:125` — passes parseScope + validateScope | PASS |
| AC-S05-10 | `generateScope` body contains allowlist, dast_target, notes | `sign-scope.test.js:147` — all sections present | PASS |
| AC-S05-11 | `generateScope` defaults paths to `/` when none provided | `sign-scope.test.js:171` — defaults to `/` | PASS |
| AC-S05-12 | `generateScope` creates parent directories | `sign-scope.test.js:187` — deep/nested/scope.md created | PASS |
| AC-S05-13 | `wize-sec-scope` skill documents guided flow | `wize-sec-scope/skill.md:22-36` — 4 questions, generates scope.md | PASS |
| AC-S05-14 | `wize-sec-scope` documents re-sign flow | `wize-sec-scope/skill.md:40-44` — references `--sign-scope` | PASS |
| AC-S05-15 | `run-pipeline.js` handles `--sign-scope` and exits early | `run-pipeline.js:125-137` — signScope called, exits 0 on success, 2 on error | PASS |
| AC-S05-16 | Error messages reference `--sign-scope` correctly | `scope-parser.js:76,87` — both error paths mention `wize-sec-pentest --sign-scope` | PASS |

## Test Results

- **Suite**: `npm test` — 532 pass, 0 fail, 5 skipped
- **Sign-scope tests**: 10/10 pass (`test/security-overlay/sign-scope.test.js`)
- **Scope parser tests**: All pass (`test/security-overlay/scope-parser.test.js`)
- **Pipeline tests**: All pass (`test/security-overlay/orchestrator.test.js`)

## NFR Assessment

- **Security**: `signScope` uses SHA-256 (crypto module). Hash is computed on the raw body bytes — byte-equality matters. Frontmatter-only replacement prevents accidental body corruption. Idempotent — running twice produces the same hash.
- **Reliability**: `signScope` throws descriptive ScopeError on missing file or invalid format. `run-pipeline.js` catches errors and exits with code 2. The guided `wize-sec-scope` flow generates a pre-validated scope.md.
- **Maintainability**: `signScope` lives in `scope-parser.js` alongside `parseScope`, `validateScope`, and `loadScope` — single source of truth for scope operations.

## Findings

1. **Finding**: `signScope` is implemented as a standalone function in `scope-parser.js`, not as a separate script. `run-pipeline.js` requires it inline at line 128. This is consistent with the module pattern used throughout the security overlay.
   **Impact**: None. Correct pattern.
   **Recommendation**: None.

2. **Finding**: The `wize-sec-scope` skill is AI-native (the AI asks questions and calls `generate-scope.js`). There is no programmatic interactive prompt — the AI drives the conversation.
   **Impact**: Low. Consistent with wize-dev-kit architecture. The `generate-scope.js` script can be called programmatically with CLI flags for non-interactive use.
   **Recommendation**: None.

3. **Finding**: Risk profile rated S05 as LOW risk. Implementation confirms: `--sign-scope` is additive (new flag), error messages were already correct, guided scope creation is new with no existing flow to break.
   **Impact**: None. Risk assessment validated.
   **Recommendation**: None.

## Gate Decision: PASS

**Rationale**: `--sign-scope` is fully implemented with 10 dedicated tests covering all edge cases (missing file, invalid format, idempotency, body vs frontmatter isolation, field preservation). Guided scope creation (`wize-sec-scope` + `generate-scope.js`) produces pre-validated scope.md files. Error messages correctly reference the flag. All tests pass. No regressions.
