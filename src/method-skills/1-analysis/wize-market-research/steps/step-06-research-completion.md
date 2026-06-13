# Step 6: Market Research Synthesis and Completion

## Rules

- 🌐 Search the web to verify claims.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.
- 📝 Replace the placeholder in the Research Overview section with a concise summary.

## Task

Produce the final market research synthesis.

## Execution

Replace `[Research overview and methodology will be appended here.]` with:

```markdown
This report covers customer behavior, pain points, decision drivers, and competitive dynamics for {{research_topic}}. The synthesis highlights the most important findings and their implications for the product brief and PRD.
```

Append:

```markdown
## Research Synthesis

### Key Findings
1. ...
2. ...

### Implications for Product Brief
...

### Implications for PRD
...

### Still Open
- ...

### Sources
...
```

Update frontmatter `stepsCompleted: [1, 2, 3, 4, 5, 6]` and `status: complete`.

## On complete

Run `{workflow.on_complete}` if non-empty.
