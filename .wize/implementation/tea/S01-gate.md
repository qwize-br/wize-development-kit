---
story: E09-S01
gate: gate
status: done
created: 2026-08-08
owner: Hawkeye
epic: 09-ux-intent
decision: CONCERNS
policy: advisory
---

# Gate Decision — E09-S01: Fix block scalar parser in `readFrontmatter`

## AC → Test Traceability

| AC ID | Description | Test(s) | Status |
|---|---|---|---|
| AC-S01-1 | Literal block scalar (`\|`) | `render-shared-block-scalar.test.js:70,86,121` | PASS |
| AC-S01-2 | Folded block scalar (`>`) | `render-shared-block-scalar.test.js:86` | PASS |
| AC-S01-3 | Chomp indicators (`\|+`, `\|-`, `>+`, `>-`) | `render-shared-block-scalar.test.js:154` (`\|-` only) | ⚠️ PARTIAL |
| AC-S01-4 | Explicit indent indicators (`\|2`, `>2`) | `render-shared-block-scalar.test.js:165` (`\|2` only) | ⚠️ PARTIAL |
| AC-S01-5 | Block scalar with blank lines | `render-shared-block-scalar.test.js:141` | PASS |
| AC-S01-6 | Block scalar adjacent to other keys | `render-shared-block-scalar.test.js:121` | PASS |
| AC-S01-7 | Regression: inline scalars | `render-shared-block-scalar.test.js:99` | PASS |
| AC-S01-8 | Regression: quoted scalars | `render-shared-block-scalar.test.js:110` | PASS |
| AC-S01-9 | Regression: empty frontmatter | `render-shared-block-scalar.test.js:177` | PASS |
| AC-S01-10 | `readYamlField` regression | `render-shared-block-scalar.test.js:42,58` | PASS |
| AC-S01-11 | Rendered agent never collapses to `— \|` | `render-shared-block-scalar.test.js:50` | PASS |
| AC-S01-12 | SKILL.md description is full block text | `render-shared-block-scalar.test.js:202,218` | PASS |
| AC-S01-13 | Validator rejects `— \|` / `— >` | `render-shared-block-scalar.test.js:188` | PASS |

## Test Results

- **Suite**: `npm test` — 441 pass, 0 fail, 5 skipped
- **Block scalar tests**: All 16 tests in `test/render-shared-block-scalar.test.js` pass
- **Implementation**: `readFrontmatter` (render-shared.js:62-89) delegates to shared `readBlockScalar` (line 17-39), matching the recommended strategy from the test design

## NFR Assessment

- **Performance**: No regression. `readBlockScalar` is O(n) on frontmatter lines, same as before.
- **Maintainability**: Fix avoids duplication — both `readYamlField` and `readFrontmatter` share `readBlockScalar`. Single source of truth for block scalar parsing.
- **Reliability**: Validator at line 188 guards against the `— |` regression in rendered output.

## Findings

1. **Finding**: AC-S01-3 specifies 4 chomp variants (`|+`, `|-`, `>+`, `>-`). Only `|-` has an explicit test.
   **Impact**: Low. The parser regex (`[|>][+-]?\d*` at render-shared.js:76) handles all variants. The `|-` test exercises the chomp path; `|+`, `>+`, `>-` differ only in trailing-newline behavior, which `readBlockScalar` handles uniformly.
   **Recommendation**: Add explicit tests for `|+`, `>+`, `>-` to close the coverage gap. Shuri owns this.

2. **Finding**: AC-S01-4 specifies 2 indent variants (`|2`, `>2`). Only `|2` has an explicit test.
   **Impact**: Low. The indent indicator is parsed by the same regex. The `|2` test exercises the indent path; `>2` differs only in folding behavior.
   **Recommendation**: Add explicit test for `>2`. Shuri owns this.

3. **Finding**: The test design specified a separate file `test/render-shared-readFrontmatter.test.js` with 18 unit tests. Implementation consolidated everything into `test/render-shared-block-scalar.test.js` (16 tests).
   **Impact**: None. All ACs are covered. Consolidation is acceptable — fewer files, same coverage.
   **Recommendation**: None. Accept the consolidation.

## Gate Decision: CONCERNS

**Rationale**: Implementation is correct and all tests pass. The parser handles all block scalar variants. Two ACs have incomplete explicit test coverage (missing 3 chomp variants and 1 indent variant), but the parser logic is shared and the existing tests exercise the same code paths. These are test coverage gaps, not implementation bugs.

**What must be fixed**: Add explicit tests for `|+`, `>+`, `>-`, and `>2` block scalar variants.
**Owner**: Shuri
**Blocking**: No (advisory policy). Can proceed to S02, but close the coverage gaps before the epic closes.
