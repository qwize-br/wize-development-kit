---
code: wize-product-brief
name: Product Brief
phase: 1-analysis
owner: wize-agent-analyst   # Pepper Potts
absorbs: "WDS Saga — Phase 1"
status: stub
---

# Product Brief

**Goal.** Turn raw demand into a concise, decision-ready brief that the rest of the team can ship from.

## Inputs

- Raw demand (chat or file)
- Optional existing materials (deck, doc, ticket, recording)
- `.wize/config/project.toml`

## Outputs

- `.wize/planning/brief.md`

## Steps

1. **Frame.** One paragraph: what is being asked, by whom, by when.
2. **Audience.** Primary user (1), secondary users (≤2), stakeholders (≤3).
3. **Vision.** One sentence describing the desired future state.
4. **Success criteria.** 3–5 measurable outcomes (numbers, not adjectives).
5. **Non-goals.** What this is *not*. Cut ambiguity early.
6. **Constraints.** Deadlines, budgets, compliance, integrations.
7. **Open questions.** Ranked, each with the person who can answer.
8. **Hand off.** Mark `status: ready-for-prd`; ping Wizer to call Maria Hill.

## Brief template (target file)

```markdown
# Brief — {{project_name}}

## Vision
…

## Audience
- Primary: …
- Secondary: …
- Stakeholders: …

## Success criteria
1. …
2. …

## Non-goals
- …

## Constraints
- …

## Open questions
- [ ] … (owner: …)
```
