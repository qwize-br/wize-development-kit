# Final Review — Epic 09 (ux-intent)

**Reviewer:** Hawkeye (Test Architect) + Tony Stark (System Architect)  
**Date:** 2026-08-08  
**Branch:** `feature/e09-s08-metadata-hygiene-ci` (recommended rename: `feature/e09-ux-intent-complete`)  
**Test results:** 532 pass, 0 fail, 5 skipped  
**Validate:** 78 files, all structural checks passed  

---

## Executive Summary

Epic 09 delivers all 10 stories across 3 sprints. The block scalar parser is fixed, every workflow/skill carries an intent-oriented `description`, the `wize-help` intent routing table has 56 entries covering all discoverable skills, `wize-research` is a proper dispatcher, `--sign-scope` works end-to-end, non-interactive install and honest uninstall are implemented, release/changelog skills exist, CI runs on push/PR, onboarding shows `→ /wize`, and `/wize` is a real alias. All 3 HIGH findings from the sprint 2–3 review are fixed in code. The remaining issues are documentation/consistency papercuts — none block merge, but 2 should be fixed before the next tag. Overall confidence is **MEDIUM-HIGH**.

---

## 1. Completeness Matrix

| Story | Delivered | Evidence | Tested | Risk |
|---|---|---|---|---|
| **S01** Block scalar parser fix | Yes | `render-shared.js:readBlockScalar` + 11 dedicated tests | Yes — literal `\|`, folded `>`, chomp, indent, blank lines, regression, validator | LOW |
| **S02** Intent descriptions (46+) | Yes | All 72 workflows/skills have `description:`; validator enforces | Yes — `test/intent-routing.test.js` + structural validator | LOW |
| **S03** Intent routing table (56 entries) | Yes | `wize-help/skill.md:113-199` | Yes — `test/intent-routing.test.js` validates coverage | LOW |
| **S04** Research dispatcher | Yes | `wize-research/workflow.md` classification guide + delegation | Yes — body tests + structural | LOW |
| **S05** `--sign-scope` + `wize-sec-scope` | Yes | `scope-parser.js:signScope()`, `generate-scope.js`, skill.md exists | Yes — 7 tests (idempotent, hash update, round-trip) | LOW |
| **S06** Non-interactive install + honest uninstall | Yes | `wize-cli.js` flags + `cleanAdapterTarget` in uninstall | Yes — install/uninstall tests | LOW |
| **S07** Release/changelog skills | Yes | `wize-release/workflow.md`, `wize-changelog/workflow.md` | Yes — body + structural tests | LOW |
| **S08** CI + metadata hygiene | Yes | `.github/workflows/ci.yml`, phase labels normalized, `doctor.js` fixed | Yes — CI valid, tests green | LOW |
| **S09** Onboarding `→ /wize` | Yes | `onboarding.js:22` returns `→ /wize` | Yes — `test/onboarding-security-overlay.test.js` | LOW |
| **S10** `/wize` alias | Yes | `wize/skill.md` with `aliases: [wize-help]` | Yes — structural tests | LOW |

---

## 2. HIGH Issues — Resolution Status

| ID | Finding | Status | Evidence |
|---|---|---|---|
| **H1** | `wize-sec-scope` missing from red-teamer `agent.yaml` | **FIXED** | `src/security-overlay/agents/red-teamer/agent.yaml:24-25` lists `wize-sec-scope` under `skills:`; `:28-29` lists `/wize-sec-scope` under `commands:` |
| **H2** | `wize-sec-scope` missing from intent routing table | **FIXED in code** | `src/orchestrator-skills/wize-help/skill.md:178` has `"criar escopo", "definir escopo", ... \| wize-sec-scope`. Test comment at `test/intent-routing.test.js:367` still says "triggered by phase heuristic, not user intent" — comment is **stale** but test passes. |
| **H3** | `sprint_status.yaml` typo in `wize-release` | **FIXED** | All references in `src/method-skills/4-implementation/wize-release/workflow.md` use hyphen `sprint-status.yaml`. Grepped entire `src/` — zero underscore variants remain. |

