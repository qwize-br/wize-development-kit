# Step 3: Starter Template Evaluation

## Mandatory execution rules

- 🛑 Never generate content without user input.
- ✅ Treat this as collaborative discovery.
- 🌐 Search the web to verify current versions and options.
- ⚠️ No time estimates.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Execution protocols

- 🎯 Show analysis before taking action.
- ⚠️ Present A/P/C menu after starter analysis.
- 💾 Only save when the user chooses C.
- 📖 Update frontmatter `stepsCompleted: [1, 2, 3]` before loading the next step.

## Collaboration menu (A/P/C)

- **A (Advanced Elicitation)** — explore unconventional starter options.
- **P (Party Mode)** — evaluate starter trade-offs from multiple perspectives.
- **C (Continue)** — save and move to architectural decisions.

## Context boundaries

- Project context from step 2 is available.
- No architectural decisions made yet — this step evaluates foundations.

## Task

Discover technical preferences and evaluate starter template options, establishing solid architectural foundations.

## Starter evaluation sequence

### 0. Check existing technical preferences

If `.wize/knowledge/document-project/conventions.md` or `project-context.md` exist, surface any already-documented technical rules.

### 1. Discover user technical preferences

Ask about:

- Languages and frameworks
- Databases
- Cloud / hosting / deployment
- Third-party services (auth, payments, analytics)
- Team experience level

### 2. Identify primary technology domain

Map the project to one of:

- Web application
- Mobile app
- API / backend
- CLI tool
- Full-stack
- Desktop

### 3. Research current starter options

Search the web for current, maintained starter templates matching the domain.

### 4. Present starter options

For each viable starter, document:

- Technology decisions already made by the starter
- Architectural patterns established
- Development experience features
- Maintenance status

### 5. Get selection

Present a recommended starter and ask for confirmation.

### 6. Generate starter content

Append to `architecture.md`:

```markdown
## Starter Template Evaluation

### Primary Technology Domain
{{domain}}

### Starter Options Considered
{{analysis}}

### Selected Starter: {{starter_name}}

**Rationale:** {{why}}

**Initialization Command:**
```bash
{{command}}
```

**Architectural Decisions Provided by Starter:**
- Language & Runtime: ...
- Styling Solution: ...
- Build Tooling: ...
- Testing Framework: ...
- Code Organization: ...
- Development Experience: ...
```

## Next step

After C, load `./step-04-decisions.md`.
