# Step 6: Project Structure & Boundaries

## Mandatory execution rules

- 🛑 Never generate content without user input.
- ✅ Treat this as collaborative discovery.
- 🗺️ Create a complete project tree, not generic placeholders.
- 🗺️ Map requirements/epics to architectural components.
- ⚠️ No time estimates.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Execution protocols

- 🎯 Show analysis before taking action.
- ⚠️ Present A/P/C menu after generating project structure.
- 💾 Only save when the user chooses C.
- 📖 Update frontmatter `stepsCompleted: [1, 2, 3, 4, 5, 6]` before loading the next step.

## Collaboration menu (A/P/C)

- **A (Advanced Elicitation)** — explore innovative project organization.
- **P (Party Mode)** — evaluate structure trade-offs.
- **C (Continue)** — save and move to validation.

## Context boundaries

- All previous decisions are complete.
- Implementation patterns are defined.
- Focus on physical project structure and component boundaries.

## Task

Define the complete project structure and architectural boundaries based on all decisions made.

## Structure sequence

### 1. Analyze requirements mapping

Map epics or FR categories to directories/services.

### 2. Define project directory structure

Create a complete, technology-specific tree:

- Root configuration files
- Source code organization
- Test organization
- Build and distribution

### 3. Define integration boundaries

- API boundaries
- Component boundaries
- Service boundaries
- Data boundaries

### 4. Map requirements to structure

For each epic or feature cluster:

```markdown
Epic: User Management
- Components: src/components/features/users/
- Services: src/services/users/
- API Routes: src/app/api/users/
- Database: prisma/migrations/...
- Tests: tests/features/users/
```

## Generate structure content

Append to `architecture.md`:

```markdown
## Project Structure & Boundaries

### Complete Project Directory Structure
```
{{tree}}
```

### Architectural Boundaries
...

### Requirements to Structure Mapping
...

### Integration Points
...

### File Organization Patterns
...
```

## Next step

After C, load `./step-07-validation.md`.
