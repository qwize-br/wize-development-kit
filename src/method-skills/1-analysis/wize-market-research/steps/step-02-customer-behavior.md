# Step 2: Customer Behavior Analysis

## Rules

- 🌐 Search the web to verify claims.
- 📝 Write findings to the document immediately.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Task

Analyze customer behavior for {{research_topic}}.

## Execution

Run parallel web searches:

- "{{research_topic}} customer behavior trends"
- "{{research_topic}} user demographics"
- "{{research_topic}} usage patterns"

Synthesize and append:

```markdown
## Customer Behavior Analysis

### Target Audience
...

### Usage Patterns
...

### Trends
...

### Source Citations
...
```

Update frontmatter `stepsCompleted: [1, 2]`, then load `./step-03-customer-pain-points.md`.
