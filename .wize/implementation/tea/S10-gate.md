---
story: E09-S10
gate: gate
status: done
created: 2026-08-08
owner: Hawkeye
epic: 09-ux-intent
decision: CONCERNS
policy: advisory
---

# Gate Decision — E09-S10: `/wize` alias + `/wize-help` canonical

## AC → Test Traceability

| AC ID | Description | Evidence | Status |
|---|---|---|---|
| AC-S10-1 | `/wize` exists as discoverable skill/alias | `src/orchestrator-skills/wize/skill.md` exists (150 lines, valid frontmatter) | PASS |
| AC-S10-2 | `/wize` maps to `wize-help` (same behavior) | `skill.md:2` — `code: wize`. `skill.md:14` — "This is a thin alias for `/wize-help`. Delegate all behavior to the `wize-help` skill." | PASS |
| AC-S10-3 | `/wize-help` remains canonical | `src/orchestrator-skills/wize-help/skill.md:2` — `code: wize-help` unchanged | PASS |
| AC-S10-4 | Both `/wize` and `/wize-help` are invocable | Both skill.md files exist with valid frontmatter. No integration test file exists to verify adapter rendering. | ⚠️ STRUCTURAL |
| AC-S10-5 | `AGENTS.md` references `/wize` as primary entry point | `AGENTS.md:13` — `via \`/wize-help\``. `AGENTS.md:37` — `ask \`/wize-help\``. `render-shared.js:297,313` — both use `/wize-help`. | FAIL |
| AC-S10-6 | Onboarding references `→ /wize` | `onboarding.js:10` — `return '→ /wize-help';` | FAIL |
| AC-S10-7 | `wize-help` skill.md acknowledges `/wize` as alias | `wize-help/skill.md:7` — `aliases: []` (empty). Body mentions `/wize` only in mission contract section (line 116), not as a documented alias. | FAIL |
| AC-S10-8 | All adapter renders include `wize` alias skill | No integration test file exists. Structurally, `collectAssets` walks `src/orchestrator-skills/` and will find the `wize/` directory. | ⚠️ STRUCTURAL |
| AC-S10-9 | `wize` alias does not break `wize-help` discovery | Both directories coexist in `src/orchestrator-skills/`. `wize-help` is unchanged. | PASS |
| AC-S10-10 | `wize` alias listed in `wize-dev-kit list` output | `wize/` directory exists in `src/orchestrator-skills/`. The list command walks this directory. | ⚠️ STRUCTURAL |

## Test Results

- **Suite**: `npm test` — 441 pass, 0 fail, 5 skipped
- **No dedicated test files**: `test/wize-alias.test.js` and `test/wize-alias-integration.test.js` do not exist. The test design specified 9 unit + 3 integration tests; none were created.

## NFR Assessment

- **Maintainability**: The alias is implemented as a redirect skill.md (Approach A from the test design). This is portable across platforms and explicit. The body clearly states the delegation contract.
- **Discoverability**: The alias exists on disk but is not discoverable through the primary entry points (AGENTS.md, onboarding, wize-help docs). Users who read AGENTS.md or run onboarding will see `/wize-help`, not `/wize`. This defeats the purpose of the alias.
- **Reliability**: No risk of shadowing — both `wize` and `wize-help` coexist as separate assets. `collectAssets` will return both.

## Findings

1. **Finding**: The `/wize` alias skill.md is well-implemented. It has correct frontmatter (`code: wize`), a clear delegation contract ("This is a thin alias for `/wize-help`"), and the full wize-help behavior replicated in its body. The implementation approach (redirect skill.md) is the recommended one from the test design.

2. **Finding**: AGENTS.md still references `/wize-help` as the primary entry point. The "Where to start" section (line 37) and the operating context (line 13) both say `/wize-help`. The source template in `render-shared.js` (lines 297, 313) also uses `/wize-help`.
   **Impact**: Medium. The alias exists but users following AGENTS.md instructions will use `/wize-help` instead of `/wize`. The alias is undiscoverable through the primary documentation.
   **Recommendation**: Update `render-shared.js` lines 297 and 313 to reference `/wize` instead of `/wize-help`. Regenerate AGENTS.md. Shuri owns this.

3. **Finding**: `onboarding.js` returns `'→ /wize-help'` instead of `'→ /wize'`.
   **Impact**: Low. The onboarding one-liner is primarily an S09 concern. But S10 should ensure the reference exists. Currently it points to the canonical name, not the alias.
   **Recommendation**: Change `onboarding.js:10` to `return '→ /wize';`. Shuri owns this.

4. **Finding**: `wize-help/skill.md` does not document `/wize` as an alias. The frontmatter has `aliases: []` (empty array). The body mentions `/wize` only in the mission contract section header (line 116: "`/wize mission` or `/wize-help mission`"), which is about the mission mode, not about documenting the alias relationship.
   **Impact**: Low. Users who discover `/wize-help` first won't know `/wize` is also available. The reverse path (discovering `/wize` and learning about `/wize-help`) works because the alias body explicitly states the relationship.
   **Recommendation**: Add `aliases: [wize]` to `wize-help/skill.md` frontmatter and add a note in the body: "Alias: `/wize` also routes here. Both commands are equivalent." Shuri owns this.

5. **Finding**: No test files were created for S10. The test design specified 12 tests across 2 files. All AC verification was done via manual inspection.
   **Impact**: Low for this gate, but no regression protection if the alias or its integration points are modified.
   **Recommendation**: Create the test files as specified. Not blocking.

## Gate Decision: CONCERNS

**Rationale**: The core alias implementation is correct and well-structured. The `/wize` skill.md exists, has valid frontmatter, and clearly delegates to `wize-help`. However, the integration points that make the alias discoverable were not updated: AGENTS.md, onboarding, and wize-help documentation all still reference `/wize-help` as the sole entry point. The alias exists but users won't find it through the documented paths.

**What must be fixed**:
1. Update `render-shared.js` to reference `/wize` in AGENTS.md template (AC-S10-5)
2. Update `onboarding.js` to return `→ /wize` (AC-S10-6)
3. Update `wize-help/skill.md` to document `/wize` as alias (AC-S10-7)

**Owner**: Shuri
**Blocking**: No (advisory policy). The alias works if invoked directly. The documentation gaps don't break existing flows.
