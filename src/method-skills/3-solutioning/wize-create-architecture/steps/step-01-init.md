# Step 1: Architecture Workflow Initialization

## Mandatory execution rules

- 🛑 Never generate content without user input.
- 📖 Always read the complete step file before acting.
- ✅ Treat this as collaborative discovery between architectural peers.
- 💬 Focus on initialization and setup only.
- 🚪 Detect existing workflow state and handle continuation properly.
- ⚠️ No time estimates.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Execution protocols

- 🎯 Show analysis before taking action.
- 💾 Initialize the document and update frontmatter.
- 📖 Set `stepsCompleted: [1]` before loading the next step.
- 🚫 Do not load the next step until setup is complete and the user confirms.

## Context boundaries

- Variables from `workflow.md` are available.
- Previous context is what is in the output document + frontmatter.
- Input document discovery happens in this step.

## Task

Initialize the Architecture workflow by detecting continuation state, discovering input documents, and setting up the document for collaborative architectural decision making.

## Initialization sequence

### 1. Check for existing workflow

Check if `{output_folder}/solutioning/architecture.md` exists.

- If it exists and has frontmatter with `stepsCompleted`, stop here and load `./step-01b-continue.md`.
- If it exists but has no `stepsCompleted`, treat it as a legacy document: warn the user and offer to continue from it or start fresh.
- If it does not exist, this is a fresh workflow.

### 2. Discover input documents

Search in `{output_folder}/planning/`, `{output_folder}/knowledge/`, and `{project-root}/docs/` for:

- Product Brief (`*brief*.md`)
- PRD (`*prd*.md`)
- UX Scenarios / UX Design (`*ux*.md`)
- Research (`*research*.md`)
- Project Context (`**/project-context.md`)

Confirm what was found with the user before proceeding.

### 3. Validate required inputs

If no PRD is found:

> Architecture requires a PRD to work from. Please run `wize-create-prd` first or provide the PRD file path.

Do not proceed without a PRD.

### 4. Create initial document

Copy `../architecture-decision-template.md` to `{output_folder}/solutioning/architecture.md`.

Set frontmatter:

```yaml
status: draft
owner: Tony Stark
created: "{{date}}"
stepsCompleted: []
inputDocuments: [{{list of discovered files}}]
```

### 5. Report setup to user

```
Welcome {{user_name}}! I've set up your Architecture workspace for {{project_name}}.

Documents found:
- PRD: {count or "None — required"}
- UX Design: {count or "None"}
- Research: {count or "None"}
- Project docs: {count or "None"}
- Project context: {count of rules or "None"}

Files loaded: {list or "No additional documents"}

Ready to begin architectural decision making. Do you have any other documents you'd like to include?

[C] Continue to project context analysis
```

## Next step

After the user selects [C], load `./step-02-context.md`.
