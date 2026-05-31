---
code: wize-ux-design
name: UX Design
phase: 2-plan
owner: wize-agent-ux-designer   # Mantis
absorbs: "WDS Freya — Phase 4 (Page Specs)"
status: stub
---

# UX Design

**Goal.** Page-by-page specifications. Each screen documents layout, content, interactions, edge/empty/error states.

## Inputs
- `.wize/planning/ux/ux-scenarios.md`
- `.wize/planning/prd.md`

## Outputs
- `.wize/planning/ux/ux-design/{screen-name}.md` (one per screen)

## Per-screen template

```markdown
---
screen: {{name}}
linked_scenario: ux-scenarios.md#scenario-N
---

# {{Screen name}}

## Purpose
…

## Primary user action
…

## Layout (ASCII wireframe or description)
```
┌───────────────────────────────────────┐
│ Header                                │
├───────────────────────────────────────┤
│ Content                               │
└───────────────────────────────────────┘
```

## Content
- Headline: …
- Body: …
- CTA: …

## Interactions
- Click {{element}} → {{outcome}}

## States
- Loading: …
- Empty: …
- Error: …
- Success: …

## Accessibility notes
- (web-overlay) WCAG …
- (app-overlay) HIG / Material …
```

## Hand-off
"Tony, screen specs in `.wize/planning/ux/ux-design/`. Architecture time."
