---
code: wize-sprint-planning
name: Sprint Planning
phase: 4-implementation
owner: wize-agent-pm   # Maria Hill
status: stub
---

# Sprint Planning

**Goal.** Pick what enters this sprint. Capacity-honest, priority-honest.

## Inputs
- Story backlog from `.wize/solutioning/stories/`
- Velocity history (if exists) from `.wize/implementation/sprint-status.md`
- Hawkeye risk profile (`risk-profile.md`)

## Outputs
- Sprint entry appended to `.wize/implementation/sprint-status.md`

## Rules
- High-risk stories get TEA design done first or are deferred.
- Velocity = the smaller of "what we shipped last sprint" and "what we estimate we can ship this sprint."
- Stretch goals are explicit, not silent.
