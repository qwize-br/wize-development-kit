---
status: accepted
date: 2026-06-13
deciders: André Dantas, Claude
---

# ADR-001: Import selected BMAD Step flows into Wize Dev Kit

## Context

The BMAD Method repository (`/home/andrefrd/Projetos/qwize/wize-development-kit`) contains several well-structured Step-based skills. Wize Dev Kit had already imported the high-level lifecycle, but several Step flows remained unported. We needed to decide which ones to adapt and how to integrate them without breaking existing Wize workflows.

## Decision

Import and Wize-ify four BMAD Step flows:

1. `bmad-spec` → new core skill `wize-spec`.
2. `bmad-create-architecture` → rewrite `wize-create-architecture` as 8-step micro-file workflow.
3. `bmad-code-review` → rewrite `wize-code-review` as 4-step adversarial triage workflow.
4. BMAD research family (`market`, `domain`, `technical`) → three new vertical skills under `src/method-skills/1-analysis/`.

## Alternatives considered

- **Import everything.** Rejected — too broad, would destabilize v0.3.x and create maintenance burden.
- **Keep old monolithic workflows and add Steps alongside.** Rejected — duplicates confuse users and split maintenance.
- **Use Wize-research as a single skill with modes.** Rejected — BMAD's separate skills provide clearer intent and output templates.

## Consequences

- `wize-create-architecture` and `wize-code-review` gain granular, user-controlled execution.
- New skills are discovered automatically by existing `workflow.md`/`skill.md` walkers.
- Old workflow bodies are archived in `.wize/knowledge/decisions/` for reference.
- README, DECISIONS, and module catalogs are updated.
