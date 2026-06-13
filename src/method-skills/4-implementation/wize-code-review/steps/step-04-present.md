---
deferred_work_file: '{implementation_artifacts}/deferred-work.md'
---

# Step 4: Present and Act

## Rules

- Speak in `{communication_language}`.
- When `{spec_file}` is set, always write findings to the story file before offering action choices.
- `decision_needed` findings must be resolved before handling `patch` findings.

## Instructions

### 1. Clean review shortcut

If zero findings remain after triage, state that and proceed to section 6 (Sprint Status Update).

### 2. Write findings to the story file

If `{spec_file}` exists and contains a Tasks/Subtasks section, append a `### Review Findings` subsection in this order:

1. `decision_needed` (unchecked):
   ```
   - [ ] [Review][Decision] <Title> — <Detail>
   ```
2. `patch` (unchecked):
   ```
   - [ ] [Review][Patch] <Title> [<file>:<line>]
   ```
3. `defer` (checked):
   ```
   - [x] [Review][Defer] <Title> [<file>:<line>] — deferred, pre-existing
   ```

Also append each `defer` finding to `{deferred_work_file}` under `## Deferred from: code review ({date})`.

### 3. Present summary

```
Code review complete.
- decision_needed: {D}
- patch: {P}
- defer: {W}
- dismissed: {R}
```

If `{spec_file}` is set, add: "Findings written to `{spec_file}`."

### 4. Resolve decision_needed findings

Present each `decision_needed` finding and ask the user to decide. Once resolved, each becomes a `patch`, `defer`, or is dismissed.

If deferred, ask for a one-line reason and append it to both the story file bullet and the deferred-work file.

### 5. Handle patch findings

If `patch` findings exist, ask:

```
How would you like to handle the {P} patch findings?
1. Apply every patch — fix all now, no per-finding confirmation.
2. Leave as action items — they are already in the story file (only if spec_file set).
3. Walk through each patch — show details before deciding.
```

Wait for the numbered choice. Do not proceed until selected.

- **Apply every patch**: apply all patch findings. Afterward, present a summary of changes and check off patch items in the story file if applicable.
- **Leave as action items**: done.
- **Walk through each patch**: present each finding with detail and suggested fix, then re-offer the menu.

### 6. Update story status and sync sprint tracking

Skip if `{spec_file}` is not set.

Determine `{new_status}`:
- If all `decision_needed` and `patch` findings are resolved and no unresolved issues remain → `done`
- If patch findings were left as action items or unresolved issues remain → `in-progress`

Update the story file status and save it.

If `{story_key}` is set and a sprint-status file exists, update the matching `development_status` entry.

### 7. Next steps

Present options:

```
What would you like to do next?
1. Start the next story — run wize-dev-story to pick up the next ready-for-dev story.
2. Re-run code review — address findings and review again.
3. Done — end the workflow.
```

Wait for the numbered choice.

## On complete

Run `{workflow.on_complete}` if non-empty.
