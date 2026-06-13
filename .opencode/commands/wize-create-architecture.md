---
description: "3-solutioning: Create Architecture"
---

# Create Architecture

# Create Architecture

**Goal.** Design the system inside Fury's frame through collaborative, step-by-step discovery. Produces `.wize/solutioning/architecture.md` + `.wize/solutioning/adrs/` that multiple AI agents can implement consistently.

Tony Stark drives. Pepper Potts and Nick Fury may be invoked via `wize-party-mode` or `wize-advanced-elicitation` at any step.

## Inputs

- `.wize/planning/prd.md` (required)
- `.wize/planning/ux/ux-scenarios.md` and `.wize/planning/ux/ux-design/` (when available)
- `.wize/planning/tech-vision.md`
- `.wize/planning/nfr-principles.md`
- `.wize/solutioning/design-system/` (when available)
- Stack catalogs from active overlays
- `.wize/knowledge/document-project/` (brownfield only)

## Outputs

- `.wize/solutioning/architecture.md`
- `.wize/solutioning/adrs/ADR-NNN-{slug}.md`

## Workflow architecture

This skill uses **micro-file architecture**:

- Each step is a self-contained file with embedded rules.
- Sequential progression with user control at each step.
- Document state tracked in frontmatter (`stepsCompleted`).
- Append-only document building through the conversation.
- Never proceed to a step file if the current step indicates the user must approve continuation.

## On activation

1. Load `.wize/config/project.toml` and `.wize/config/user.toml`.
2. Resolve `user_name`, `communication_language`, `document_output_language`, `output_folder`, and the active profiles.
3. Greet the user in `communication_language`.
4. Read fully and follow `./steps/step-01-init.md`.

## Steps

1. `step-01-init.md` — detect continuation, discover inputs, create `architecture.md` from template.
2. `step-02-context.md` — analyze PRD, UX, and research for architectural implications.
3. `step-03-starter.md` — discover technical preferences and evaluate starter templates.
4. `step-04-decisions.md` — make core architectural decisions (data, auth, API, frontend, infra).
5. `step-05-patterns.md` — define implementation patterns that prevent agent conflicts.
6. `step-06-structure.md` — map requirements to concrete project structure and boundaries.
7. `step-07-validation.md` — validate coherence, coverage, and implementation readiness.
8. `step-08-complete.md` — finalize frontmatter and hand off to implementation.

## Global step rules

- Always read the complete step file before acting.
- Speak in `communication_language`.
- Write artifacts in `document_output_language`.
- Never generate content without user input or confirmation.
- Every code reference uses CWD-relative `path:line` format.
- No time estimates — AI development speed has fundamentally changed.

## Hand-off

> Architecture and ADRs are in `.wize/solutioning/`. Sequences hit the NFR targets. Hawkeye can write `tea-risk.md` against this. Tony continues with `wize-create-epics-and-stories`.
