---
code: wize-technical-research
name: Technical Research
phase: 1-analysis
owner: wize-agent-analyst   # Pepper Potts
status: ready
description: "Use quando precisar pesquisar tecnologias, stacks, bibliotecas ou decisões técnicas."
---

> **Variante de pesquisa.** Para outros tipos de pesquisa, veja:
> - Mercado/concorrência → `/wize-market-research`
> - Domínio/indústria → `/wize-domain-research`
> - Técnica/stack → `/wize-technical-research`
> - Pesquisa geral (dispatcher) → `/wize-research`

# Technical Research

**Goal.** Conduct technical research on technologies, tools, and architecture patterns to inform stack decisions.

Pepper Potts drives. Tony Stark consumes the output directly. Peggy Carter edits prose.

Output lands in `.wize/planning/research/technical-{slug}-research-{date}.md`.

## When to use

- "Should we use X or Y?"
- "What is the current state of Z technology?"
- "I need a technical comparison of..."

## Inputs

- Open questions from `.wize/planning/brief.md` or `.wize/planning/tech-vision.md`
- User-provided technology or architectural topic
- Web search access

## Outputs

- `.wize/planning/research/technical-{slug}-research-{date}.md`

## Workflow architecture

Step-file architecture with six steps:

1. Scope confirmation
2. Technical overview
3. Integration patterns
4. Architectural patterns
5. Implementation research
6. Research synthesis

## On activation

1. Load `.wize/config/project.toml` and `.wize/config/user.toml`.
2. Ask for the technical topic if not provided.
3. Derive `{research_topic_slug}` and create the output file from `research.template.md`.
4. Read fully and follow `./technical-steps/step-01-init.md`.

## Hand-off

> Technical research is in `.wize/planning/research/`. Fury and Tony can use it for stack family decisions; open questions route back to Wizer.
