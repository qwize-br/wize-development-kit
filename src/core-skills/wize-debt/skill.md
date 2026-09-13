---

code: wize-debt
description: "Use quando precisar colher os atalhos deliberados espalhados no código (marcadores wize-debt:) num ledger único, para que o adiamento não vire esquecimento permanente."
name: Debt Ledger
module: core
status: ready
---

# Debt Ledger

**Goal.** Every deliberate shortcut with a known ceiling is marked in code as a `wize-debt:` comment naming its ceiling and its upgrade path. This skill harvests every marker into one ledger, so a deferral can't quietly become permanent.

Reads and reports. Changes nothing.

## When to run

- Before the retrospective (`wize-retrospective`) — the debt marker count is a sprint metric.
- Before a release (`wize-release`).
- When the user says "what did we defer", "list the shortcuts", "debt ledger", "what's marked wize-debt", "/wize-debt".

## The marker

```js
// wize-debt: single-threaded — upgrade to a queue when the second worker lands
```

```
# wize-debt: O(n²) scan — index it if the list passes ~10k rows
```

- **ceiling** — the limit we knowingly accepted (global lock, O(n²) scan, naive heuristic, in-memory only, retry-less call).
- **upgrade path** — the trigger to revisit. Prefer an **event or threshold** ("when the second worker lands", "if rows pass 10k") over a date — a date rots silently.

A deliberate shortcut **without** a marker is the real problem: nobody remembers it. Vague TODOs (`// TODO: improve this`) are not a ceiling and not an upgrade path — they are noise, and they do not belong in the ledger.

## Steps

### 1. Scan

Grep the repo for the marker, skipping `node_modules`, `.git`, build output and vendored code:

```bash
grep -rnE '(#|//|<!--|/\*|--) ?wize-debt:' . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build
```

Each hit is one ledger row. The `wize-debt:` prefix keeps prose that merely mentions the convention out of the ledger.

### 2. Build the ledger

One row per marker, grouped by file:

```
<file>:L<line> — <what was simplified>. ceiling: <limit>. upgrade: <trigger>.
```

Optional owner per row, when the user asks for one:

```bash
git blame -L<line>,<line> --date=short -- <file> | head -1
```

### 3. Flag the rot

Any marker that names no trigger gets the tag `no-trigger`. Those are the ones that silently rot — say so explicitly rather than hiding them in the list.

### 4. Report

End with the count:

```
<N> markers, <M> no-trigger.
```

Nothing found: `Clean ledger — no wize-debt markers.`

Write it to `.wize/implementation/debt.md` **only when asked**; otherwise it is a one-shot report in the conversation.

## Rules

- **Read-only.** Never edits the code, never removes a marker, never "fixes" one. Revisiting a ceiling is a separate change with its own review.
- **A marker is not a TODO.** The ledger tracks shortcuts with a named ceiling and trigger. Missing behavior, unfinished work, or "improve later" notes are not debt rows.
- **`no-trigger` markers are the finding.** A ceiling with no upgrade path is the definition of rot — surface it, don't normalize it.
- **Skip generated and vendored code.** Markers in `dist/`, `node_modules/`, or vendored trees are noise.

## Hand-off

> Debt ledger complete. `<N>` marker(s), `<M>` no-trigger. Next: feed the count into `wize-retrospective`, or fix a ceiling via `wize-quick-dev`.
