---
code: wize-index-docs
name: Index Docs
module: core
status: ready
---

# Index Docs

**Goal.** Rebuild `.wize/knowledge/index.md` from the actual tree. One file that lists every artifact with a one-line description and a relative link. New devs read this file first.

Wizer drives. Peggy polishes the one-line descriptions on the second pass.

## When to run

- After any major artifact is created or moved.
- Before sprint planning (to confirm what exists).
- When onboarding a new team member.

## When NOT to run

- Inside an IDE target folder (`.claude/`, `.cursor/`, etc.) — out of scope.
- As a CI step on every commit (too noisy; manual).

## Inputs

- The `.wize/` tree (read-only scan).
- A user message: "Rebuild the index" or similar.

## Output

- `.wize/knowledge/index.md` with sections: Planning, Solutioning, Implementation, Knowledge, Custom.

## Steps

### 1. Scan

Walk `.wize/` recursively. Skip hidden directories (`.DS_Store` etc.). For each file:

- Read its YAML frontmatter.
- If `description` is present, use it.
- Else use the first `# Heading` line.
- Else use the file name (kebab-case to title case).

### 2. Group

Sort into 5 sections by file path:

| Section | Path prefix |
|---|---|
| Planning | `.wize/planning/` |
| Solutioning | `.wize/solutioning/` |
| Implementation | `.wize/implementation/` |
| Knowledge | `.wize/knowledge/` (excluding the index file itself) |
| Custom | `.wize/custom/` |

### 3. Write

Generate `.wize/knowledge/index.md` with:

- YAML frontmatter (`generated`, `last_updated`, `total_files`).
- One H2 per section.
- One bullet per file: `- [{title}]({relative_path}) — {one-line description}`.
- A footer with the total file count and the timestamp.

If a section is empty, omit the heading.

### 4. Hand off

Output is the index file. The user can review and adjust manually if the one-liners are stale. Re-run to overwrite.

## Output template

```markdown
---
generated: 2026-06-17
last_updated: 2026-06-17
total_files: 24
---

# Wize artifacts index

## Planning (5)
- [Brief — site-qwize](planning/brief.md) — Pepper's one-pager for the site.
- [PRD — site-qwize](planning/prd.md) — Maria Hill's PRD for v1.
- [Trigger map](planning/trigger-map.md) — WDS user-psychology map.
- [UX scenarios](planning/ux/ux-scenarios.md) — Mantis's 8-question dialog.
- [Tech vision](planning/tech-vision.md) — Fury's stack pick.

## Solutioning (4)
- [Architecture](solutioning/architecture.md) — Tony's 8-step architecture.
- [ADR-001](solutioning/adrs/ADR-001-...) — ...
...

## Implementation (8)
- [Sprint 1 status](implementation/sprint-status.md) — closed.
- [Risk profile](implementation/tea/risk-profile.md) — 13 risks mitigated.
...

## Knowledge (6)
- [Document project overview](knowledge/document-project/overview.md) — ...
...

## Custom (1)
- [Agent: runbooks](custom/agents/wize-agent-runbooks/agent.yaml) — ...
```

## Anti-patterns Wizer rejects

- Including IDE target folders (`.claude/`, `.cursor/`, `.kimi/`, etc.) in the index.
- Dumping file contents (just the description + link).
- Auto-running on every commit (manual or scheduled only).
- Mixing in files outside `.wize/`.

## Hand-off

> "Index rebuilt at `.wize/knowledge/index.md`. {N} files indexed across 5 sections. Next: `/wize-help` reads this file when answering."
