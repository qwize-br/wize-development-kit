---
status: accepted
date: 2026-06-13
deciders: Tony Stark
---

# ADR-002: Use CSV for project-type documentation rules

## Context

BMAD stores detection signals and scan rules in `documentation-requirements.csv`. The Wize kit needs equivalent classification for web, mobile, backend, cli, library, desktop, game, data, extension, infra, embedded.

## Options

1. **Hard-code rules in JS** — simple, but every new project type requires a code change.
2. **CSV file** — matches BMAD, editable without touching code, easy to extend.
3. **YAML in module.yaml** — consistent with existing module config, but harder to scan programmatically.

## Decision

Option 2. A CSV under the workflow folder (`src/method-skills/1-analysis/wize-document-project/documentation-requirements.csv`) drives detection and conditional scans.

## Consequences

- **Now:** classification is data-driven and testable in isolation.
- **Later:** teams can override rows via `.wize/custom/` without forking the kit.
