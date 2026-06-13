# Step 1: Technical Research Scope Confirmation

## Rules

- 🛑 Never generate content without user confirmation.
- 📖 Always read the complete step file before acting.
- 🔍 Scope confirmation only.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Task

Confirm technical research scope.

## Execution

Present:

```
I understand you want technical research for {{research_topic}}.

This research will cover:
✅ Technology stack and tooling
✅ Integration patterns
✅ Architectural patterns
✅ Implementation approaches
✅ Performance and scalability considerations

[C] Continue — begin technical research with this scope
```

On [C], append the scope confirmation, update `stepsCompleted: [1]`, and load `./technical-steps/step-02-technical-overview.md`.

## Append

```markdown
## Technical Research Scope Confirmation

**Research Topic:** {{research_topic}}
**Research Goals:** {{research_goals}}

**Scope:**
- Technology stack and tooling
- Integration patterns
- Architectural patterns
- Implementation approaches
- Performance and scalability considerations

**Scope Confirmed:** {{date}}
```
