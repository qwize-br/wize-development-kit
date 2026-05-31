---
code: wize-create-architecture
name: Create Architecture
phase: 3-solutioning
owner: wize-agent-architect   # Tony Stark
status: stub
---

# Create Architecture

**Goal.** Design the system inside Fury's frame. Components, sequences, data flows, ADRs. Concrete enough that Shuri can implement and Hawkeye can test.

## Inputs
- `.wize/planning/prd.md`
- `.wize/planning/ux/ux-design/`
- `.wize/planning/tech-vision.md` (Fury)
- `.wize/planning/nfr-principles.md` (Fury)
- `.wize/solutioning/design-system/` (Mantis)
- `.wize/knowledge/document-project/` (if brownfield)

## Outputs
- `.wize/solutioning/architecture.md`
- `.wize/solutioning/adrs/{ADR-NNN}-{slug}.md`

## Steps
1. **Stack interview.** Tony asks the user (via Wizer) about preferences: language, runtime, deployment target. Consults overlay stack catalogs (web/app) if active. Records decisions.
2. **Components.** List components, responsibilities, boundaries.
3. **Sequences.** For each critical scenario from Mantis, write a sequence (text or PlantUML).
4. **Data model.** Tables / collections / contracts.
5. **Cross-cutting.** Auth, logging, observability, error handling.
6. **ADRs.** Every significant trade-off becomes its own ADR: context, options, decision, consequences.
7. **Validate against NFRs.** Check each Fury principle.
8. **Hand-off to epics.**

## Architecture doc template

```markdown
# Architecture — {{project_name}}

## Stack
- Language: …
- Runtime: …
- Storage: …
- Deploy: …

## Components
| Component | Responsibility | Boundary |
|---|---|---|

## Data model
…

## Cross-cutting
- Auth: …
- Observability: …
- Errors: …

## NFR check
- Performance: …
- Security: …
- Reliability: …
- Accessibility: …
- Cost: …
```
