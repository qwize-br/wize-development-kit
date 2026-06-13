---
name: wize-code-review
description: "4-implementation: Code Review"
---

# Code Review

# Code Review

**Goal.** Review code changes adversarially using parallel review layers and structured triage into actionable categories.

This is **Shuri's peer code review** — separate from Hawkeye's `wize-tea-review` (which audits AC fulfillment). Both run on every story PR; they are complementary.

## When to run

Every PR that ships code. Quick-dev PRs get a lighter review (skip architecture checks unless they touched architecture).

## Inputs

- The diff, PR, branch, or commit range to review.
- The spec/story file for context (optional but recommended).
- Existing code style and project context from `.wize/knowledge/document-project/`.

## Outputs

- Inline-style findings presented in the conversation.
- Optional patch application if the user chooses to fix findings now.
- Updated story file with a `### Review Findings` section when a spec file is provided.
- Updated sprint status when a story key is discovered.

## Workflow architecture

This skill uses **step-file architecture**:

- Each step is self-contained and followed exactly.
- Sequential enforcement: complete steps in order, no skipping.
- State tracked in frontmatter variables set at runtime.
- Append-only building of findings.

## Critical rules

- **Read completely** each step file before acting.
- **Never** load multiple step files simultaneously.
- **Always** halt at checkpoints and wait for human input.
- Use CWD-relative `path:line` for every code reference.

## On activation

1. Load `.wize/config/project.toml` and `.wize/config/user.toml`.
2. Resolve `user_name`, `communication_language`, `document_output_language`, `implementation_artifacts`, `planning_artifacts`.
3. Greet the user in `communication_language`.
4. Read fully and follow `./steps/step-01-gather-context.md`.

## Steps

1. `step-01-gather-context.md` — identify the diff source, construct `{diff_output}`, set `{review_mode}` and `{spec_file}`.
2. `step-02-review.md` — launch parallel review layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
3. `step-03-triage.md` — normalize, deduplicate, and classify findings into `decision_needed`, `patch`, `defer`, `dismiss`.
4. `step-04-present.md` — present findings, resolve decisions, apply patches, update story status.

## Hand-off

> Code review complete for `{story_key or change}`. `{decision_needed}` decision(s), `{patch}` patch(es), `{defer}` deferred, `{dismissed}` dismissed as noise. Next: re-run review or continue to `wize-tea-review` (Hawkeye).
