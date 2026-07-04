---
code: wize-quick-dev
name: Quick Dev (lifecycle shortcut)
phase: 4-implementation
owner: wize-agent-dev   # Shuri
status: ready
---

# Quick Dev

**Goal.** When the task is small and well-scoped (bug fix, copy edit, small refactor, dep bump, brownfield maintenance), skip Phase 1–3 and execute with light TEA. Save the full lifecycle for new value.

Wizer authorizes the shortcut (via routing). Shuri runs it. Hawkeye does smoke-only.

## When to use (yes)

- Bug fix with a clear root cause.
- Copy or content edit.
- Small refactor with no behavior change.
- Dependency bump (security or minor).
- Brownfield maintenance: rename, structural cleanup, dead-code removal.
- Hotfix during incident response (post-mortem after).

## When NOT to use (no)

- New feature, even small.
- Cross-cutting change touching architecture.
- Changes where ACs need to be agreed.
- Anything that should be a story.
- Anything that touches security/auth/payments without senior review.

## Decision tree

```
Question                              Yes              No
Is there an AC to write?              → full lifecycle  → next
Does it touch architecture?           → full lifecycle  → next
Does it need UX input?                → full lifecycle  → next
Could it surprise a user?             → full lifecycle  → next
Is it ≤ 1 hour to a careful dev?      → quick-dev       → full lifecycle
```

## Inputs

- Issue / Slack message / PR comment describing the problem.
- Repo state.
- `.wize/config/tea.toml` (smoke-only policy when `policy = "advisory"`).

## Output

- Code change (single PR).
- Single-line entry appended to `.wize/implementation/quick-dev-log.md`.
- Conventional commit.

## Steps

### 1. Frame in one paragraph

What changes, why, and what could break. If the paragraph is hard to write, you're not in quick-dev territory.

### 2. Implement

- TDD when reasonable; smoke-test-and-fix when the cost of TDD is greater than the value.
- Run Shuri's reuse ladder (see `wize-agent-dev` persona) before writing anything new: does this need to exist → already in the codebase → stdlib → native/framework feature → installed dependency → one-liner → only then new code. Don't introduce new abstractions.

### 3. Hawkeye lite

- Smoke test: imports load, the changed flow doesn't break.
- Lint + format + type-check clean.
- No `tea-design / trace / review / nfr` written.
- Single one-line gate entry instead of full `gate.md`.

### 4. Log

Append one line to `.wize/implementation/quick-dev-log.md`:

```
2026-06-11 | shuri | dep-bump zod 3.22→3.23 | smoke PASS | PR #418
2026-06-11 | shuri | fix copy on /signin help link | smoke PASS | PR #419
2026-06-11 | shuri | rename UserService → AccountService | smoke PASS | PR #420
```

### 5. Knowledge update (only if applicable)

Most quick-dev changes don't touch the baseline axes (copy edit, small refactor, dep bump in a stable lib). When they do — typically a **dependency bump** or a **rename that breaks a public contract** — add **one line** to the matching `document-project/*.md` file:

```markdown
## 2026-06-11
- Dependencies: bump zod 3.22 → 3.23. No API changes; validateInviteEmail unaffected.
- Conventions: `AccountService` replaces `UserService` (rename); imports updated repo-wide.
```

Heuristic: *"would a new dev hitting `document-project/*.md` next week be misled if I don't add this?"* Yes → write. No → skip.

### 6. Commit + open PR

Conventional commit. PR description: the paragraph from step 1.

```
fix(auth): typo in error message for AC-04-2 follow-up

The error shown after rate-limit said "Sloow down" — corrected to "Slow down".
No behavior change; copy-only.
```

## Quick-dev log template

```markdown
# Quick-dev log

| Date | Owner | What | Smoke | PR |
|---|---|---|---|---|
| 2026-06-11 | shuri | … | PASS | #N |
```

## Disabling

To force every change through the full lifecycle (for very high-stakes products), set in `.wize/config/project.toml`:

```toml
[install]
quick_dev_enabled = false
```

Wizer respects this; quick-dev becomes unavailable; every change must go through Pepper → … → Hawkeye gate.

## Anti-patterns Shuri rejects in herself

- Reaching for quick-dev to skip writing an AC because she doesn't want to argue with Hill.
- Quick-dev that touches security/auth/payments.
- A "small refactor" that ends up changing behavior.
- Skipping the log entry.

## Hand-off

> `dep-bump zod 3.23` is in. PR #418, smoke PASS. Logged. No further TEA artifacts; moving on.