---

## 3. Remaining Findings (Post-Merge Cleanup Recommended)

### Should be fixed before next tag

| Severity | ID | Finding | File / Line | Fix |
|---|---|---|---|---|
| **LOW** | L2 (Sprint 1) | `~≤1h` stale reference in `AGENTS.md` template — contradicts no-estimates policy (v0.11.0) | `tools/installer/render-shared.js:298` | Replace `~≤1h` with `trivially scoped` |
| **LOW** | — | `AGENTS.md` root file rendered with stale `~≤1h` | `AGENTS.md:14` | Re-render after fixing `render-shared.js` |
| **LOW** | — | Version mismatch: `project.toml` and `package.json` say `0.11.0`, but E09 adds new features (release skills, sign-scope, non-interactive install). Per semver this is a minor bump. | `.wize/config/project.toml:6`, `package.json:4` | Bump to `0.12.0`; update `wize-release/workflow.md:69` reference |
| **LOW** | — | CHANGELOG.md `[Unreleased]` is empty — E09 changes not documented | `CHANGELOG.md:10` | Add E09 entry under `[Unreleased]` |

### Non-blocking (address in follow-up)

| Severity | ID | Finding | File / Line |
|---|---|---|---|
| MEDIUM | M3 (Sprint 2-3) | `wize-changelog` doesn't validate `sprint-status.yaml` structure before reading | `src/method-skills/4-implementation/wize-changelog/workflow.md:77` |
| MEDIUM | M1 (Sprint 2-3) | `wize-sec-scope` skill.md references `/wize-sec-pentest --sign-scope` for re-signing — slightly confusing | `src/security-overlay/skills/wize-sec-scope/skill.md:43` |
| LOW | M3 (Sprint 1) | `wize/skill.md` is a near-full duplicate of `wize-help/skill.md` (~150 vs ~148 lines) — drift risk | `src/orchestrator-skills/wize/skill.md` |
| LOW | L4 (Sprint 2-3) | `wize-help` fallback note says "Step 2b" but phase heuristic is "Step 2d" | `src/orchestrator-skills/wize-help/skill.md:111` |
| LOW | L1 (Sprint 2-3) | No test for combined brownfield + security-overlay in `onboarding.js` | `test/onboarding-security-overlay.test.js` |
| LOW | L3 (Sprint 2-3) | `wize-release` defaults to `patch` bump in non-interactive mode without warning | `src/method-skills/4-implementation/wize-release/workflow.md:76` |
| LOW | L1 (Sprint 1) | CI matrix dropped Node 24 (now 20.x / 22.x) — acceptable if documented | `.github/workflows/ci.yml:20` |

---

## 4. Confidence Level: MEDIUM-HIGH

### Why not HIGH

1. **Stale policy string (`~≤1h`)** in `render-shared.js:298` and `AGENTS.md:14` — the no-estimates policy was shipped in v0.11.0, but the generated onboarding template still references the old threshold. Every new install will emit an `AGENTS.md` with a policy that the skills themselves no longer use.
2. **Version number inconsistency** — `project.toml` and `package.json` say `0.11.0`, but this epic adds user-facing features (release skills, sign-scope, non-interactive install flags). The `wize-release` workflow itself references `0.11.0` as current. If this branch merges as `0.11.0`, the release skill will bump from `0.11.0` to `0.11.1` or `0.12.0`, but `0.11.0` already shipped on 2026-08-06.
3. **CHANGELOG gap** — `[Unreleased]` is empty. Users reading the changelog won't see what E09 changed.

### What could still go wrong

