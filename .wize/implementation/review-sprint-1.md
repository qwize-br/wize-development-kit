# Sprint 1 Code Review — E09 Foundation

**Date:** 2026-08-08
**Reviewer:** automated review
**Suite:** 441 pass, 0 fail, 5 skip (446 total)
**Validate:** 75 files, all structural checks passed

---

## Overall Assessment: **APPROVE** (with recommendations)

No blocking issues. The block scalar parser is correct, tests are green, CI is valid, and the `/wize` alias is wired end-to-end. Three medium-severity items should be addressed before Sprint 2.

---

## Findings by Severity

### MEDIUM

#### M1 — `onboarding.js` returns `→ /wize-help` instead of `→ /wize`

**File:** `tools/installer/onboarding.js:10`
**Test:** `test/onboarding-security-overlay.test.js:13`

The epic spec (E09-S09) states the post-install one-liner should be `→ /wize` (or `→ /wize-help`). Since `/wize` is now the primary entry point and `/wize-help` is the canonical fallback, the onboarding should show the primary alias. The test asserts `→ /wize-help`, which matches the code but contradicts the intent.

**Fix:** Change `onboarding.js:10` to `return '→ /wize';` and update the test assertion accordingly.

#### M2 — `renderAgentsMd` still references `/wize-help` as primary

**File:** `tools/installer/render-shared.js:297,313`

Two lines in the generated `AGENTS.md` template still use `/wize-help` as the primary entry point:
- Line 297: `'Before editing, classify the demand via \`/wize-help\`: ...'`
- Line 313: `'Activate the orchestrator: \`/wize-help\`. Wizer will guide you.'`

These should reference `/wize` (or both) to match the new primary alias.

**Fix:** Change to `/wize` (or `/wize` / `/wize-help`) in both lines.

#### M3 — `wize/skill.md` is a near-full duplicate of `wize-help/skill.md`

**Files:** `src/orchestrator-skills/wize/skill.md` (150 lines), `src/orchestrator-skills/wize-help/skill.md` (148 lines)

The alias skill duplicates the entire help skill body. Any future change to the routing table, modes, or mission contract must be applied to both files. This is a maintenance burden and a drift risk.

**Recommendation:** Consider making `wize/skill.md` a thin delegation file (e.g., "This is an alias for `/wize-help`. Load `wize-help/skill.md` and execute it as if `/wize-help` was invoked.") rather than a full copy. If the harness requires a complete file, add a CI check (or validator) that ensures the two files stay in sync.

---

### LOW

#### L1 — CI matrix dropped Node 24

**File:** `.github/workflows/ci.yml:20`

Matrix changed from `['20', '24']` to `['20.x', '22.x']`. Node 24 coverage was removed. If intentional (Node 24 not LTS), this is fine — but the `.x` suffix on `20.x` and `22.x` is unnecessary since `setup-node@v4` resolves bare major versions.

**Recommendation:** Use `['20', '22']` (no `.x`) or document why 24 was dropped.

#### L2 — `renderAgentsMd` still has `~≤1h` time threshold

**File:** `tools/installer/render-shared.js:298`

The no-estimates policy (v0.11.0) removed the `~≤1h` time threshold from `wize-help/skill.md` and `wize/skill.md`, but the `AGENTS.md` template in `renderAgentsMd` still reads:
```
'~≤1h, no new feature / architecture / UX / security) or **Full Lifecycle**. Never pick',
```

**Fix:** Replace `~≤1h` with `trivially scoped` to match the skill files.

#### L3 — Block scalar parser doesn't handle YAML comments after indicator

**File:** `tools/installer/render-shared.js:50,76`

The regex `^([|>])[+-]?\d*\s*$` rejects `description: | # comment` (the `#` is not whitespace). The value falls through to the inline scalar path and returns `| # comment` as the literal value. In practice, no kit file uses comments after block scalar indicators, so this is theoretical.

**Recommendation:** Add a comment-stripping step before the regex match, or document that comments after block indicators are unsupported.

---

## Checklist Results

### 1. Correctness — PASS
- Literal `|`: correct (preserves newlines)
- Folded `>`: correct (folds consecutive lines with space, preserves paragraph breaks)
- Chomp indicators (`|-`, `|+`, `>-`, `>+`): correct
- Indent indicators (`|2`, `>4`): correct
- Blank lines inside blocks: preserved
- Mixed inline + block: correct (block scalar advances `i` past consumed lines)
- Last field in frontmatter: correct (reads to end of frontmatter lines)

### 2. Regression safety — PASS
- `readYamlField` still works for inline and quoted scalars (tested)
- `collectAssets` still works for agents, workflows, and skills (tested)
- All 441 existing tests pass

### 3. Security — PASS
- No `execFile`, `shell`, or path traversal in new code
- `tool-contract-*.test.js` uses `execFileSync` with hardcoded args — no injection surface
- `onboarding.js` is a pure function

### 4. Performance — PASS
- `readBlockScalar`: O(n) single pass over lines
- `readFrontmatter`: O(n) single pass
- No unnecessary allocations or O(n²) patterns

### 5. Code quality — PASS (with notes)
- DRY: `readBlockScalar` is shared between `readYamlField` and `readFrontmatter` — good
- Naming: clear and consistent
- Error handling: `readYamlField` returns `null` for missing fields; `readFrontmatter` returns `{}` for missing/invalid frontmatter — graceful degradation
- M3 (duplicate skill files) is the only DRY concern

### 6. Test quality — PASS
- 16 block scalar tests cover: literal, folded, chomp, indent, blank lines, mixed, regression, validator, integration
- Tool contract tests (recon + exploit) cover 8 tools with real binary invocations
- Onboarding tests cover all profile combinations
- Assertions are meaningful and test observable behavior

### 7. CI validity — PASS
- Valid GitHub Actions syntax
- `on: push, pull_request, workflow_dispatch` — correct triggers
- `npm ci` → `npm test` → `npm run validate` — correct order
- `permissions: contents: read` — minimal

### 8. Onboarding — PASS (with M1 note)
- Returns a single line (no multi-line menu)
- Works for all profiles (core, web, app, security) — tested
- M1: should return `→ /wize` not `→ /wize-help`

### 9. Alias correctness — PASS
- `/wize` delegates to `wize-help` behavior
- Both are listed in `module.yaml` and `agent.yaml`
- Both are discoverable via `AGENTS.md` roster and `wize-help` modes table
- M2: `AGENTS.md` template still references `/wize-help` as primary

---

## Recommendations for Sprint 2

1. **Fix M1** — change onboarding to `→ /wize` (1 line change + 1 test assertion)
2. **Fix M2** — update `renderAgentsMd` to reference `/wize` (2 lines)
3. **Fix L2** — remove `~≤1h` from `renderAgentsMd` template (1 line)
4. **Address M3** — decide on sync strategy for `wize/skill.md` vs `wize-help/skill.md`
5. **Address L1** — document or revert Node version matrix change
