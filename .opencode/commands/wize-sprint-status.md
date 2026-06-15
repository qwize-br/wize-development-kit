---
description: "4-implementation: Sprint Status"
---

# Sprint Status

# Sprint Status

**Goal.** Read `.wize/implementation/sprint-status.yaml` in 60 seconds and say what to do next.

## Inputs

- `.wize/implementation/sprint-status.yaml`
- `.wize/implementation/tea/{epic}/{story}/gate.md`

## Output

- Updated sprint-status.yaml (if statuses changed).
- One recommended next workflow.

## Steps

1. **Load YAML.** Parse `development_status`.
2. **Classify** each key: epic, story, retrospective.
3. **Count** statuses.
4. **Detect risks:**
   - Story `in-progress` older than 2 days with no update.
   - Blocked story without owner/deadline.
   - Epic `in-progress` with no stories.
5. **Recommend next step** (in priority order):
   1. Story `in-progress` → `/wize-dev-story`
   2. Story `review` → `/wize-tea-review`
   3. Story `ready-for-dev` → `/wize-dev-story`
   4. Story `backlog` → `/wize-create-story`
   5. Retrospective `optional` → `/wize-retrospective`
   6. All done → congratulate team.

## Summary output

```markdown
## Sprint Status

- Project: {project} ({project_key})
- Tracking: {tracking_system}
- Status file: .wize/implementation/sprint-status.yaml

**Stories:** backlog {n} | ready-for-dev {n} | in-progress {n} | review {n} | done {n}
**Epics:** backlog {n} | in-progress {n} | done {n}

**Next:** /{next_workflow} ({next_story_id})
```

## Hand-off

> Status updated. Run the recommended workflow or call `/wize-sprint-planning` to reprioritize.
