# Step 1: Domain Research Scope Confirmation

## Rules

- 🛑 Never generate content without user confirmation.
- 📖 Always read the complete step file before acting.
- 🔍 Scope confirmation only.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Task

Confirm domain research scope.

## Execution

Present:

```
I understand you want domain/industry research for {{research_topic}}.

This research will cover:
✅ Domain overview and ecosystem
✅ Competitive landscape
✅ Regulatory and compliance considerations
✅ Technical trends
✅ Strategic implications

[C] Continue — begin domain research with this scope
```

On [C], append the scope confirmation, update `stepsCompleted: [1]`, and load `./domain-steps/step-02-domain-analysis.md`.

## Append

```markdown
## Domain Research Scope Confirmation

**Research Topic:** {{research_topic}}
**Research Goals:** {{research_goals}}

**Scope:**
- Domain overview and ecosystem
- Competitive landscape
- Regulatory and compliance considerations
- Technical trends
- Strategic implications

**Scope Confirmed:** {{date}}
```
