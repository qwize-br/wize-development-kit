---
epic: 09-ux-intent
gate: risk
status: done
created: 2026-08-08
owner: Hawkeye
policy: advisory
---

# Risk Profile — Epic 09 (ux-intent)

## Evidence gathered

- **S01**: `readFrontmatter` (render-shared.js:56-67) does not handle block scalars (`|`, `>`). `readYamlField` (line 15-54) does. 10 agent.yaml files use `description: |` — these are read via `readYamlField` (line 135) and currently render correctly. The risk is latent: if any workflow/skill frontmatter ever uses block scalars, `readFrontmatter` will return the literal `|` character. Currently 0 of 47 workflows have `description:` in frontmatter at all.
- **S02**: 46 of 47 workflows lack `description:` in frontmatter. Fallback at render-shared.js:157 produces `"${phase}: ${name}"` — zero intent information. 272 rendered SKILL.md files across all harnesses carry these synthetic descriptions. In Cursor/Claude Code, the description IS the discovery trigger.
- **S03**: `wize-help.md` routes by phase only (heuristic at line 51-60). No intent→skill mapping exists. Blast radius: every `/wize-help` invocation across all users.
- **S04**: 4 research skills (`wize-research`, `wize-market-research`, `wize-domain-research`, `wize-technical-research`) with overlapping territory. `wize-research` duplicates `wize-market-research` scope. No dispatch between them.
- **S05**: `--sign-scope` flag referenced in error messages (scope-parser.js:76,87) but not implemented in `run-pipeline.js` (only handles `--active`/`--scope`). Users get dead-end instructions.
- **S06**: `cmdInstall` ignores all CLI args (wize-cli.js:428). `cmdUninstall` is a stub (line 552-564) — removes only `.wize/`, leaves 68+ skill dirs in `.claude/skills/`, 68 `.cursor/rules/*.mdc`, 68 `.opencode/` files. Destructive if uninstall is partial and user assumes clean state.
- **S07**: No release/changelog skill in core profile. New cluster in 4-implementation. Greenfield — no regression risk, but integration with `wize-help` routing (S03) is a dependency.
- **S08**: No CI exists (`.github/workflows/` empty). Tests only run on publish-by-tag. Metadata inconsistencies: `wize-edit-prd` uses `phase: 2-plan-workflows` (siblings use `2-plan`), `wize-tech-vision`/`wize-nfr-principles` use `2-to-3-boundary` but live in `3-solutioning`, TEA skills use `gate:` instead of `phase:`. `/wize` alias referenced but never created.

## Risk matrix

