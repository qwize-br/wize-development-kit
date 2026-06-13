---
status: accepted
date: 2026-06-13
deciders: Tony Stark
---

# ADR-003: State file as JSON for resume

## Context

Long scans (`deep`, `exhaustive`) may span multiple LLM context windows. BMAD uses `project-scan-report.json` to resume.

## Options

1. **JSON** — BMAD-compatible, machine-readable, easy to validate with JSON Schema.
2. **YAML frontmatter in markdown** — human-readable, but less structured for state.
3. **No state file** — simpler, but no resume and no progress tracking.

## Decision

Option 1. JSON state file with a JSON Schema. Written to `.wize/knowledge/document-project/project-scan-report.json`.

## Consequences

- **Now:** resume and progress tracking available.
- **Later:** `wize-dev-kit doctor` can read the state file and report stale scans.
