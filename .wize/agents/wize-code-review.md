# Code Review

> 4-implementation: Code Review

# Code Review

**Goal.** Audit **code health** on the PR. Separate from Hawkeye's `tea-review` (which audits AC fulfillment). Both run on every story PR; they're complementary.

Shuri reviews peer PRs. Tony reviews when architecture is at stake.

## When to run

Every PR that ships code. Quick-dev PRs get a lighter review (skip code-architecture checks unless they touched architecture).

## Inputs

- The PR (diff + tests).
- Story file (for context — what the PR is supposed to accomplish).
- Linked design system (when components change).

## Output

- Inline comments on the PR.
- Final review verdict: `approve` / `request-changes` / `comment`.

## What this checks

### Naming + structure
- Are types, functions, variables named for **what they are**, not **how they're used**?
- Are files in the right folder per the architecture?
- Are exports minimal? Module boundaries respected?
- Are there new abstractions justified by the story or premature?

### Tests
- Do tests cover the changed behavior (not just coverage %)?
- Are they fast and isolated?
- Are mocks at the boundary, not inside the unit?
- Any `test.skip` / `.only` left in?

### Security (obvious-misses)
- Input validation at boundaries.
- Tokens / secrets / PII never logged.
- SQL parameterized, not concatenated.
- New deps audited; no known CVEs introduced.
- Auth context checked on every server entry point.

### Performance (obvious-misses)
- No N+1 queries.
- No `await` in tight loops without batching.
- No new sync I/O on hot paths.
- Bundle delta acceptable (size of new front-end imports).

### Architectural drift
- Story didn't quietly introduce a new layer / new pattern.
- If it did, an ADR was opened or a comment justifies it.
- Components reused from design system; new components added to system if reusable.

### Style + convention
- Follows lint / format / type rules.
- Comments explain *why*, not *what*.
- Dead code removed.
- TODOs have an owner + a ticket.

## What this does NOT check

- Whether ACs are met — that's Hawkeye's `tea-review`.
- Whether the design is right — that's reviewed in pull-request walk-through, ADR review, or party-mode.

Don't conflate. Two reviewers, two scopes.

## Comment style

Use these prefixes:

| Prefix | Meaning |
|---|---|
| `nit:` | Cosmetic; non-blocking |
| `q:` | Question; might be a misunderstanding |
| `praise:` | Real call-outs; teams need them |
| `suggestion:` | Idea, the author decides |
| `blocking:` | Must change before merge |
| `out-of-scope:` | Real issue, separate story |

Never `LGTM` without scanning. Never `LGTM` with `blocking:` open.

## Verdict

- **approve** — all blockings resolved.
- **request-changes** — at least one `blocking:`.
- **comment** — reviewed, no opinion (rare; used for early-draft PRs).

## PR-open checklist (Shuri's self-review)

Before opening, Shuri runs through:

- [ ] CI green locally.
- [ ] Lint + format clean.
- [ ] Type-check clean.
- [ ] No `console.log` / `dbg!` / debug printf.
- [ ] No `test.skip` / `.only`.
- [ ] Reading the diff right now, can I explain every line?
- [ ] Self-walk: open the changed screen / call the changed endpoint.
- [ ] Story status flipped to `ready-for-review`.

## Anti-patterns Shuri rejects in herself

- Approving without reading.
- Approving on the basis of green CI alone.
- "Big PR; will trust" — refuse and ask for slicing.
- Inline suggestions for full rewrites — open a follow-up instead.
- Demanding stylistic preferences not in the lint config.

## Hand-off

> Reviewed PR #418 (E02-S02). 2 nits, 1 blocking on auth-context check missing in one new route. Shuri to fix; re-review needed; then Hawkeye runs `tea-review`.
