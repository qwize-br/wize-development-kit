# Code Review — Sprint 2+3 (Epic 09: UX / Intent)

**Date:** 2026-08-08
**Reviewer:** Code review agent
**Scope:** `HEAD~10..HEAD` (198 files, +3049/-928)
**Test results:** 532 pass, 5 skipped, 0 fail. `npm run validate` green (78 files).

---

## Overall Assessment: **CHANGES_REQUESTED**

3 HIGH findings must be addressed before merge. No CRITICAL issues. The sprint delivers what it promises — descriptions, intent routing, onboarding revamp, sign-scope, non-interactive install, release/changelog skills — but has 3 integration gaps that break discoverability of the new `wize-sec-scope` skill.

---

## Findings by Severity

### HIGH

**H1 — `wize-sec-scope` missing from red-teamer `agent.yaml` `skills:` list**
`src/security-overlay/agents/red-teamer/agent.yaml:23`

The agent.yaml declares only `wize-sec-pentest` under `skills:` and only `/wize-sec-pentest` under `commands:`. The persona.md (line 30) documents `/wize-sec-scope` as a first-class command, but the harness won't load the skill because it's not declared. Natasha can't discover or invoke scope creation.

**Fix:** Add `wize-sec-scope` to both `skills:` and `commands:` in the agent.yaml.

---

**H2 — `wize-sec-scope` missing from `wize-help` intent routing table**
`src/orchestrator-skills/wize-help/skill.md`

The security section of the intent table (lines 172-177) has `wize-sec-pentest`, `wize-sec-recon`, and `wize-sec-enumerate` but not `wize-sec-scope`. The intent routing test (`test/intent-routing.test.js:367`) explicitly excludes it as "triggered by phase heuristic, not user intent" — but there's no intent phrase that would route a user saying "criar escopo de segurança" or "create scope" to the right skill. The phase heuristic also doesn't have a step for scope creation.

**Fix:** Add an entry in the Security section of the intent table:
```
| "criar escopo", "create scope", "scope de segurança", "definir escopo", "security scope" | `wize-sec-scope` |
```
And remove `wize-sec-scope` from the `expectedMissing` set in `test/intent-routing.test.js:367`.

---

**H3 — `sprint_status.yaml` typo in `wize-release` workflow**
`src/method-skills/4-implementation/wize-release/workflow.md:105`

Line 105 references `sprint_status.yaml` (underscore) but the canonical file is `sprint-status.yaml` (hyphen). The rest of the workflow (lines 20, 21, 29, 40, 52, 62, 103) correctly uses `sprint-status.yaml`. An agent following the instructions literally on line 105 would write to the wrong file.

**Fix:** Change `sprint_status.yaml` to `sprint-status.yaml` on line 105.

---

### MEDIUM

**M1 — `wize-sec-scope` skill.md references `/wize-sec-pentest --sign-scope` for re-signing**
`src/security-overlay/skills/wize-sec-scope/skill.md:43`

The re-sign flow is documented as `/wize-sec-pentest --sign-scope`, which is technically correct (the flag lives in `run-pipeline.js`), but confusing when the user is reading the scope skill. The red-teamer persona.md documents both flows correctly. Consider adding a note that re-signing is done via the pentest command, or better, add `--sign-scope` as a flag that `wize-sec-scope` also accepts (delegating to the same `signScope()` function).

---

**M2 — `wize-release` step 7 writes to `sprint_status.yaml`**
Same as H3 — the typo means the release workflow would write release metadata to a non-existent file instead of the canonical `sprint-status.yaml`.

---

**M3 — `wize-changelog` doesn't validate `sprint-status.yaml` structure**
`src/method-skills/4-implementation/wize-changelog/workflow.md`

The changelog workflow reads `sprint-status.yaml` but doesn't validate that the `development_status` section exists or that stories have the expected shape. If the YAML is malformed or uses a different structure, the agent would fail silently. The `wize-release` workflow has the same gap but at least checks for `done` status explicitly.

