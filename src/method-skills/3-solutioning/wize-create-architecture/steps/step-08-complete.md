# Step 8: Architecture Completion & Handoff

## Mandatory execution rules

- 🛑 Never generate content without user input.
- ✅ Treat this as collaborative completion.
- 🎯 Provide clear next steps for implementation.
- ⚠️ No time estimates.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Execution protocols

- 🎯 Show completion summary and implementation guidance.
- 📖 Update frontmatter with final workflow state.
- 🚫 This is the final step.

## Task

Complete the architecture workflow and guide the user to the next phase.

## Completion sequence

### 1. Summarize achievements

Congratulate the user and summarize what was built together:

- Architecture document path
- Number of ADRs produced
- Key decisions made
- Patterns defined
- Validation status

### 2. Update frontmatter

```yaml
status: ready-for-stories
owner: Tony Stark
updated: "{{date}}"
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: architecture
lastStep: 8
```

### 3. Next steps guidance

```
Architecture complete. Next:
1. Hawkeye: run wize-tea-risk to build the global risk profile.
2. Tony: run wize-create-epics-and-stories to slice the work.
3. Use wize-help anytime to check what comes next.
```

## On complete

Run `{workflow.on_complete}` if non-empty.

## Workflow complete

The architecture is now the single source of truth for all technical decisions, ensuring consistent implementation across the project lifecycle.
