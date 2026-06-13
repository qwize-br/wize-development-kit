# Step 3: Customer Pain Points

## Rules

- 🌐 Search the web to verify claims.
- 📝 Write findings to the document immediately.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Task

Identify customer pain points for {{research_topic}}.

## Execution

Search for:

- "{{research_topic}} customer complaints"
- "{{research_topic}} common frustrations"
- "{{research_topic}} Reddit / G2 / Capterra reviews"

Synthesize and append:

```markdown
## Customer Pain Points

### Top Pain Points
1. ...
2. ...

### Evidence
...

### Source Citations
...
```

Update frontmatter `stepsCompleted: [1, 2, 3]`, then load `./step-04-customer-decisions.md`.
