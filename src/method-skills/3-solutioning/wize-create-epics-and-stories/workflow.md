---
code: wize-create-epics-and-stories
name: Create Epics and Stories
phase: 3-solutioning
owner: wize-agent-architect   # Tony Stark
status: stub
---

# Create Epics and Stories

**Goal.** Slice the PRD + architecture into epics (each ships value) and stories (each is one focused PR-sized unit).

## Inputs
- `.wize/planning/prd.md`
- `.wize/solutioning/architecture.md`

## Outputs
- `.wize/solutioning/epics/{NN}-{slug}.md`
- `.wize/solutioning/stories/{NN}-{slug}/{story-id}.md`

## Story template

```markdown
---
story_id: E01-S03
epic: 01-onboarding
status: ready-for-dev
priority: 2
estimate: M
linked_screen: ux-design/signin.md
---

# Story: Sign-in with email + magic link

## Context
…

## Acceptance criteria
- AC-1 …
- AC-2 …

## Out of scope
- …

## Notes for Shuri (Dev)
- Touch points: …
- Tests required: …
```
