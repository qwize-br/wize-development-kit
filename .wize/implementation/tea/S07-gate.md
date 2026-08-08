---
story: E09-S07
gate: gate
status: done
created: 2026-08-08
owner: Hawkeye
epic: 09-ux-intent
decision: PASS
policy: advisory
---

# Gate Decision — E09-S07: Release/changelog skills

## AC → Test Traceability

| AC ID | Description | Evidence | Status |
|---|---|---|---|
| AC-S07-1 | `wize-release` workflow exists with bump + changelog + tag | `wize-release/workflow.md` — 162 lines, 8 steps | PASS |
| AC-S07-2 | `wize-changelog` workflow exists with Keep a Changelog format | `wize-changelog/workflow.md` — 184 lines, 6 steps | PASS |
| AC-S07-3 | Release verifies prerequisites (sprint done, git clean, branch main) | `wize-release/workflow.md:18-24` — 4 prerequisites | PASS |
| AC-S07-4 | Release collects gated stories from sprint-status.yaml | `wize-release/workflow.md:54-62` — Step 2 | PASS |
| AC-S07-5 | Release determines semver bump (patch/minor/major) | `wize-release/workflow.md:64-78` — Step 3, built-in bumpVersion | PASS |
| AC-S07-6 | Release delegates changelog generation to wize-changelog | `wize-release/workflow.md:80-87` — Step 4 | PASS |
| AC-S07-7 | Release bumps package.json version | `wize-release/workflow.md:89-91` — Step 5 | PASS |
| AC-S07-8 | Release commits + tags (no auto-push) | `wize-release/workflow.md:93-101` — Step 6, "Não executar git push automaticamente" | PASS |
| AC-S07-9 | Release updates sprint-status.yaml | `wize-release/workflow.md:103-113` — Step 7 | PASS |
| AC-S07-10 | Changelog follows Keep a Changelog 1.1.0 | `wize-changelog/workflow.md:28-53` — format spec | PASS |
| AC-S07-11 | Changelog classifies stories by category (Added/Changed/Fixed/Security) | `wize-changelog/workflow.md:57-65` — category rules | PASS |
| AC-S07-12 | Changelog groups by epic within categories | `wize-changelog/workflow.md:66-71` — grouping rules | PASS |
| AC-S07-13 | Changelog handles missing CHANGELOG.md (creates header) | `wize-changelog/workflow.md:133-144` — Step 5 | PASS |
| AC-S07-14 | Changelog inserts between [Unreleased] and first version | `wize-changelog/workflow.md:146-149` — Step 5 | PASS |
| AC-S07-15 | Intent table routes "release" → wize-release | `intent-routing.test.js:323` — coverage check | PASS |
| AC-S07-16 | Intent table routes "changelog" → wize-changelog | `intent-routing.test.js:323` — coverage check | PASS |
| AC-S07-17 | Phase heuristic step 20 routes to wize-release | `wize-help/skill.md:103` — "All stories gated PASS/CONCERNS… → wize-release" | PASS |
| AC-S07-18 | Anti-patterns documented (no partial release, no auto-push, no skip changelog) | `wize-release/workflow.md:152-158` | PASS |

## Test Results

- **Suite**: `npm test` — 532 pass, 0 fail, 5 skipped
- **Intent routing tests**: Release and changelog entries verified in coverage test
- **Workflow body tests**: Both `wize-release/workflow.md` and `wize-changelog/workflow.md` pass the non-stub body check
- **No dedicated unit tests**: Release and changelog are AI-native workflows. The bumpVersion function is documented inline but has no unit test file.

## NFR Assessment

- **Maintainability**: Both skills are self-contained workflows with clear inputs, outputs, and anti-patterns. The changelog delegates to `wize-changelog` — separation of concerns.
- **Reliability**: Release enforces 4 prerequisites before proceeding (sprint done, git clean, branch main, all stories gated). No auto-push — the developer reviews before publishing. Changelog handles missing files gracefully (creates header).
- **Security**: Release does not auto-push — prevents accidental publication. Git operations are explicit and reviewable.

## Findings

1. **Finding**: `bumpVersion` is documented inline in the workflow (lines 140-149) but has no unit test. The function is simple (3-line switch) but a typo in the regex or arithmetic could produce wrong versions.
   **Impact**: Low. The function is trivial. If it fails, the release step would produce a visibly wrong version number.
   **Recommendation**: Add a unit test for `bumpVersion` with inputs: `("0.11.0", "patch")`, `("0.11.0", "minor")`, `("0.11.0", "major")`, `("1.0.0", "patch")`. Shuri owns this. Not blocking.

2. **Finding**: The changelog classification (Step 2) uses keyword matching on story titles. This is AI-native — the AI reads the story and classifies it. There is no programmatic classifier.
   **Impact**: Low. Consistent with wize-dev-kit architecture. The classification rules are explicit (table at lines 89-96).
   **Recommendation**: None.

3. **Finding**: S03 dependency is satisfied. The intent table routes "release", "lançar", "publicar", "deploy core", "bump versão", "tag", "shipping" → `wize-release` and "changelog", "notas de versão", "release notes", "gerar changelog" → `wize-changelog`. The phase heuristic step 20 also routes to `wize-release`.
   **Impact**: None. Dependency met.
   **Recommendation**: None.

## Gate Decision: PASS

**Rationale**: Both skills are complete AI-native workflows with clear steps, inputs, outputs, and anti-patterns. Release enforces prerequisites and delegates changelog generation. Changelog follows Keep a Changelog 1.1.0 with proper categorization and epic grouping. Intent table and phase heuristic both route to these skills. All tests pass. The S03 dependency is satisfied.

**Minor gap** (not blocking): `bumpVersion` function lacks a unit test.
