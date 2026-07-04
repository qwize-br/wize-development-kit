---
description: "1-analysis: Refresh Project Knowledge"
agent: wize-agent-analyst
---

# Refresh Project Knowledge

# Refresh Project Knowledge

**Goal.** Consolidate the dated bullets added to `document-project/*.md` over the sprint (via `wize-dev-story` step 8 and `wize-quick-dev` step 5) into a coherent, narrated, current-state baseline. Keep what's still true; demote what's outdated; archive what's no longer relevant.

This is the workflow that **keeps `document-project` honest over months**, instead of letting it stale within a sprint.

Pepper drives the consolidation. Peggy edits prose. Tony reviews architecture-snapshot changes. Hawkeye reviews risk-spots changes.

## When to run

- **End of sprint** (default cadence). `wize-help next` suggests it when it detects the sprint ended.
- **After a major epic ships.** Architecture often shifts visibly; this is the moment to consolidate.
- **Before onboarding a new engineer.** The baseline is the first thing they read; keep it fresh.
- **Before an audit / external review.** Same.

Don't run after every story — that's why each story already does its own inline update. This is the *periodic narration pass*.

## Inputs

- `.wize/knowledge/document-project/{overview,architecture-snapshot,conventions,dependencies,risk-spots,open-questions}.md`
- `.wize/implementation/tea/**/gate.md` from this sprint (look for `KN-NN` findings — they flag where the baseline got out of sync).
- Git log of the sprint window (`git log --since="<sprint-start>" --until="<sprint-end>"`).
- `.wize/implementation/sprint-status.md` (latest sprint block).

## Outputs

- Updated `.wize/knowledge/document-project/*.md` (in place).
- `.wize/knowledge/document-project/_history/{YYYY-Qn}/{sprint-N}.md` — sprint-scoped snapshot (frozen).
- Optional new entries appended to `open-questions.md`.

## Steps

### 1. Collect the inline notes

For each of the 5 axes, list every dated bullet added since the previous refresh (or since the baseline was created). They look like:

```
## 2026-06-12 — E01-S03
- Conventions: `data-testid="invite-*"` published as public contract.
- Risk: R-1 (mailer) mitigation confirmed.
```

Pepper extracts them by axis.

### 2. Narrate, don't list

For each axis, write a short paragraph that **integrates** the new bullets into the surrounding context. The bullets disappear; the prose grows. Each axis remains a single coherent file — not a chronological log.

Example for `conventions.md` before refresh:

```markdown
## Tests
Co-located with the file under test. `.spec.ts` for unit; `.e2e.ts` for end-to-end.
```

After refresh integrating an inline note "data-testid='invite-*' is a public contract":

```markdown
## Tests
Co-located with the file under test. `.spec.ts` for unit; `.e2e.ts` for end-to-end. Test IDs follow the `data-testid="{feature}-{element}"` convention and are treated as a **public contract** — renaming one is a breaking change for end-to-end tests; ping Hawkeye before changing.
```

### 3. Demote what's outdated

If a previous claim no longer holds (a service was retired, a convention was replaced), don't delete silently. Move it to a "Deprecated" section at the bottom of the file with the date it was replaced and the new pattern. Future readers need the breadcrumb.

### 4. Archive a sprint snapshot

Freeze the *current* state into `_history/{YYYY-Qn}/sprint-{N}.md`. This file is read-only after creation. Six months from now, when someone asks "when did we change the test-id convention?", the answer is in `_history/`.

### 5. Open questions sweep

Pull any `KN-NN` findings that weren't resolved (the gap was acknowledged but the doc still wasn't updated) and copy them as `open-questions.md` entries with owners.

### 6. Diff narrative

Append a one-paragraph summary to the bottom of each updated file:

```markdown
## Last refresh: 2026-06-25 (Sprint 7)
- Architecture: 2 new components documented (`<InviteForm>`, `<TeamList>`); ADR-008 anchored in the auth section.
- Conventions: test-id public contract documented; eslint plugin added (commit 7a3d2f).
- Risk-spots: R-1 (mailer) closed; R-7 (rate limiter) added.
- Dependencies: bumped zod, drizzle, expo (notes in dependencies.md).
- Overview: unchanged; no new top-level feature in this sprint.
```

### 7. Hand off

- All updated docs flip frontmatter `last_refreshed: YYYY-MM-DD`.
- Wizer announces in `sprint-status.md`: *"Knowledge refresh done; baseline current."*
- Maria Hill carries this into the retrospective: was the refresh smooth, or did the team accumulate too many KN findings?

## Frontmatter convention for `document-project/*.md`

Each baseline file ships with:

```yaml
---
status: baseline
owner: Pepper + Peggy
created: 2026-04-02
last_refreshed: 2026-06-25
sampled: "wkly + sprint refresh"
---
```

`last_refreshed` tells the next reader how much to trust the file vs read the more recent inline notes from `_history/`.

## Anti-patterns Pepper rejects

- **Refreshing into a chronological log.** That defeats narration; if a new dev opens `conventions.md` and sees 47 dated bullets, they can't form a mental model. Narrate.
- **Refresh without reading the gate findings.** `KN-NN` findings are exactly the gaps you should be patching here; ignoring them recreates the original problem.
- **Refresh every sprint regardless of activity.** If the sprint touched zero axes (rare but possible — a sprint of pure UI polish), say so in the diff narrative and skip the bulk of the work.
- **Demotion without breadcrumb.** Future readers need the trail.

## Hand-off

> Knowledge refresh for Sprint 7 done. Baseline current; 1 historical snapshot frozen at `_history/2026-Q2/sprint-7.md`. KN-01 closed, KN-03 still open (deferred to S8 — assigned to Aaliyah).
