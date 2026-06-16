---
code: wize-checkpoint-preview
name: Checkpoint Preview
phase: 4-implementation
owner: wize-agent-dev   # Shuri (+ wize-agent-architect Tony on call)
status: ready
---

# Checkpoint Preview

**Goal.** Pause mid-story to validate direction before continuing. For M/L stories where the cost of going off-rail is high, a quick checkpoint catches drift before it becomes rework.

Shuri drives. Tony on call for architectural drift. Hawkeye on call for test design drift.

## When to run

- Manually, when a story is taking longer than expected.
- After the first 2-3 commits of an M or L story.
- When a new constraint is mentioned (security review, perf budget, vendor change).

## When NOT to run

- Quick-dev / S stories (overhead exceeds the value).
- When the story is < 50% done and no surprise has come up yet.

## Inputs

- The current story file: `.wize/solutioning/stories/{epic}/{story}.md`
- The git diff: uncommitted + committed since story start
- The `tea-design.md` for the story
- The `design-system/` tokens used so far

## Output

- `.wize/implementation/checkpoints/{story_id}.md` (one file per checkpoint, append over time)
- A decision: continue / pivot / stop

## Steps

### 1. Pause

Stop writing code. Do not commit any pending work until the checkpoint is recorded.

### 2. Snapshot

Write 5 lines:

- Files touched: (list, max 10)
- ACs done vs. remaining: (X / Y)
- Tests added: (count, by split)
- New dependencies: (list)
- Time spent: (estimate)

### 3. Sanity check (3 questions)

- **Are we solving the right problem?** Compare the implementation with the story's Context and ACs. If the story's intent was misunderstood, pivot.
- **Is the design holding?** Compare the code with the architecture. If a new pattern emerged without an ADR, flag it.
- **Any new constraints?** Did anything new appear (security finding, perf regression, vendor change, new stakeholder)?

### 4. Decide

One of three:

- **Continue** — the path is right. Record the snapshot; resume.
- **Pivot** — change scope or approach. Open a follow-up story with `wize-create-story`; do not edit the current story's ACs.
- **Stop** — the story is no longer worth it. Move it to `backlog` via `wize-correct-course`.

One decision per checkpoint. Re-run for additional decisions.

### 5. Hand off

Notify the next workflow:

- Continue → `/wize-dev-story` (resume).
- Pivot → `/wize-create-story` (new story for the pivot).
- Stop → `/wize-correct-course` (defer the original).

## Output template

```markdown
---
story_id: E04-S02
checkpoint: 1
date: 2026-06-16
author: Shuri
---

# Checkpoint — E04-S02

## Snapshot
- Files touched: src/...
- ACs done vs. remaining: 1 / 4
- Tests added: 2 unit, 1 integration
- New dependencies: none
- Time spent: ~3h

## Sanity check
- Right problem? Yes.
- Design holding? Yes.
- New constraints? Vendor X deprecated their API; need a different client lib.

## Decision
**Pivot** — see follow-up E04-S04 (client lib migration).
```

## Anti-patterns Shuri rejects

- Skipping the snapshot to "save time" — the snapshot is the artifact.
- Auto-pivoting (changing scope without an explicit checkpoint).
- Recording "continue" without the sanity check answers.
- Bundling multiple pivots in one checkpoint (one decision per run).

## Hand-off

> "Checkpoint recorded for **{story_id}** (decision: {continue|pivot|stop}). Next: `/wize-dev-story` / `/wize-create-story` / `/wize-correct-course`."
