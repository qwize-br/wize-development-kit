---
code: wize-editorial-review-structure
name: Editorial Review — Structure
module: core
status: ready
---

# Editorial Review — Structure

**Goal.** Catch structural drift in Wize artifacts: missing required sections, wrong ordering, inconsistent heading levels. Peggy Carter runs the review; the user applies the fixes.

Peggy drives. Tony on call for architecture artifacts; Maria Hill for PRD; Hawkeye for gates.

## When to use

- "Review the structure of this PRD."
- "Is this ADR complete?"
- "Does this gate file have all required sections?"

## When NOT to use

- Prose quality → use `wize-editorial-review-prose`.
- Content correctness (does the AC actually hold?) → use `wize-tea-review` or `wize-validate-prd`.

## Inputs

- A markdown file under `.wize/`.
- (Optional) the artifact type (PRD, ADR, gate, story, brief) — auto-detected from path.

## Output

- A markdown review with section-level findings (missing, misordered, mistyped).

## Steps

### 1. Detect

Infer the artifact type from the path:

| Path | Type |
|---|---|
| `planning/brief.md` | brief |
| `planning/prd.md` | prd |
| `solutioning/adrs/ADR-*.md` | adr |
| `solutioning/architecture.md` | architecture |
| `implementation/tea/{epic}/{story}/gate.md` | gate |
| `solutioning/stories/*/*.md` | story |
| `solutioning/epics/*/*.md` | epic |

### 2. Check against the template

Each type has a required set of H2 sections. Use the template in the relevant workflow file (e.g., for PRD, see `wize-create-prd/workflow.md`). Compare against the file.

### 3. Hunt (4 areas)

- **Missing sections.** Required H2 not present.
- **Misordered sections.** H2 present but in wrong order relative to the template.
- **Inconsistent heading levels.** H3 used where H2 is expected (or vice versa).
- **Empty sections.** H2 with no content (a heading and nothing else).

### 4. Hand off

Output is a markdown list with section-level findings. Severity: **must-fix** (missing) / **should-fix** (misordered) / **nit** (heading level).

## Output template

```markdown
---
date: 2026-06-17
file: planning/prd.md
type: prd
author: Peggy
---

# Structure review — prd.md (PRD)

## Must-fix
- Missing H2: "Out of scope".
- Missing H2: "Open questions".

## Should-fix
- H2 "Success criteria" appears after "Non-goals"; should be before (per template).

## Nits
- H3 used in "Constraints" where H4 would match the rest of the doc.
```

## Anti-patterns Peggy rejects

- Suggesting a different section order than the template. (The template is the source of truth.)
- Reviewing prose. (Use the prose skill.)
- Marking optional sections (e.g., "Glossary" in PRD) as missing.
- Auto-rewriting the file. (Suggest; never write.)

## Hand-off

> "Structure review complete for `{file}` ({type}). {M} must-fix, {K} should-fix, {L} nits. Apply or reject per finding."
