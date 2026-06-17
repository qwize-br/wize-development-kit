---
code: wize-editorial-review-prose
name: Editorial Review — Prose
module: core
status: ready
---

# Editorial Review — Prose

**Goal.** Catch prose drift in Wize artifacts (brief, PRD, ADR, gate, story, retrospective). Peggy Carter runs the review; the user applies the fixes.

Peggy drives. Wizer is on call for the call to action ("rewrite the whole section" or "leave it").

## When to use

- "Review the prose in this PRD."
- "Find jargon and hedging in the brief."
- "Is this gate file clear?"

## When NOT to use

- Spelling/grammar (use a linter; out of scope here).
- Structure (missing sections, wrong ordering) → use `wize-editorial-review-structure`.
- Tone change (tone is intentional; leave it).

## Inputs

- A markdown file under `.wize/`.
- A line range (optional; default = whole file).

## Output

- A markdown review with line-level findings, each tagged with severity (nit / suggest / recommend).

## Steps

### 1. Read

Read the file (or line range). Skip code blocks. Skip frontmatter.

### 2. Hunt (4 areas)

- **Voice.** Active voice preferred. Flag passive constructions ("was decided by", "is being implemented").
- **Jargon.** Acronyms not defined on first use. Discipline-specific terms (e.g., "JTBD", "NFR") that are not in the project glossary.
- **Hedging.** Softeners that hide commitment: "might", "could possibly", "we should consider", "it would be nice". Suggest a stronger verb.
- **Pronouns.** Ambiguous "this", "it", "they" without a clear referent. Suggest a specific noun.

### 3. Rank

Per finding:

- **Nit** — minor; user can ignore.
- **Suggest** — worth a 5-second fix.
- **Recommend** — blocks the artifact's clarity; should be fixed.

### 4. Hand off

Output is a markdown list. The user applies or rejects each finding. Peggy does not auto-edit.

## Output template

```markdown
---
date: 2026-06-17
file: planning/prd.md
author: Peggy
---

# Prose review — prd.md

## Recommendations
- L42: "we should consider using a token bucket" → "we use a token bucket". Hedging hides the decision. **[recommend]**
- L78: "this might affect the user" → "this affects new signups". Pronoun + hedging. **[recommend]**

## Suggests
- L15: "rate-limit" appears 4 times. First use: spell out "rate-limit (per-IP cap on request rate)". **[suggest]**
- L23: passive "is implemented by" → active "we implement". **[suggest]**

## Nits
- L88: comma splice. **[nit]**
```

## Anti-patterns Peggy rejects

- Auto-editing the source file. (Suggest; never write.)
- Commenting on tone or style preference. (Tone is intentional; structure is a separate review.)
- Marking everything as recommend. (Cap at 5 recommends per review.)
- Reviewing code blocks. (Out of scope.)

## Hand-off

> "Prose review complete for `{file}`. {N} findings. {M} recommends, {K} suggests, {L} nits. Apply or reject per finding."
