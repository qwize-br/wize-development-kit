# Dev Story

> 4-implementation: Dev Story

# Dev Story

**Goal.** Implement one story under TDD discipline. Tests first; minimum code to pass; refactor with green. Each commit cites an AC ID. The PR ends in a clean gate, not a "looks good to me."

Shuri drives. Hawkeye observes (test design is binding). Tony stays available for architectural questions.

## Operating contract

I work inside a repo with WDK installed: `.wize/`, `AGENTS.md`, and the `wize-*` skills are my instructions and memory, not background reading. This section is the execution slice of the story's **mission contract** (see `/wize-help mission`).

- **Inspect before editing.** Read the story, its sources of truth, and the touched code first.
- **Reuse ladder before new code** (see `wize-agent-dev` persona): needs to exist → already here → stdlib → framework feature → installed dep → one-liner → only then new code.
- **Test-first, unconditionally.** Red before green, per the loop below — this is the strict-TDD workflow; the "when applicable" latitude lives in `wize-quick-dev`, not here. Smallest sufficient change; follow existing conventions.
- **Run real commands.** No success claim without evidence — a passing run, not "should pass."
- **Never stop at planning.** Planning is a step, not a deliverable.

## Inputs

- `.wize/solutioning/stories/{epic}/{story}.md`
- `.wize/solutioning/architecture.md`
- `.wize/solutioning/design-system/` (use existing components)
- `.wize/implementation/tea/{epic}/{story}/design.md` (the test contract)

## Outputs

- Code + tests in the target repo.
- Commit messages reference AC IDs.
- Story file updated to `status: ready-for-review`.

## The loop (TDD, story-scoped)

### 1. Read

Story ACs, out-of-scope, notes, `tea-design.md`. Confirm the test split. If the design doesn't match the story (mismatch on test count, mock, environment), ping Hawkeye **before** writing code.

### 2. Slice the story into micro-cycles

Each cycle is one AC (or part of one) and produces a green test + small code change. Don't try to ship the whole story in one commit.

### 3. Red

Write the failing test first. Match the assertion shape in `design.md`. Don't write code yet.

```ts
// red — first run, fails
test('valid email returns ok', () => {
  expect(validateInviteEmail('a@b.co')).toEqual({ ok: true });
});
```

### 4. Green

Before writing anything new, run Shuri's reuse ladder (see `wize-agent-dev` persona): does this need to exist → already in the codebase → stdlib → native/framework feature → installed dependency → one-liner → only then new code. Write the **minimum** code that turns the test green. No anticipated branches; no "just-in-case" handling.

```ts
// green — minimum to pass
export const validateInviteEmail = (s: string) => ({ ok: /@/.test(s) });
```

### 5. Refactor

Now harden, with the test as safety net.

```ts
// refactor — same green tests, real logic
import { z } from 'zod';
const schema = z.string().email();
export const validateInviteEmail = (s: string) =>
  schema.safeParse(s).success ? { ok: true } : { ok: false, code: 'invalid_format', field: 'email' };
```

### 6. Commit

Conventional commits, AC IDs referenced.

```
feat(invite): validate email per AC-02-1 / AC-02-2
- add validateInviteEmail with zod
- add 4 unit tests covering valid + invalid rules
```

### 7. Repeat

Until every AC has at least one test + minimum code that makes it pass.

### 7.5. Loop verification (auto-check)

Before declaring the loop done, run these checks:

| Check | How | Fail → |
|---|---|---|
| **Evidence of iteration** | `git log --oneline` shows ≥2 commits with AC IDs (skip if story has only 1 AC) | Return to step 2 |
| **AC-to-test mapping** | Every AC in the story file has a corresponding test case name | Return to step 3 (Red) |
| **All AC tests green** | `npx vitest run --reporter=verbose` (or equivalent) — grep output for each AC's test name | Return to step 4 (Green) |

**Max-cycles guard.** If the same AC cycles through Red→Green→Refactor 3+ times without staying green, stop and escalate to Wizer: the test design may be wrong, the AC may be mis-sized, or the approach may need Tony.

### 8. Knowledge update (inline, ~60s)

Before opening the PR, ask: **did this story touch any of the 5 baseline axes** documented in `.wize/knowledge/document-project/`?

