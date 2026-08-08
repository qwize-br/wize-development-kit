---
story: E09-S09
gate: gate
status: done
created: 2026-08-08
owner: Hawkeye
epic: 09-ux-intent
decision: PASS
policy: advisory
---

# Gate Decision — E09-S09: Onboarding revamp (→ /wize one-liner)

## AC → Test Traceability

| AC ID | Description | Test(s) | Status |
|---|---|---|---|
| AC-S09-1 | Post-install shows `→ /wize` (one-liner, not multi-line menu) | `onboarding-security-overlay.test.js:11` — greenfield core-only returns `→ /wize` | PASS |
| AC-S09-2 | Brownfield detection adds context line | `onboarding-security-overlay.test.js:16` — "Brownfield detected" + `→ /wize` | PASS |
| AC-S09-3 | Security-overlay adds mention without breaking one-liner | `onboarding-security-overlay.test.js:53` — "Security pentest" + `→ /wize` | PASS |
| AC-S09-4 | Output is always ≤3 lines | `onboarding-security-overlay.test.js:35,47` — all profiles, both greenfield/brownfield | PASS |
| AC-S09-5 | Web-overlay and app-overlay do not add extra lines | `onboarding-security-overlay.test.js:65` — returns just `→ /wize` | PASS |
| AC-S09-6 | `compose()` function is the single source of truth | `onboarding.js:10-24` — 15-line function, 3 branches | PASS |
| AC-S09-7 | Onboarding workflow delegates discovery to Wizer | `wize-onboarding/workflow.md:10-12` — "Wizer drives. Each branch ends by handing off to a specific workflow" | PASS |
| AC-S09-8 | Onboarding workflow has state machine (S0-S4) | `wize-onboarding/workflow.md:52-68` — 5 states with hand-off per state | PASS |
| AC-S09-9 | Onboarding never auto-launches next workflow | `wize-onboarding/workflow.md:76` — "Never auto-launch the next workflow. The user must confirm." | PASS |
| AC-S09-10 | Onboarding skips when `WIZE_SKIP_ONBOARDING=1` | `wize-onboarding/workflow.md:81` — documented | PASS |
| AC-S09-11 | Onboarding anti-patterns documented | `wize-onboarding/workflow.md:83-88` — 4 anti-patterns | PASS |

## Test Results

- **Suite**: `npm test` — 532 pass, 0 fail, 5 skipped
- **Onboarding tests**: 7/7 pass (`test/onboarding-security-overlay.test.js`)
- **Workflow body tests**: `wize-onboarding/workflow.md` passes non-stub body check

## NFR Assessment

- **Maintainability**: `compose()` is a 15-line pure function with 3 branches. Easy to extend for new profiles. The onboarding workflow is a separate AI-native skill — post-install one-liner and guided onboarding are decoupled.
- **Reliability**: Output is bounded to ≤3 lines — prevents the old 15-line wall of text. `WIZE_SKIP_ONBOARDING=1` allows CI/CD environments to bypass.
- **Performance**: `compose()` is O(1) — iterates profiles once, builds ≤3 strings.

## Findings

1. **Finding**: The `compose()` function always ends with `→ /wize`. This depends on S10 (`/wize` alias) being implemented. S10 is in Sprint 1 alongside S01 and S08.
   **Impact**: Low. S10 is already implemented (`src/orchestrator-skills/wize/skill.md` exists, references `wize-help`). The dependency is satisfied.
   **Recommendation**: None.

2. **Finding**: The onboarding workflow (`wize-onboarding/workflow.md`) is a full guided triage (92 lines, 5 states). The post-install one-liner (`onboarding.js`) is a separate, minimal entry point. This is the correct separation — the one-liner invites the user to `/wize`, and Wizer takes over from there.
   **Impact**: Positive. Clean separation of concerns.
   **Recommendation**: None.

3. **Finding**: The review-sprint-1.md noted that the test asserts `→ /wize-help` but the epic spec says `→ /wize`. The current tests assert `→ /wize` — this was corrected.
   **Impact**: None. Already resolved.
   **Recommendation**: None.

## Gate Decision: PASS

**Rationale**: The post-install onboarding is now a clean ≤3-line message ending with `→ /wize`. The `compose()` function handles greenfield, brownfield, and all overlay profiles. The full guided onboarding workflow (`wize-onboarding`) is a separate AI-native skill with a 5-state machine. 7 tests validate all scenarios. The S10 dependency (`/wize` alias) is satisfied. All tests pass.
