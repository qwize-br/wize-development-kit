# Step 4: Core Architectural Decisions

## Mandatory execution rules

- 🛑 Never generate content without user input.
- ✅ Treat this as collaborative discovery between peers.
- 🌐 Search the web to verify current technology versions.
- ⚠️ No time estimates.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Execution protocols

- 🎯 Show analysis before taking action.
- ⚠️ Present A/P/C menu after each major decision category.
- 💾 Only save when the user chooses C.
- 📖 Update frontmatter `stepsCompleted: [1, 2, 3, 4]` before loading the next step.

## Collaboration menu (A/P/C)

- **A (Advanced Elicitation)** — explore innovative approaches to a specific decision.
- **P (Party Mode)** — review trade-offs from multiple perspectives.
- **C (Continue)** — save current decisions and proceed.

## Context boundaries

- Project context from step 2 is available.
- Starter template choice from step 3 is available.
- Focus on decisions not already made by the starter or existing preferences.

## Task

Facilitate collaborative architectural decision making for the remaining critical choices.

## Decision categories

### Category 1: Data Architecture

- Database choice (if not determined by starter)
- Data modeling approach
- Validation strategy
- Migration approach
- Caching strategy

### Category 2: Authentication & Security

- Authentication method
- Authorization patterns
- Security middleware
- Encryption approach
- API security strategy

### Category 3: API & Communication

- API design patterns (REST, GraphQL, tRPC, etc.)
- Error handling standards
- Rate limiting
- Inter-service communication

### Category 4: Frontend Architecture (if applicable)

- State management
- Component architecture
- Routing
- Performance optimization

### Category 5: Infrastructure & Deployment

- Hosting strategy
- CI/CD approach
- Environment configuration
- Monitoring and logging
- Scaling strategy

## Decision format

For each decision, record:

- Category
- Decision
- Version (if applicable)
- Rationale
- Affects (components or epics)
- Provided by starter? (yes/no)

## Generate decisions content

Append to `architecture.md`:

```markdown
## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (block implementation):**
{{list}}

**Important Decisions (shape architecture):**
{{list}}

**Deferred Decisions (post-MVP):**
{{list}}

### Data Architecture
...

### Authentication & Security
...

### API & Communication Patterns
...

### Frontend Architecture
...

### Infrastructure & Deployment
...

### Decision Impact Analysis

**Implementation Sequence:**
{{ordered list}}

**Cross-Component Dependencies:**
{{how decisions affect each other}}
```

## Next step

After C, load `./step-05-patterns.md`.
