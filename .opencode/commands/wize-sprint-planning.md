---
description: "4-implementation: Sprint Planning"
agent: wize-agent-pm
---

# Sprint Planning

# Sprint Planning

**Goal.** Pick what enters this sprint. Capacity-honest, priority-honest, risk-honest.

Maria Hill chairs. Tony advises on slicing. Hawkeye flags risk. Shuri commits to the load.

## Inputs

- Story backlog: `.wize/solutioning/stories/`
- Previous sprint state: `.wize/implementation/sprint-status.yaml`
- `.wize/implementation/tea/risk-profile.md`
- Team availability for the next interval.

## Output

- Updated `.wize/implementation/sprint-status.yaml`.
- Story files updated with `priority: 1` for chosen stories.

## Steps

1. **Look back** — what shipped, what slipped, what surprised.
2. **Refresh capacity** — person-days × utilization − overhead.
3. **Pull stories** — continuation first, then priority, then risk.
4. **Reserve 10–15% buffer** for unknowns.
5. **Walk the gate plan** — design/trace/review/gate per story.
6. **Commit** — verbal + written into YAML.

## Status state machine

- Epic: `backlog` → `in-progress` → `done`
- Story: `backlog` → `ready-for-dev` → `in-progress` → `review` → `done`
- Retrospective: `optional` ↔ `done`

## Sprint block template

```yaml
# generated: YYYY-MM-DD
# last_updated: YYYY-MM-DD
# project: {project_name}
# project_key: {project_key}
# tracking_system: file-system
# story_location: .wize/solutioning/stories

generated: YYYY-MM-DD
last_updated: YYYY-MM-DD
project: {project_name}
project_key: {project_key}
tracking_system: file-system
story_location: .wize/solutioning/stories

development_status:
  epic-1: backlog
  1-1-story-one: backlog
  1-2-story-two: backlog
  epic-1-retrospective: optional
```

## Anti-patterns

- Optimistic velocity.
- Stories without owners.
- Stretch goals that are really plan.
- Pulling blocked dependencies.
- Zero buffer.

## Hand-off

> Sprint committed at `.wize/implementation/sprint-status.yaml`. Stories in `ready-for-dev` are now eligible for the dev loop.
>
> **Recommended next loop:**
>
> ```
> /loop /wize-dev-story
> ```
>
> `/loop /wize-dev-story` drives one story at a time: TDD red-green-refactor, AC IDs in commits, `tea-design.md` contract, knowledge update on the 5 baseline axes, and a clean gate at the end. `/loop` keeps it going across the sprint's `ready-for-dev` queue until the user pauses.
>
> Next: `/wize-sprint-status` (Maria Hill) to acompanhar o progresso.
