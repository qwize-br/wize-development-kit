---
code: wize-sprint-planning
name: Sprint Planning
phase: 4-implementation
owner: wize-agent-pm   # Maria Hill
status: ready
---

# Sprint Planning

**Goal.** Pick what enters this sprint. Capacity-honest, priority-honest, risk-honest.

Maria Hill chairs. Tony advises on slicing. Hawkeye flags risk. Shuri commits to the load.

> **No estimates.** Plan by story count and priority, never by velocity, points, or person-day math. Estimates only burn time and tokens. Pull what fits, keep a buffer, and let shipped-vs-committed counts (not a velocity number) tell you next time.

## Inputs

- Story backlog: `.wize/solutioning/stories/`
- Previous sprint state: `.wize/implementation/sprint-status.yaml`
- `.wize/implementation/tea/risk-profile.md`
- Team availability for the next interval.

## Output

- Updated `.wize/implementation/sprint-status.yaml`.
- Story files updated with `priority: 1` for chosen stories.

## Steps

1. **Look back** — what shipped, what slipped, what surprised (counts, not velocity).
2. **Gauge availability** — who's around this interval and who's out. No person-day math.
3. **Pull stories** — continuation first, then priority, then risk.
4. **Leave slack** for unknowns — pull fewer stories than feel possible, not a padded number.
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

- Estimating — velocity, points, or person-days. Just don't.
- Over-committing because "it looks like it fits."
- Stories without owners.
- Stretch goals that are really plan.
- Pulling blocked dependencies.
- Zero slack.

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
> Next: `/wize-sprint-status` (Maria Hill) to track progress.
