---
code: wize-dev-story
name: Dev Story
phase: 4-implementation
owner: wize-agent-dev   # Shuri
status: ready
---

# Dev Story

**Goal.** Implement one story under TDD discipline. Tests first; minimum code to pass; refactor with green. Each commit cites an AC ID. The PR ends in a clean gate, not a "looks good to me."

Shuri drives. Hawkeye observes (test design is binding). Tony stays available for architectural questions.

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

Write the **minimum** code that turns the test green. No anticipated branches; no "just-in-case" handling.

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

### 8. Pre-PR self-check

- All Hawkeye-declared tests exist + pass.
- No `test.skip` / `.only` left.
- Lint + format clean.
- Type-check clean.
- `data-testid` matches story's "notes for Hawkeye".
- Story file frontmatter → `status: ready-for-review`.
- Self-walk the screen (web) or smoke a tab on simulator (app).

### 9. Open PR

PR description includes:
- Story link.
- AC list with the test names that cover them.
- Screenshots / recordings of happy + failure paths.
- TEA expected next: design → trace → review → gate.

### 10. Address gate findings

If `tea-review` flags issues, fix them in the same PR or open a follow-up if the story has shipped a separate value-bearing slice.

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

## Hand-off

> Story E01-S03 implemented. All ACs covered by tests; CI green. PR opened (#412). Hawkeye, ready for trace + review. Notes section of the story has the testid map you'll use.