| Axis | Touched when… | File to update |
|---|---|---|
| **Architecture** | new component, new sequence, changed data flow | `architecture-snapshot.md` |
| **Conventions** | new naming/folder/test pattern published as public contract (incl. `testid`) | `conventions.md` |
| **Risk-spots** | introduced a complexity hot spot OR resolved one | `risk-spots.md` |
| **Dependencies** | added / removed / upgraded a runtime dep | `dependencies.md` |
| **Overview** | new user-visible feature a new dev should know about | `overview.md` |

If yes for any axis: open the file and add **1–3 lines** under a new dated bullet — in the same PR.

```markdown
## 2026-06-12 — E01-S03
- Conventions: `data-testid="invite-*"` published as public contract; Hawkeye E2E depends on these.
- Risk: R-1 (mailer) mitigation now confirmed (integration test covers retry policy).
```

If no axis was touched, you skip this step entirely — quick-dev-style changes don't need it. Hawkeye will check whether the call was correct in `tea-review`. A story that touched an axis but skipped the update gets a `KN-NN` finding in the gate (recommendation `CONCERNS` advisory, or `FAIL` enforcing).

This is how the brownfield baseline stays alive instead of going stale 6 months in.

### 9. Pre-PR self-check

- All Hawkeye-declared tests exist + pass — **AC → test mapping complete**, every AC traced to a named passing test.
- Required checks run: unit + integration + e2e (as the test contract declares), lint, format, type-check, build — and security when the story touches auth/payments/boundaries. If a command couldn't run, say **exactly which and why** — don't silently drop it.
- No `test.skip` / `.only` left.
- Authz enforced at every server boundary the story adds.
- Loading / empty / error states rendered and asserted.
- `data-testid` matches story's "notes for Hawkeye".
- Story file frontmatter → `status: ready-for-review`.
- Self-walk the screen (web) or smoke a tab on simulator (app).

### 10. Open PR

PR description includes:
- Story link.
- AC list with the test names that cover them.
- Screenshots / recordings of happy + failure paths.
- Knowledge update line (`Touched axis: <none|architecture|conventions|risk-spots|dependencies|overview>`).
- TEA expected next: design → trace → review → gate.

### 11. Address gate findings

If `tea-review` or `tea-gate` flags issues, fix them in the same PR or open a follow-up if the story has shipped a separate value-bearing slice.

**Loop-back protocol:**
1. Read each finding's `severity` and `blocking` flag.
2. For each `blocking: true` finding → return to step 3 (Red) for the affected AC.
3. For each `blocking: false` finding → log in story `notes` and fix in same PR before re-submitting to gate.
4. **Max-retry guard:** if the same story cycles through gate → fix → gate 3+ times, stop and escalate to Wizer. The story may be mis-sized, the test design may be wrong, or the ACs may need renegotiation with Hill.

## Security + perf during implementation

Shuri thinks both at write time, not at review time:

- Auth context on every server entry point — confirm via Tony's middleware pattern.
- Tokens never logged.
- Inputs validated at the boundary; trusted by the time they reach domain.
- Network calls in handlers wrapped with timeout + retry policy from architecture.
- Don't `await` in a loop without batching.
- Don't ship dead code (`isFooEnabled = true` always).

## Quick-dev exception

If the work is small / well-scoped and Wizer invoked `wize-quick-dev` instead of this workflow, the design step is replaced by smoke-test-only commitment and the gate is a single one-line entry in `quick-dev-log.md`.

## Anti-patterns Shuri rejects in her own work

- Writing code first and tests "after the bug fix" — that's not TDD; that's regression-tests.
- Commits that don't cite an AC.
- "Refactor while green" turning into "rewrite while green."
- Bundling cross-cutting refactors into the story PR. Split.
- Editing tests so they pass instead of editing code so tests pass.

## Final report

When the story is done, report to the thread in this shape — decisions, evidence, results, blockers only; no extended private reasoning:

1. **Route used** — full lifecycle (dev-story).
2. **Solution summary** — what changed and why, in a few lines.
3. **Files changed.**
4. **AC → test mapping** — each AC and the passing test that covers it.
5. **Commands run + results** — the real checks and their outcomes; name any that couldn't run and why.
6. **`.wize/` artifacts updated** — story status, TEA artifacts, knowledge axes.
7. **Relevant decisions** — including any ADR if architectural.
8. **Residual risks / limitations / skipped items** — including recommended extras logged separately (no silent scope creep).
9. **Single recommended next action** — usually the TEA gate.

## Hand-off

> Story E01-S03 implemented. All ACs covered by tests; CI green. PR opened (#412). Hawkeye, ready for trace + review. Notes section of the story has the testid map you'll use.
