# Step 1: Market Research Scope Confirmation

## Rules

- 🛑 Never generate content without user confirmation.
- 📖 Always read the complete step file before acting.
- 🔍 This is scope confirmation only — no web research yet.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Context

- Research type = "market"
- Research topic = "{{research_topic}}"
- Research goals = "{{research_goals}}"

## Task

Confirm market research scope and approach.

## Execution

Present the scope:

```
I understand you want market research for {{research_topic}}.

This research will cover:
✅ Customer behavior
✅ Customer pain points
✅ Customer decisions and jobs-to-be-done
✅ Competitive landscape
✅ Market positioning implications

All claims will be verified against current public sources.

[C] Continue — begin market research with this scope
```

When the user selects [C], append the scope confirmation to the document and update frontmatter `stepsCompleted: [1]`, then load `./step-02-customer-behavior.md`.

## Append to document

```markdown
## Market Research Scope Confirmation

**Research Topic:** {{research_topic}}
**Research Goals:** {{research_goals}}

**Scope:**
- Customer behavior
- Customer pain points
- Customer decisions and jobs-to-be-done
- Competitive landscape
- Market positioning implications

**Scope Confirmed:** {{date}}
```
