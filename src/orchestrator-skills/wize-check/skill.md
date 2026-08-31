---

code: wize-check
description: "Use quando o usuário pedir clareza de acompanhamento no meio do trabalho — um checklist de onde estamos, o que já foi feito, o que falta e o que trava, até a condição de pronto."
name: Check (Wizer)
module: orchestrator
owner: wize-orchestrator
status: ready
aliases: []
---

# Wizer · `/wize-check`

**Goal.** In under 60 seconds, return a **progress checklist** for the demand in flight: what the objective is, where we are, what is already done (with evidence), what is in progress, what is left until the done condition, and what is waiting on the user.

This is a **read-only interruption**. It does not edit code, does not advance the task, does not re-plan. After answering, **resume exactly the work that was in flight**, at the step where it stopped.

## Modes

| Invocation | What to do |
|---|---|
| `/wize-check` | Full checklist for the demand in flight. |
| `/wize-check now` | Two lines only: what I'm doing right now + the next step. |
| `/wize-check {topic}` | Narrow the checklist to one scope (a story, a PR, a bug, a document). |
| `/wize-check save` | Same checklist, plus write it to `.wize/implementation/checks/{YYYY-MM-DD-HHmm}.md`. |

## Step 1 — reconstruct the state (in this order)

1. **The session itself** — the original request, the decisions already taken, the files edited, the commands run and what they returned. This is the primary source.
2. **Work still in flight** — background commands, pending subagents, a PR awaiting review, CI running. It goes under *in progress*, never under *done*.
3. **Kit artifacts** (when they exist): `.wize/implementation/sprint-status.yaml`, the story in flight under `.wize/solutioning/stories/**`, the latest `.wize/implementation/tea/**/gate.md`.
4. **Git** (if this is a repository): current branch, `git status`, commits since the base, open PR.
5. **Project memory / pointers** — only to recall the stated objective, never as proof of execution.

## Step 2 — evidence rule (non-negotiable)

An item only reaches **Done** with verifiable proof: a file and line, a commit, a command that ran and passed, a recorded gate, a merged PR.

- No proof → **In progress** or **Unverified**, said out loud.
- Intent, a plan, or "I implemented it" are not evidence.
- If something was written but not validated, the item is `[~]` with the missing validation named next to it.

Overstating progress is the one serious failure mode of this skill.

## Step 3 — the done condition (the "until we get to…")

Before building the list, write in one line **where this demand ends** — the observable result that closes it.

- If it is explicit in the session or in the artifacts, quote it.
- If it is not, **state the criterion you assumed** and ask for confirmation in one line. Never invent a destination silently.

## Step 4 — build the checklist

```markdown
## Checklist — {demand in one line}

**Objective:** {done condition — the observable result}
**Where we are:** {phase} · step {X} of {Y}

### Done
- [x] {item} — {evidence: commit / file:line / command that passed}

### In progress
- [~] {item} — {what is missing to close it}

### Left
- [ ] {item} — {who executes: skill or person}

### Blocked / waiting on you
- {decision, credential, approval — or "nothing"}

**Progress:** {n}/{total} · **Next step:** {one action, one line}
```

### Shape rules

- At most ~12 items total. Group; do not list micro-steps.
- Order **Left** by dependency, not by importance.
- One single next step. If two candidates tie, pick one and say why in half a line.
- No preamble, no closing summary, no praise for the progress.
- If a section is empty, write "—" and move on. Never invent an item to fill it.
- If an item **regressed** (broke, was reverted, gate flipped to FAIL), it goes back to *In progress* with the cause next to it.

## Step 5 — resume

After the checklist, return to the interrupted work without asking permission and without reopening the plan — unless the checklist itself surfaced a blocker that needs a decision from the user. In that case, stop and ask.

## When NOT to use

- Full sprint detail (stories, capacity, priorities) → `wize-sprint-status`.
- A continue / pivot / stop decision mid-story → `wize-checkpoint-preview`.
- Sprint off the rails, needs re-planning → `wize-correct-course`.

`wize-check` only reports. If the checklist shows the plan is wrong, say so in one line and point at the skill above — do not re-plan here.

## Hand-off

> Checklist delivered. Resuming: {next step}.
