---

code: wize-subtract
description: "Use quando um diff ou PR precisar de revisão focada em over-engineering — o que dá para deletar, simplificar ou trocar por stdlib/nativo, com a lista de cortes e o total de linhas economizáveis."
name: Subtract
module: core
status: ready
---

# Subtract

**Goal.** Review a diff with one lens only: **unnecessary complexity**. Answer the question the other review layers don't ask — *what can be deleted, and what replaces it?* The best outcome for a diff is that it gets shorter.

This complements `wize-code-review` (correctness, edge cases, acceptance criteria) and `wize-tea-review` (AC fulfillment). Subtract hunts bloat. It **lists** findings; it does not apply them.

## When to run

- Before opening a PR, once the diff is complete.
- As the **Subtraction Hunter** layer inside `wize-code-review` (runs on every code PR).
- When the user says "review for over-engineering", "what can we delete", "is this too much code", "simplify this", "/wize-subtract".

## When NOT to run

- As a replacement for correctness or security review — those are out of scope here.
- On generated code, vendored code, or lockfiles.
- When the diff is already minimal: say so and stop (see "Clean diff").

## Inputs

- The diff (PR, branch, commit range, or staged changes).
- Read access to the codebase — reuse claims must be verified, not guessed.

## Output

One line per finding, ranked by lines saved (biggest cut first):

```
path/to/file:L<line>: <tag> <what to cut>. <what replaces it>.
```

Tags:

- `delete:` — dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` — a hand-rolled thing the standard library ships. Name the function.
- `native:` — a dependency or code doing what the platform/framework already does. Name the feature.
- `yagni:` — an abstraction with one implementation, config nobody sets, a layer with one caller.
- `shrink:` — same logic, fewer lines. Show the shorter form.

End with the only metric that matters: `net: -<N> lines possible.`

**Clean diff:** `Lean already. Ship.` and stop.

## Rules

- **One line per finding.** Location, what to cut, what replaces it. The review's own output obeys the ladder — no essays.
- **Name the replacement.** "This looks complex" is not a finding. `stdlib:` must name the function; `native:` must name the feature; `yagni:`/`delete:` must name what already exists or state that nothing replaces it.
- **Complexity only.** Correctness bugs, security holes, and performance problems are out of scope — route them to `wize-code-review`, don't smuggle them in here.
- **Never flag the floor.** Tests on non-trivial logic are the kit's minimum, not bloat. Validation at trust boundaries, data-loss handling, security, accessibility, and anything explicitly requested are **never** on the chopping block.
- **Verify before claiming.** "Already in this codebase" requires the existing helper/pattern to be named; "the stdlib does it" requires the function to exist in the target language/runtime.
- **Read before cutting.** Trace the real flow the change touches. The shortest diff in the wrong place is not lazy — it's a second bug.
- **Report only.** Do not apply the findings. Applying them is a separate, reviewable change (usually `wize-quick-dev`).

## Steps

### 1. Read the diff against the codebase

For every hunk, know what it touches and who calls it. Claims about reuse need the surrounding code read, not recalled.

### 2. Walk the ladder backwards

For each hunk, stop at the first question that holds:

1. Does this need to exist at all? → `delete:` (replacement: nothing).
2. Does it duplicate something already here? → `yagni:` or `delete:`, naming the existing helper/pattern.
3. Does the standard library do it? → `stdlib:`, naming the function.
4. Does the platform or framework do it? → `native:`, naming the feature.
5. Is a dependency doing one small thing? → `native:` / `shrink:`, naming what replaces it.
6. Same logic in fewer lines? → `shrink:`, showing the shorter form.
7. Is it configuration, an interface, or a layer with a single caller? → `yagni:`.

### 3. Rank and totalize

Sort by estimated lines removed (descending). Sum them: `net: -<N> lines possible.`

### 4. Hand back

Present the list as-is. Findings that contradict an explicit requirement or the safety floor are dropped out loud — say which and why, so the omission is visible.

## Hand-off

> Subtraction review complete for `{change}`. `{count}` finding(s), `net: -{N} lines possible.` Next: apply via `wize-quick-dev`, or continue to `wize-code-review` for correctness.
