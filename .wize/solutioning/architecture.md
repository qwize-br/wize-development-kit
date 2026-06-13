---
status: ready-for-stories
owner: Tony Stark
created: 2026-06-13
---

# Architecture — Expand `wize-document-project`

## Summary

Evolve the brownfield baseline from a single lightweight pass into a **multi-mode documentation engine** inspired by BMAD v6.8.0. Keep the existing 6-file baseline as the default `quick` mode; add `initial_scan`, `full_rescan`, `deep_dive`, and project-type classification. Outputs stay in `.wize/knowledge/document-project/`, produced by Pepper + Peggy + Tony + Shuri collaboration.

## Stack

- **Language:** Node.js 20+ (same as kit runtime)
- **Runtime:** CLI commands in `tools/installer/wize-cli.js` and new helper modules
- **Data:** static markdown + YAML frontmatter + optional `project-scan-report.json` state file
- **Test:** `node:test` (existing pattern)
- **Docs:** markdown templates under `src/method-skills/1-analysis/wize-document-project/`

## Components

| Component | Responsibility | Boundary |
|---|---|---|
| `document-project` workflow | Markdown skill read by Pepper | Defines modes, scan levels, output spec |
| `project-classifier` (new) | Detect project type from `package.json`, folders, patterns | Reads repo, writes `project-parts.json` |
| `scan-router` (new) | Decides which conditional scans run per project type | CSV-based rules |
| `batch-scanner` (new) | Reads source files in subfolder batches to avoid context blow-up | Called for `deep`/`exhaustive` |
| `index-renderer` (new) | Generates `index.md` with links + `(To be generated)` markers | Master navigation |
| `state-file` (new) | `project-scan-report.json` schema + read/write helpers | Enables resume |
| `wize-cli.js` | Entry point for `wize-dev-kit document-project <mode>` | Reuses existing CLI |

## Data model

- `project-scan-report.json` — resume state
- `project-parts.json` — detected parts for multi-part repos
- `documentation-requirements.csv` — 12 project types with scan flags and patterns
- Markdown outputs in `.wize/knowledge/document-project/`

## Sequences

### S1: User runs `wize-dev-kit document-project`

```
User → wize-cli.js: document-project
wize-cli.js → classifier: detect project type
classifier → state-file: create/restore scan report
classifier → scan-router: load documentation-requirements row
scan-router → batch-scanner: run conditional scans
batch-scanner → index-renderer: write index.md + conditional docs
index-renderer → state-file: finalize
```

### S2: Resume after interruption

```
User → wize-cli.js: document-project --resume
wize-cli.js → state-file: read project-scan-report.json
state-file → scan-router: continue from current_step
scan-router → batch-scanner: process remaining batches
```

## NFR check

- **Reliability:** state file enables resumable long scans.
- **Maintainability:** project-type rules live in CSV, not code.
- **Usability:** default stays the existing lightweight baseline; advanced modes are opt-in.
- **Testability:** every helper module gets `node:test` coverage.

## ADRs

- ADR-001: Keep lightweight baseline as default; advanced modes opt-in.
- ADR-002: Use CSV for project-type rules instead of hard-coded conditionals.
- ADR-003: State file as JSON (not YAML) for easier machine resume.
