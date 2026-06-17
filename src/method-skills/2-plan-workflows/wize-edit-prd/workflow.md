---
code: wize-edit-prd
name: Edit PRD
phase: 2-plan-workflows
owner: wize-agent-pm   # Maria Hill
status: ready
---

# Edit PRD

**Goal.** Update `.wize/planning/prd.md` without rewriting from scratch. Every change is recorded in `.wize/planning/prd-changelog.md` so the team can see *what* changed, *when*, *why*, and *by whom*.

Maria Hill drives. Peggy polishes prose on the diff. Wizer is on call for cross-cutting impacts (architecture, NFR, scope).

## When to run

- A new AC is needed (new requirement from the user, market shift, regulator).
- An AC is no longer correct (validated learning, scoping mistake).
- An item moves in-scope ↔ out-of-scope.
- A non-goal is added or removed.
- A new decision is made that affects the PRD (e.g., cut a feature).

## When NOT to run

- Rewriting the PRD from scratch → use `/wize-create-prd`.
- Validating the PRD → use `/wize-validate-prd`.

## Inputs

- `.wize/planning/prd.md` (current)
- A free-form change request from the user.

## Output

- Updated `.wize/planning/prd.md`.
- New row in `.wize/planning/prd-changelog.md` (one row per change).

## Steps

### 1. Read the current PRD

Parse the PRD frontmatter (`status`, `owner`, `created`, `last_updated`) and the body. Confirm the change is in scope of "edit" (not a rewrite). If the change touches > 25% of the PRD, route to `/wize-create-prd` instead.

### 2. Classify the edit

Pick exactly one type:

- **A** — Add or change an AC.
- **B** — Move item in-scope ↔ out-of-scope.
- **C** — Add or remove a non-goal.
- **D** — Register a decision that affects the PRD (link to ADR or sprint decision).

One edit per run. Re-run for additional edits.

### 3. Apply the edit

Make the change in `prd.md`. Mark the changed section with a trailing note: `(edited 2026-06-15, see changelog row 4)`.

Update frontmatter: `last_updated` to today; `status` stays the same (only `/wize-validate-prd` flips it to `validated`).

### 4. Append to changelog

Add a row to `prd-changelog.md`:

```markdown
| Date | Type | Section | Change | Author |
|---|---|---|---|---|
| 2026-06-15 | A | AC-04-2 | Added: "rate limit per team" | Hill |
| 2026-06-15 | B | Out of scope | Removed "bulk invite" (now in scope per E04-S02) | Hill |
```

### 5. Cross-cutting check

Wizer flags any downstream impact:

- New AC → check that the epic + stories covering it exist. If not, route to `/wize-create-epics-and-stories`.
- New non-goal → check that no in-flight story assumes the opposite. If yes, flag the story.
- In-scope move → trigger a fresh `/wize-sprint-planning` consideration.

### 6. Hand off

Notify the next workflow:

- If AC changed → `/wize-validate-prd` to confirm consistency.
- If epic + stories need refresh → `/wize-create-epics-and-stories`.
- If sprint needs re-prioritization → `/wize-sprint-planning`.

## Output template — `prd-changelog.md`

```markdown
# PRD changelog

| # | Date | Type | Section | Change | Author |
|---|---|---|---|---|---|
| 1 | 2026-06-15 | A | AC-04-2 | Added: "rate limit per team" | Hill |
| 2 | 2026-06-15 | B | Out of scope | Removed "bulk invite" | Hill |
```

## Anti-patterns Hill rejects

- Editing the PRD without recording the change in the changelog. (Source-of-truth drift.)
- Bundling 4 edits in one run. (One edit per run keeps blame clean.)
- Editing the PRD without checking downstream impact. (Wizer’s cross-cutting step is mandatory.)
- Re-running `/wize-create-prd` to "keep things tidy." The changelog exists for that.

## Hand-off

> "PRD updated at `.wize/planning/prd.md`. Changelog row N appended. Next: `/wize-validate-prd` (re-validate) or `/wize-create-epics-and-stories` (refresh stories)."
