---
code: wize-trigger-map
name: Trigger Map
phase: 1-analysis
owner: wize-agent-analyst   # Pepper Potts
absorbs: "WDS Saga — Phase 2 (Trigger Mapping)"
status: stub
---

# Trigger Map

**Goal.** Map user psychology to business goals. For each user action we want to drive, identify the **trigger** (need/anxiety/desire) and the **business outcome** it unlocks.

## Inputs

- `.wize/planning/brief.md`
- `.wize/planning/research.md` (if exists)

## Outputs

- `.wize/planning/ux/trigger-map.md`

## Steps

1. **List target user actions.** From the brief, list the 3–8 actions we want users to take.
2. **For each action**, fill the row:
   - **Trigger** — what state of mind/need precedes this action?
   - **Friction** — what stops users from doing it today?
   - **Business outcome** — what changes for the business when this action happens?
   - **Signal** — what telemetry/event proves it happened?
3. **Validate.** Cite research or mark `hypothesis`.
4. **Hand off to Mantis** for UX Scenarios.

## Trigger Map template

```markdown
| Action | Trigger | Friction | Business outcome | Signal | Evidence |
|---|---|---|---|---|---|
| … | … | … | … | … | research:/hypothesis |
```
