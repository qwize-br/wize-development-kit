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

> Sprint committed at `.wize/implementation/sprint-status.yaml`. Next: `/wize-sprint-status`.
