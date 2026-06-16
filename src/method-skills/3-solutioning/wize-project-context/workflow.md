---
code: wize-project-context
name: Project Context
phase: 3-solutioning
owner: wize-agent-architect   # Tony Stark
status: ready
---

# Project Context

**Goal.** Consolidate the 5 foundational artifacts (brief, PRD, UX, architecture, risk profile) into a single `.wize/knowledge/project-context.md` so other agents (Shuri, Hawkeye, Mantis, Wizer) can read the project in one shot instead of stitching it from 5 files.

Tony drives. Peggy polishes prose. Wizer is on call for cross-cutting drift.

## When to run

- After Phase 3 closeout (architecture + ADRs + risk profile all exist).
- After any major change to brief / PRD / architecture (rerun).
- Before sprint planning if context feels stale.

## When NOT to run

- During greenfield with no artifacts yet (run only after brief + PRD exist).
- As a CI step (manual; expensive to run on every commit).

## Inputs

- `.wize/planning/brief.md` — Vision, Audience.
- `.wize/planning/prd.md` — Goals, scope.
- `.wize/planning/ux/ux-design/index.md` — UX stack, key screens.
- `.wize/solutioning/architecture.md` — Tech stack, components.
- `.wize/solutioning/adrs/*.md` — Key decisions.
- `.wize/implementation/tea/risk-profile.md` — Active risks.

## Output

- `.wize/knowledge/project-context.md` (5 sections, YAML frontmatter, `last_updated` date).

## Steps

### 1. Vision and Audience

Copy from `brief.md` (or `prd.md` if brief is missing). One paragraph each. Mark the source file in a comment.

### 2. Tech stack

From `architecture.md`, list: runtime, framework, database, key libraries, build tool. One bullet per item. Skip items that are "TBD".

### 3. Key ADRs

List the 5 most recent ADRs from `.wize/solutioning/adrs/`. For each: title, decision, why. Older ADRs are out of scope; refer to `adrs/index.md` for the full list.

### 4. Active risks

Copy from `risk-profile.md` the top 5 risks (highest prob × impact). One bullet per risk with the mitigation. Defer the rest.

### 5. Active sprint

Read `.wize/implementation/sprint-status.yaml` and include: sprint number, capacity, in-progress stories. Skip if no active sprint.

### 6. Hand off

Output is a markdown file. Wizer uses this file to seed `/wize-help`, `/wize-dev-story`, and `/wize-onboarding` reads.

## Output template

```markdown
---
generated: YYYY-MM-DD
last_updated: YYYY-MM-DD
sources:
  - .wize/planning/brief.md
  - .wize/planning/prd.md
  - .wize/planning/ux/ux-design/index.md
  - .wize/solutioning/architecture.md
  - .wize/solutioning/adrs/
  - .wize/implementation/tea/risk-profile.md
---

# Project Context — {project_name}

## Vision
{paragraph from brief.md}

## Audience
{paragraph from brief.md or prd.md}

## Tech stack
- Runtime: {value}
- Framework: {value}
- Database: {value}
- Key libraries: {value}
- Build: {value}

## Key ADRs
1. **{title}** — {decision}. Why: {why}.
2. ...

## Active risks
1. **{R-id}** — {description}. Mitigation: {mitigation}.
2. ...

## Active sprint
- Sprint: {N}
- Capacity: {days}
- In-progress: {stories}
```

## Anti-patterns Tony rejects

- Reading all 6 sources in full and dumping them. Summarize in 5 sections.
- Editing the project-context.md by hand. (Always re-run the workflow to keep `last_updated` honest.)
- Skipping the frontmatter. Other agents parse it.
- Including items marked "TBD". Surface them in the `Open questions` section instead.

## Hand-off

> "Project context updated at `.wize/knowledge/project-context.md`. {N} sources, 5 sections, {date}. Next: `/wize-onboarding` (Wizer) reads this for first contact."
