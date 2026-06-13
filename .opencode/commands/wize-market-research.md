---
description: "1-analysis: Market Research"
---

# Market Research

# Market Research

**Goal.** Conduct market research on competition and customers to inform the product brief and PRD.

Pepper Potts drives. Peggy Carter edits prose. Output lands in `.wize/planning/research/market-{slug}-research-{date}.md`.

## When to use

- "I need market research on..."
- "Who are the competitors?"
- "What do customers actually want?"

## Inputs

- Open questions from `.wize/planning/brief.md`
- User-provided topic or problem area
- Web search access

## Outputs

- `.wize/planning/research/market-{slug}-research-{date}.md`

## Workflow architecture

This skill uses **step-file architecture**:

- Six steps, each self-contained.
- Sequential progression with user control.
- Document state tracked in frontmatter (`stepsCompleted`).

## On activation

1. Load `.wize/config/project.toml` and `.wize/config/user.toml`.
2. Resolve language settings and output paths.
3. Greet the user in `communication_language`.
4. Ask for the market research topic if not provided.
5. Derive `{research_topic_slug}` and create the output file from `research.template.md`.
6. Read fully and follow `./steps/step-01-init.md`.

## Steps

1. `step-01-init.md` — confirm scope.
2. `step-02-customer-behavior.md` — analyze customer behavior.
3. `step-03-customer-pain-points.md` — identify pain points.
4. `step-04-customer-decisions.md` — map purchase/journey decisions.
5. `step-05-competitive-analysis.md` — analyze competitors.
6. `step-06-research-completion.md` — synthesize and complete.

## Hand-off

> Market research document is in `.wize/planning/research/`. Hill can quote the findings in the PRD; open questions route back to Wizer.
