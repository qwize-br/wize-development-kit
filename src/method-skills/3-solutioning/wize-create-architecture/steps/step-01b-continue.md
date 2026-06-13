# Step 1b: Continue Existing Architecture Workflow

## Purpose

Resume an architecture workflow that was previously started.

## Rules

- Read the existing `{output_folder}/solutioning/architecture.md` fully, including frontmatter.
- Report the current `stepsCompleted` to the user.
- Ask whether to continue from the last completed step or restart from a specific step.
- Never discard already-written content without explicit user confirmation.

## Continue menu

```
Existing architecture document found.

Steps completed: {stepsCompleted}
Last saved: {updated or created date}

What would you like to do?
[C] Continue from the next step ({next_step})
[R] Restart from step 1
[S] Pick a specific step to revisit
```

## Routing

- [C] → load the step immediately after the highest value in `stepsCompleted`.
- [R] → confirm overwrite risk, then return to `step-01-init.md` fresh setup.
- [S] → present the list of steps and load the selected one.
