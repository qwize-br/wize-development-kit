---
description: "1-analysis: PR/FAQ"
---

# PR/FAQ

# PR/FAQ — Working Backwards

**Goal.** Force alignment by writing the *future* press release and a tight FAQ **before** anyone builds anything. Amazon-style. If you can't write a compelling PR, you don't have a product yet.

Pepper drives. Peggy polishes prose. Output lands in `.wize/planning/prfaq.md`.

## When to run

Run this:
- New product or new strategic feature.
- The team disagrees on the user-visible value.
- You're about to commit > 1 month of engineering.

Skip this:
- Bug fix, copy edit, dependency bump → use `wize-quick-dev`.
- The brief already crisply names the user-visible value and the team is aligned → write the PRD directly.

## Inputs

- `.wize/planning/brief.md`
- `.wize/planning/research.md` (optional)

## Outputs

- `.wize/planning/prfaq.md`

## Structure (the Amazon shape)

A PR/FAQ has two parts: the **PR** (≤ 1 page) and the **FAQ** (≤ 2 pages).

### The PR (write this first)

| Section | Length | What goes in it |
|---|---|---|
| **Headline** | 1 line | Audience + benefit + product name. Reader-understandable. |
| **Sub-headline** | 1 line | The non-obvious part of the benefit. |
| **Summary paragraph** | 3–5 sentences | What it is, who it's for, what changes, where to get it. |
| **Problem paragraph** | 3–5 sentences | Why this matters *now*, evidence the pain is real. |
| **Solution paragraph** | 3–5 sentences | How the product solves the problem. Concrete, not abstract. |
| **Internal quote** | 1 quote | A leader (founder/CEO) saying why this matters strategically. |
| **How it works** | 3 sentences | Three lines max. Not implementation — the *user* mental model. |
| **Customer quote** | 1 quote | An imagined real user saying the thing they'd say. Specific. |
| **How to get started** | 2 lines | One sentence: where + how. One sentence: what's first. |

If you find yourself writing more, cut. The discipline is the point.

### The FAQ

5–10 questions a sharp reader would actually ask. Crisp answers.

**Mandatory questions** (always include):

1. Who exactly is this for?
2. What does this replace today?
3. Why now? (Why not last year, why not next year?)
4. How is this different from {{nearest competitor}}?
5. What's *out* of scope at launch?
6. What does success look like in 6 months? In 18 months?
7. What are the top three risks?

**Optional questions** (include when relevant):

8. What's the pricing model?
9. How does this work for non-English locales / accessibility / offline?
10. What does the regulatory story look like?
11. What's the launch sequence (geos / segments / preview)?

## Steps

### 1. Frame and freeze the audience

Write the audience line at the top of your draft and don't move it. Every sentence is judged against "does this matter to the audience?"

### 2. PR before FAQ

Always. The discipline of writing the PR exposes vague thinking. The FAQ comes after, when you're forced to defend it.

### 3. Show, don't market

No "world-class," "revolutionary," "AI-powered" without a noun next to it. If you can replace the adjective with another and lose nothing, delete it.

### 4. Numbers, not adjectives

Every claim has a unit. "Reduces onboarding from 35 minutes to 7" beats "reduces onboarding significantly."

### 5. Pre-mortem question

Before sending, write the answer to: *"It's six months after launch and it failed. Why?"*. If the FAQ doesn't already cover the failure mode, add the question.

### 6. Adversarial review

Run `wize-review-adversarial` on the draft. Cut what survives only "trust me."

### 7. Hand off

The PR/FAQ is **not** the PRD. It's a strategic alignment doc. Marker `status: aligned`. Hill writes the PRD from this + the brief.

## Output template

```markdown
---
status: draft | aligned
owner: Pepper Potts
created: YYYY-MM-DD
---

# PR/FAQ — {{project_name}}

## Press Release

**Headline:** {{audience}} can now {{benefit}} with {{product_name}}.
**Sub-headline:** {{the non-obvious twist}}.

{{summary paragraph}}

{{problem paragraph}}

{{solution paragraph}}

> "{{quote}}" — {{internal leader title}}

How it works: {{three sentences}}

> "{{customer quote}}" — {{persona}}

Get started: {{where + first step}}

## FAQ

**Q1. Who exactly is this for?**
…

**Q2. What does this replace today?**
…

**Q3. Why now?**
…

(…through Q10 as needed)

## Pre-mortem
It's six months after launch and it failed. Why?
1. …
2. …
3. …
```

## Anti-patterns Pepper rejects

- PR longer than one page. Cut.
- A press release with no user. ("Wize Foo unlocks synergies.") — say *who*.
- A FAQ that dodges the hard question. The reader will ask it; better in your draft than in a launch review.
- Pricing left vague when it's the load-bearing question.
- Customer quote that sounds like marketing copy. Rewrite as a person speaking.

## Hand-off

> PR/FAQ is in `.wize/planning/prfaq.md`. Aligned with leadership. Hill, the PRD scope should anchor on FAQ Q5 (in/out). Mantis, the customer quote is your North Star for UX.
