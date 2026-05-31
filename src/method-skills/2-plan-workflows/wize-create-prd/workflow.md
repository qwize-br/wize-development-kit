---
code: wize-create-prd
name: Create PRD
phase: 2-plan
owner: wize-agent-pm   # Maria Hill
status: stub
---

# Create PRD

**Goal.** Turn brief + research + trigger-map into a Product Requirements Document the team can build from.

## Inputs
- `.wize/planning/brief.md`
- `.wize/planning/research.md`
- `.wize/planning/ux/trigger-map.md`

## Outputs
- `.wize/planning/prd.md`

## Steps
1. **Goals.** Pull the success criteria from the brief; restate as PRD goals.
2. **Scope (in / out).** Explicit list of in-scope and out-of-scope items.
3. **User stories backbone.** "As a … I want … so that …" — coarse, will be sliced by Tony.
4. **Acceptance criteria per scope item.** Each scope item gets ACs Hawkeye can test.
5. **Constraints + assumptions.** From brief and Fury (if Fury has run already).
6. **Open questions.** Owners assigned.
7. **Hand-off.** Trigger Mantis to start UX scenarios.

## PRD template

```markdown
# PRD — {{project_name}}

## Goals
1. …

## Scope
### In scope
- …
### Out of scope
- …

## Backbone (user stories)
- …

## Acceptance criteria
| Item | ACs |
|---|---|
| … | AC1 …; AC2 … |

## Constraints / assumptions
- …

## Open questions
- [ ] … (owner: …)
```
