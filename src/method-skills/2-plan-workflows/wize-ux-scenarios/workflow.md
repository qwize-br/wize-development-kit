---
code: wize-ux-scenarios
name: UX Scenarios
phase: 2-plan
owner: wize-agent-ux-designer   # Mantis (absorbs WDS Freya)
absorbs: "WDS Freya — Phase 3 (8-question dialog)"
status: stub
---

# UX Scenarios

**Goal.** Produce the scenario map that anchors all UX work. Eight focused questions; one answer each.

## Inputs
- `.wize/planning/prd.md`
- `.wize/planning/ux/trigger-map.md`
- `.wize/planning/brief.md`

## Outputs
- `.wize/planning/ux/ux-scenarios.md`

## The 8 questions (WDS dialog)

1. **Who is the user, in one sentence?**
2. **What state are they in when they arrive?** (emotional, contextual)
3. **What are they trying to accomplish?** (job-to-be-done)
4. **What would they do without our product today?**
5. **What's the moment of truth — when they decide it works?**
6. **What's the failure mode — when do they walk away?**
7. **What does success look like to them, in their words?**
8. **What's the next thing we want them to do?**

## Output structure

```markdown
# UX Scenarios

## Scenario 1: {{name}}

- Q1 …
- Q2 …
- …

## Scenario N: …
```

## Hand-off
"Mantis → Mantis": run `wize-ux-design` next.