| Story | Likelihood | Impact | Risk level | Rationale |
|---|---|---|---|---|
| **E09-S01** | Medium | **Critical** | **HIGH** | `readFrontmatter` block-scalar bug is latent — no workflow uses `description:` today, but if S02 adds block scalars to 46 files, the parser will break silently. Impact: all harness descriptions become `— \|` for every skill. Currently contained because agents use `readYamlField` (which works), but S02 changes the surface. |
| **E09-S02** | **High** | High | **HIGH** | Touches 46+ files across all skill families. Every edit is a potential frontmatter syntax error. Fallback description is the discovery mechanism in Cursor/Claude Code — wrong descriptions = wrong routing = user can't find skills. Regression surface: all 272 rendered SKILL.md files must be re-rendered and validated. |
| **E09-S03** | Medium | **Critical** | **CRITICAL** | Changes the main entry point (`wize-help`). If intent routing is wrong, users are sent to the wrong skill silently. No fallback — the phase heuristic is being complemented, not replaced, but intent matches take priority. Wrong mapping = user frustration + loss of trust in the kit's intelligence. |
| **E09-S04** | Medium | Medium | **MEDIUM** | Consolidation of 4 skills. Risk is scope creep (trying to merge when dispatch is sufficient) and breaking existing research workflows. `wize-research` is the most-used analysis skill — changing its behavior affects every Phase 1 invocation. |
| **E09-S05** | Low | Medium | **LOW** | Security-overlay only. `--sign-scope` is additive (new flag). Error message fix is low-risk. Guided scope creation (`wize-sec-scope`) is new — no existing flow to break. |
| **E09-S06** | **High** | **Critical** | **CRITICAL** | `cmdUninstall` is destructive if wrong. Currently leaves 204+ files (68 dirs × 3 adapters) behind — user thinks they're clean but old skills persist. `cmdInstall` non-interactive mode must handle all 5+ flags correctly or installs will be wrong/missing profiles. No dry-run exists. |
| **E09-S07** | Low | Low | **LOW** | Greenfield. New skills, no existing behavior to regress. Integration point with S03 (routing) is the only risk — if `wize-help` doesn't route to the new release skill, it's undiscoverable. |
| **E09-S08** | Medium | Medium | **MEDIUM** | CI addition is infrastructure — if CI is misconfigured (wrong Node version, missing secrets, flaky tests), it blocks all PRs. Metadata normalization touches 5+ files with different phase labels — easy to miss one. `/wize` alias removal is safe (it doesn't exist). `doctor.js` suggestion fix is cosmetic. |

## Top 3 risks with mitigations

### Risk 1: S06 — Uninstall leaves adapters behind (CRITICAL)

**Finding**: `cmdUninstall` only removes `.wize/`. 68 skill dirs in `.claude/skills/`, 68 `.cursor/rules/*.mdc`, 68 `.opencode/agents/*` (and more in other adapters) remain. User believes the kit is gone but stale skills still influence the IDE.

**Impact**: Stale skills can conflict with a fresh install, cause duplicate routing, or execute old/dangerous behavior. Security overlay skills left behind after uninstall could still be invocable.

**Mitigation**:
1. Reuse `adapterTargetPath` from `commands/doctor.js` to enumerate all adapter output dirs
2. Read `project.toml` for active targets — only clean what was installed
3. Add `--dry-run` flag to uninstall that lists what would be removed
4. Add confirmation prompt listing directories before deletion
5. Test: install → verify files exist → uninstall → verify ALL adapter dirs are clean of `wize-*`

### Risk 2: S03 — Intent routing sends users to wrong skill (CRITICAL)

**Finding**: `wize-help` is the front door. Intent-based routing adds a new matching layer before the phase heuristic. A wrong mapping (e.g., "quero pesquisar concorrência" → `wize-domain-research` instead of `wize-market-research`) is a silent failure — the user gets a skill that doesn't match their intent.

**Impact**: Every user who invokes `/wize-help` with a fuzzy demand. Trust erosion if the kit routes incorrectly. No feedback loop — user may not realize they got the wrong skill until they've already invested time.

**Mitigation**:
1. Intent table must be exhaustive with explicit fallback ("if no intent matches, fall through to phase heuristic")
2. Each intent entry must have a unique, non-overlapping trigger phrase set
3. Add a confirmation line in the response: "Rotei para {skill} porque detectei intenção '{intent}'. Se não for isso, diga 'não' e eu roteio por fase."
4. Test: for each of the 4 research variants, assert that the canonical trigger phrase routes to the correct skill
5. Test: ambiguous phrases ("pesquisar") should fall through to phase heuristic, not pick arbitrarily

### Risk 3: S01+S02 combined — Block scalar parser breaks all descriptions (HIGH)

**Finding**: S01 fixes `readFrontmatter` to handle block scalars. S02 adds `description:` with block scalars to 46 files. If S01 is incomplete or S02 uses a YAML construct the fixed parser doesn't handle (nested scalars, chomp indicators, trailing whitespace), all 46 descriptions render as `— |` across all 272 SKILL.md files.

**Impact**: Total loss of skill discovery in Cursor/Claude Code. The harness shows every skill with the same broken description. Users cannot find skills by intent.

**Mitigation**:
1. S01 must ship and be validated BEFORE S02 starts (dependency already declared in epic)
2. Parser fix must handle: `|`, `|+`, `|-`, `>`, `>+`, `>-`, with explicit indentation indicators (`|2`, `>2`)
3. Add a validator that rejects any rendered SKILL.md with description ending in `— |` or `— >`
4. Add a validator that rejects any workflow.md/skill.md with `description:` that doesn't resolve to ≥20 chars of meaningful text
5. Test matrix: render all 47 workflows with block scalars → validate all 272 SKILL.md descriptions are non-empty, non-synthetic, and contain intent language

## Recommended test strategy per story

### E09-S01 — Block scalar parser fix
- **Unit**: `readFrontmatter` with `|`, `|+`, `|-`, `>`, `>+`, `>-`, indented block, empty block, block with blank lines, block adjacent to other frontmatter keys
- **Unit**: `readYamlField` regression — existing block scalar behavior must not change
- **Integration**: Render a test agent with `description: |` → assert SKILL.md description is the full block, not `— |`
- **Validation**: Add lint rule: no rendered SKILL.md description ends with `— |` or `— >`

### E09-S02 — Add description to 46 workflows
- **Validation**: Pre-commit hook that asserts every workflow.md and skill.md has `description:` with ≥20 chars
- **Integration**: Full render → assert all 272 SKILL.md descriptions are non-synthetic (don't match `${phase}: ${name}` pattern)
- **Smoke**: Install kit on a test project → invoke `/wize-help` → verify skill list shows intent descriptions, not phase labels

### E09-S03 — Intent-based routing in wize-help
- **Unit**: Intent table lookup — for each canonical trigger phrase, assert correct skill code
- **Unit**: Fallthrough — ambiguous phrase returns phase-heuristic result, not arbitrary intent match
- **Unit**: No match → phase heuristic still works
- **Integration**: `/wize-help "quero pesquisar concorrência"` → routes to `wize-market-research`
- **Integration**: `/wize-help "quero fazer um release"` → routes to `wize-release` (S07 dependency)
- **E2E**: Full conversation simulation — user says intent, gets routed, confirms or rejects

### E09-S04 — Research family consolidation
- **Unit**: `wize-research` dispatcher — classify question type → delegate to correct variant
- **Integration**: Each variant receives correct input from dispatcher
- **Regression**: Existing `wize-research` invocations still work (backward compat)
- **Smoke**: Run all 4 research skills on the same question → verify they produce different, non-overlapping outputs

### E09-S05 — --sign-scope + guided scope
- **Unit**: `--sign-scope` flag recomputes SHA-256 and rewrites `scope_sha256`
- **Unit**: `--sign-scope` on unsigned scope → creates signature
- **Unit**: `--sign-scope` on tampered scope → updates signature
- **Integration**: Full pipeline with signed scope → no HASH_MISMATCH error
- **Smoke**: `wize-sec-pentest --sign-scope` on a test scope.md → verify `scope_sha256` is updated

### E09-S06 — Non-interactive install + uninstall
- **Unit**: `cmdInstall` with `--profiles core --targets claude-code --lang pt-BR --yes --name test-project`
- **Unit**: `cmdInstall` with missing required flag → clear error, not silent default
- **Unit**: `cmdUninstall` removes all adapter dirs (`.claude/skills/wize-*`, `.cursor/rules/wize-*`, `.opencode/agents/wize-*`)
- **Unit**: `cmdUninstall --dry-run` lists what would be removed without deleting
- **Integration**: Install → verify files → uninstall → verify zero `wize-*` files remain in any adapter dir
- **Integration**: Install non-interactively in a non-TTY environment (CI) → succeeds
- **Regression**: Interactive install (existing flow) still works unchanged

### E09-S07 — Release/changelog skills
- **Unit**: `wize-release` bump logic — semver increment
- **Unit**: `wize-changelog` generation from gated stories
- **Integration**: `wize-help` routes "fazer release" → `wize-release`
- **Smoke**: Full release flow on a test project → version bumped, changelog generated, tag created

### E09-S08 — Metadata hygiene + CI
- **Unit**: Phase label normalizer — `2-plan-workflows` → `2-plan`, `2-to-3-boundary` → `2-plan` or `3-solutioning`
- **Unit**: `doctor.js` suggestions use correct invocation format (slash commands, not shell commands)
- **Unit**: `/wize` alias removed from all references
- **CI**: `.github/workflows/ci.yml` runs `npm test && npm run validate` on push/PR
- **CI**: CI fails on test failure, validate failure, or lint failure
- **Smoke**: Open a test PR → CI runs → passes

## Dependency risk

| Dependency | Risk | Mitigation |
|---|---|---|
| S01 → S02 | S02 adds block scalars before S01 parser is fixed → all descriptions break | Enforce S01 gate PASS before S02 starts. Epic already declares this dependency. |
| S01+S02 → S03 | S03 intent routing depends on descriptions from S02 → if S02 descriptions are wrong, S03 routes wrong | S03 must validate descriptions at runtime: if a skill's description is synthetic (matches `${phase}: ${name}`), log warning and skip intent match for that skill. |
| S03 → S07 | S07 release skill must be routable via S03 intent table | S07 must register its intent triggers in the same table S03 uses. |
| S08 CI → all | CI must exist early to protect S01-S07 from regressions | S08 CI should be the FIRST story implemented, or at minimum implemented in parallel with S01. Epic note confirms this. |

## NFR considerations

- **Performance**: S03 intent routing adds a lookup step to every `/wize-help` invocation. Must be O(1) or O(log n) — no linear scan of 73 assets on every call.
- **Maintainability**: S02 adds `description:` to 46 files. Future skills must include `description:` — enforce via validator (S08 CI).
- **Reliability**: S06 uninstall must be atomic — partial cleanup is worse than no cleanup. If any adapter dir fails to delete, roll back or report clearly.
- **Security**: S06 uninstall of security-overlay skills must be thorough — leaving `wize-sec-*` skills behind after uninstall is a security risk (stale authorized scope references).

## Gate decision

**Risk profile: COMPLETE.** Epic 09 carries two CRITICAL risks (S06 uninstall, S03 routing) and two HIGH risks (S01+S02 combined, S02 regression surface). Mitigations are documented above. S08 CI should be prioritized to protect the rest of the epic.

Policy is `advisory` — gates will not block merges, but CONCERNS or FAIL on any story will be visible warnings.