---

### LOW

**L1 — `onboarding.js` doesn't test combined brownfield + security-overlay**
`tools/installer/onboarding.js`

The `compose()` function handles both flags independently, but there's no test for the combined case (brownfield + security-overlay). The output would be 3 lines, which is still within the ≤3 line goal, but the interaction isn't verified.

---

**L2 — No dedicated test for `wize-sec-scope` skill.md structural validation**
The `generate-scope.js` script is well-tested (7 tests in `sign-scope.test.js`), and the skill.md passes `npm run validate`. But there's no test that the skill.md frontmatter has all required fields (`code`, `description`, `name`, `overlay`, `module`, `owner`, `status`).

---

**L3 — `wize-release` step 3 semver bump defaults to `patch` in non-interactive mode without argument**
`src/method-skills/4-implementation/wize-release/workflow.md:76`

Defaulting to `patch` when no bump type is provided is reasonable, but the workflow doesn't warn the user that it's defaulting. A release with new features would incorrectly get a patch bump if the user forgets to pass the argument.

---

**L4 — `wize-help` Step 2b references "Step 2b" but the section is labeled "Step 2c"**
`src/orchestrator-skills/wize-help/skill.md:112`

The fallback note says "fall back to the phase heuristic (Step 2b)" but the phase heuristic is actually Step 2d. Minor documentation inconsistency.

---

## What's Good

- **Block scalar parsing** (`render-shared.js`): Correctly handles `|`, `>`, `|-`, `|2` variants. 11 dedicated tests. No more `— |` in rendered output.
- **`signScope()`** (`scope-parser.js`): Idempotent, preserves other frontmatter fields, only replaces `scope_sha256` in frontmatter (not body). 7 tests including edge cases.
- **`generateScope()`**: Creates valid scope.md that passes `parseScope` + `validateScope` round-trip. Handles missing paths (defaults to `/`), creates parent directories.
- **Non-interactive install**: `--profiles`, `--targets`, `--yes`, `--dry-run` all work. `resolveName()` falls back to `git config user.name` → `$USER` → `'Developer'`.
- **Uninstall**: Removes `wize-*` entries from adapter dirs using `adapterTargetPath()` (shared with doctor.js). Only deletes entries starting with `wize-`. No path traversal risk — `cleanAdapterTarget` operates on a fixed target dir and filters by prefix.
- **Intent routing table**: 56 intents across Research, Planning, Architecture, Implementation, Testing, Security, Meta. `wize-release` and `wize-changelog` are properly routed. Test validates all skills are covered (with documented exclusions).
- **Onboarding revamp**: `onboarding.js` is now 3 lines max, always ends with `→ /wize`. Contextual (brownfield, security-overlay). `wize-cli.js` delegates to `composeOnboarding()`.
- **CI workflow**: `.github/workflows/ci.yml` runs `npm test` + `npm run validate` on Node 20.x and 22.x for push/PR.
- **Research dispatcher**: `wize-research` now classifies and delegates to `wize-market-research`, `wize-domain-research`, or `wize-technical-research`. Pepper's agent.yaml lists all 3.
- **Release/changelog skills**: Well-structured workflows with prerequisites, inputs, outputs, steps, anti-patterns, and hand-offs. Keep a Changelog format. Semver bump is zero-dep.

---

## Recommendations

1. **Fix H1, H2, H3 before merge.** These are integration gaps that break discoverability (H1, H2) and correctness (H3).
2. **Consider M1**: Either document the re-sign flow more clearly in `wize-sec-scope` or add `--sign-scope` support directly to the scope skill.
3. **Fix L4**: Correct the step reference in `wize-help` (Step 2b → Step 2d).
4. **Add L1 test**: A quick test for `compose()` with both brownfield and security-overlay flags.
5. **Consider L3**: Add a warning when defaulting to `patch` bump in non-interactive mode.