- **Intent table drift**: If a new skill is added without an intent table entry, `wize-help` falls back to phase heuristic. The `test/intent-routing.test.js` catches this, but only if the test is updated. (Mitigated: CI runs tests on every PR.)
- **Uninstall edge case**: `cleanAdapterTarget` filters by `wize-*` prefix and only touches paths returned by `adapterTargetPath`. It will never delete user files outside the project. Safe.
- **CI workflow**: Valid GitHub Actions syntax. Uses `actions/setup-node@v4` with `cache: npm`. `permissions: contents: read` is minimal. Low blast radius if it breaks (tests fail → PR blocked, nothing ships).
- **Block scalar parser**: The `readBlockScalar` implementation doesn't handle YAML comments after the block scalar indicator (e.g., `description: | # comment`). No kit file uses this pattern. Theoretical edge case, zero practical impact.

### Blast radius

| Component | Blast radius if broken |
|---|---|
| Block scalar parser | Rendered descriptions show `— \|` again → harnesses can't route. **Mitigated**: 11 tests + validator. |
| Intent routing table | User says "criar escopo" and gets phase heuristic instead of `wize-sec-scope`. **Fixed in code**. |
| `--sign-scope` | User has to manually compute SHA-256. **Fixed**: 7 tests pass. |
| Non-interactive install | CI / scripted installs fail. **Fixed**: flags work, tested. |
| Uninstall | Adapter dirs left dirty. **Fixed**: `cleanAdapterTarget` removes `wize-*` by prefix. |
| CI | Regressions slip through. **Fixed**: runs on push/PR. |

---

## 5. Deployment Readiness

| Check | Status | Notes |
|---|---|---|
| No debug code / TODOs / commented-out code | **PASS** | No stray TODOs/FIXMEs in JS. Only intentional mentions in `deep-dive.js` (scanner logic) and test fixtures. |
| Tests exercise changed behavior (not just structural) | **PASS** | Block scalar tests validate actual parsing output. Sign-scope tests validate hash recomputation. Intent routing tests validate table coverage. Onboarding tests validate the `→ /wize` string. |
| CI workflow valid | **PASS** | `.github/workflows/ci.yml` — valid syntax, correct triggers, minimal permissions. |
| Uninstall safe | **PASS** | Only deletes `wize-*` prefixed entries inside adapter target paths derived from `project.toml`. Never touches user files outside project. |
| Version consistent | **FAIL** | `project.toml:6` and `package.json:4` say `0.11.0`, but E09 is a feature epic. Should be `0.12.0`. |
| CHANGELOG updated | **FAIL** | `[Unreleased]` section empty. E09 changes not documented. |

---

## 6. Blockers for Merge

**None of the following are functional bugs — all 532 tests pass and `validate` is green.** They are consistency/policy blockers that should be fixed before the next tag, ideally in this PR.

1. **`tools/installer/render-shared.js:298`** — Replace `~≤1h` with `trivially scoped` to match no-estimates policy.
2. **`AGENTS.md:14`** — Re-render after fixing `render-shared.js` (or edit directly).
3. **`package.json:4`** and **`.wize/config/project.toml:6`** — Bump version to `0.12.0`.
4. **`CHANGELOG.md`** — Add `[Unreleased]` entry documenting E09 changes.

---

## 7. Recommendations

### Merge recommendation: **GO** (with conditions)

- **Merge the branch** after fixing items 1–4 above.
- **Rename branch** to `feature/e09-ux-intent-complete` (or merge as-is — the name doesn't affect the release).
- **Post-merge**: Update `sprint-status.yaml` comment to mark H1/H2/H3 as resolved.
- **Post-release**: Consider making `wize/skill.md` a thin delegation file instead of a 150-line duplicate (M3 from Sprint 1) to reduce drift risk.

### Why GO despite version/CHANGELOG gaps

The code is correct, the tests prove it, and the HIGH issues are resolved. The version/CHANGELOG gaps are release-process hygiene, not functional defects. Fixing them in this PR is cleaner than a follow-up, but they don't break users.

---

*End of review.*
