# Step 5: Implementation Patterns & Consistency Rules

## Mandatory execution rules

- 🛑 Never generate content without user input.
- ✅ Treat this as collaborative discovery.
- 🎯 Focus on patterns that prevent AI agent implementation conflicts.
- 🎯 Emphasize what agents could decide differently if not specified.
- ⚠️ No time estimates.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Execution protocols

- 🎯 Show analysis before taking action.
- ⚠️ Present A/P/C menu after generating patterns content.
- 💾 Only save when the user chooses C.
- 📖 Update frontmatter `stepsCompleted: [1, 2, 3, 4, 5]` before loading the next step.

## Collaboration menu (A/P/C)

- **A (Advanced Elicitation)** — develop additional consistency patterns.
- **P (Party Mode)** — identify conflict points from multiple perspectives.
- **C (Continue)** — save and move to project structure.

## Context boundaries

- Core decisions from step 4 are complete.
- Technology stack is decided.
- Focus on HOW agents should implement, not WHAT.

## Task

Define implementation patterns and consistency rules so multiple AI agents write compatible code.

## Pattern categories

### Naming patterns

- Database table/column naming
- API endpoint naming
- File and directory naming
- Component/function/variable naming
- Route parameter formats

### Structure patterns

- Where tests live
- How components are organized
- Where utilities and helpers go
- Configuration file organization

### Format patterns

- API response wrappers
- Error response structures
- Date/time formats
- JSON field naming (snake_case vs camelCase)

### Communication patterns

- Event naming conventions
- Event payload structures
- State update patterns
- Action naming conventions
- Logging formats and levels

### Process patterns

- Loading state handling
- Error recovery
- Retry implementation
- Authentication flow
- Validation timing and methods

## Generate patterns content

Append to `architecture.md`:

```markdown
## Implementation Patterns & Consistency Rules

### Naming Patterns
...

### Structure Patterns
...

### Format Patterns
...

### Communication Patterns
...

### Process Patterns
...

### Enforcement Guidelines

**All AI agents MUST:**
- ...

### Pattern Examples
**Good:** ...
**Anti-patterns:** ...
```

## Next step

After C, load `./step-06-structure.md`.
