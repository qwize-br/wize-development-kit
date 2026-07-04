---
description: "1-analysis: Research"
agent: wize-agent-analyst
---

# Research

# Research

**Goal.** Surface evidence that hardens the brief and trigger map. Frame the questions Pepper actually needs answered, do focused passes (market / competitors / analytics / interviews), and write the synthesis in a way Maria Hill can quote in the PRD.

Pepper drives. Peggy edits prose. Output lands in `.wize/planning/research.md` with raw materials in `.wize/knowledge/research/`.

## Inputs

- Open questions in `.wize/planning/brief.md`.
- Hypotheses in `.wize/planning/ux/trigger-map.md`.
- External access (browser, MCPs) and/or attached materials (decks, transcripts).

## Outputs

- `.wize/planning/research.md` — short synthesis (≤ 2 pages) referencing sources.
- `.wize/knowledge/research/{slug}.md` — one file per major source (raw notes, links, attached PDFs).

## Steps

### 1. Frame the questions

Convert open questions + hypotheses into a numbered list. Each question is:
- **Specific** — "What's the median onboarding time for the top 5 competitors?" not "How is onboarding usually done?".
- **Answerable in a finite pass** — if it takes weeks, decompose.
- **Tagged with category** — `market / competitive / analytics / interview / desk-research / regulatory`.

### 2. Choose the framework that fits each question

| Category | Recommended frame | Tools |
|---|---|---|
| Market sizing | TAM/SAM/SOM, top-down + bottom-up reconciled | Statista, public filings, gov registries |
| Competitive | Porter's 5 + feature matrix + pricing scan | competitor sites, G2/Capterra, Pricing/Plans pages |
| User research | Jobs-to-be-Done (Christensen / Klement) | 5–8 interviews (semi-structured, 30min) |
| Behavioral | 5W2H + analytics funnel | product analytics (Amplitude/PostHog), session replays |
| Compliance/legal | Reg list + clause map | gov sites, legal counsel review |
| Macro context | PESTLE (political/economic/social/technological/legal/environmental) | desk research |

### 3. Run focused passes

One question, one pass. Don't bundle. For each:

- Define what "enough evidence" looks like before starting.
- Cite or it didn't happen. Links + access date.
- When numbers conflict across sources, write down both and flag.

### 4. Synthesize

In `research.md`, for each original question, write:

```markdown
### Q1. {{the question}}
**Finding:** one sentence answer.
**Confidence:** high | medium | low
**Why we believe it:** 2–3 lines + citations [1][2][3].
**Implication for the brief/PRD:** what changes (or doesn't) because of this.
```

Don't include raw quotes here — link to `.wize/knowledge/research/{slug}.md`.

### 5. Flag the gaps

End the synthesis with a "Still open" section. List questions we couldn't answer + the cheapest next step (one interview / one analytics query / one expert call). Route back to Wizer with the gap.

## Output template (synthesis)

```markdown
---
status: ready-for-prd
owner: Pepper Potts
created: YYYY-MM-DD
---

# Research — {{project_name}}

## Q1. {{question}}
**Finding:** …
**Confidence:** medium
**Why:** … [1]
**Implication:** Brief constraint #3 holds; PRD scope can drop feature X.

## Q2. …

## Still open
- Q5: pricing elasticity in segment S — needs 1 hour with sales lead.

## Sources
[1] {{title}} — {{url}} (accessed YYYY-MM-DD)
[2] interview-acme-cto-2026-05-30 — see knowledge/research/acme-cto.md
```

## When to use which framework (heuristic)

- **JTBD** when you're about to write personas; JTBD is sharper than archetypes.
- **Porter** when picking a market to enter or a defensible moat.
- **PESTLE** for projects with regulatory or geopolitical exposure.
- **5 Whys + analytics funnel** when a metric is bad and the cause isn't obvious.

## Anti-patterns Pepper rejects

- Synthesis without citations.
- "We surveyed users" with no n, no method, no script.
- Single-source claims with high confidence ("everyone is using X" because of one blog post).
- Using brand-name competitor research as user research — they're different.
- Continuing to research when the decision is already made. Stop and ship.

## Hand-off

> Research is in `.wize/planning/research.md`. Q3 still open — sales lead has a slot tomorrow. Hill can start the PRD on what's confirmed.
