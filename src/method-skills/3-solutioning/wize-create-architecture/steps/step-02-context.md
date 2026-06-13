# Step 2: Project Context Analysis

## Mandatory execution rules

- 🛑 Never generate content without user input.
- 📖 Always read the complete step file before acting.
- ✅ Treat this as collaborative discovery.
- 🎯 Analyze loaded documents; don't assume or generate requirements.
- ⚠️ No time estimates.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Execution protocols

- 🎯 Show analysis before taking action.
- ⚠️ Present A/P/C menu after generating project context analysis.
- 💾 Only save when the user chooses C (Continue).
- 📖 Update frontmatter `stepsCompleted: [1, 2]` before loading the next step.
- 🚫 Do not load the next step until C is selected.

## Collaboration menu (A/P/C)

- **A (Advanced Elicitation)** — invoke `wize-advanced-elicitation` for deeper architectural implications.
- **P (Party Mode)** — invoke `wize-party-mode` to bring Tony, Fury, and Pepper into the conversation.
- **C (Continue)** — save the content and proceed.

After A or P, return to this menu.

## Context boundaries

- Current document and frontmatter from step 1 are available.
- Input documents are loaded.
- Focus on architectural implications only — no technology decisions yet.

## Task

Analyze the loaded project documents to understand architectural scope, requirements, and constraints.

## Analysis sequence

### 1. Review project requirements

**From PRD:**

- Extract functional requirements and their architectural implications.
- Identify non-functional requirements (performance, security, compliance).
- Note technical constraints or dependencies.

**From Epics/Stories (if available):**

- Map epic structure to architectural components.
- Identify cross-cutting concerns that span multiple epics.

**From UX Design (if available):**

- Component complexity, real-time needs, platform-specific UI, accessibility level, responsive breakpoints, offline capability.

### 2. Project scale assessment

Complexity indicators:

- Real-time features
- Multi-tenancy
- Regulatory compliance
- Integration density
- User interaction complexity
- Data complexity and volume

### 3. Reflect understanding to the user

Present a concise summary:

```
I'm reviewing your project documentation for {{project_name}}.

I see {{fr_count}} functional requirements and {{nfr_count}} non-functional requirements.
{epics_loaded?}I also see {{epic_count}} epics with {{story_count}} stories.{/epics_loaded?}
{ux_loaded?}A UX specification is present.{/ux_loaded?}

Key architectural aspects:
- [core functionality]
- [critical NFRs]
- [unique technical challenges]
- [compliance requirements]

Scale indicators:
- Complexity: [low/medium/high/enterprise]
- Primary domain: [web/mobile/api/backend/full-stack/etc]
- Cross-cutting concerns: [list]

Does this match your understanding?
```

### 4. Generate project context content

Prepare the section to append:

```markdown
## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
{{analysis}}

**Non-Functional Requirements:**
{{analysis}}

**Scale & Complexity:**
- Primary domain: {{domain}}
- Complexity level: {{level}}
- Estimated architectural components: {{count}}

### Technical Constraints & Dependencies
{{list}}

### Cross-Cutting Concerns Identified
{{list}}
```

### 5. Present content and menu

Show the drafted content and present A/P/C. Only append when the user chooses C.

## Next step

After C, load `./step-03-starter.md`.
