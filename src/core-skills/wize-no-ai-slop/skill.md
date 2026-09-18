---
code: wize-no-ai-slop
description: "Use quando qualquer agente for escrever ou editar texto para usuário final — READMEs, runbooks, microcopy, release notes, UX copy — para remover padrões de 'AI slop' sem achatar a voz do autor. Também detecta slop em rascunhos sem reescrever."
name: No AI Slop
module: core
status: ready
---

# No AI Slop — human writing hygiene

**Goal.** End-user-facing prose (READMEs, runbooks, release notes, UX microcopy, docs, announcements) that reads like a sharp human wrote it — not like a model's default register. Remove AI-generated patterns without flattening the writer's personal voice. This is a hygiene pass every Wize agent applies when the reader is outside the team; internal artifacts (PRD, ADR, gate) keep their own conventions.

Adapted to the Wize method from [no-ai-slop](https://github.com/petergyang/no-ai-slop) by Peter Yang (MIT) — credited in the README.

## Two jobs

**Apply while writing (default for Peggy & Mantis).** When drafting or editing end-user text, run the rules below as you write — not as a retrospective cosmetic pass. Produce the text plus, on request, a short **What changed** section.

**Detect.** When asked whether a piece "reads like AI", name each pattern found with a quoted line and a short fix. Do not rewrite, do not score, and do not guess whether AI wrote it — named patterns are evidence the reader can check. Offer to edit after.

## Voice first

- **Preserve the writer's real voice.** Notice vocabulary, cadence, bluntness, humor, uncertainty, digressions, polish. Keep the traits that feel personal. Do not make every paragraph equally tidy.
- **Minimum effective edit.** Fix patterns, errors, repetition, unclear passages. Leave strong human sentences alone.
- **Keep the meaning.** Never invent claims, examples, stats, or opinions. If something is unclear, ask.
- **Preserve useful edge.** Strong opinions, blunt language, honest admissions ("I think", "maybe") stay when they carry real uncertainty or the writer's spoken rhythm.

## Principles

- **Lead with the point** when the setup adds nothing; keep personal setups that add context, tension, or character.
- **Front-load only where it helps** — never force every section into the same point-detail-background shape.
- **Every sentence earns its place.** Cut empty qualifiers and throat-clearing.
- **Active voice, human subjects.** "The team shipped it Tuesday" beats "the decision emerged". Never let inanimate things do human verbs.
- **Verbs do the work.** "Made a decision" → "decided". "Has the ability to" → "can". Prefer plain `is`/`has` over fake-strong verbs ("serves as a hub").
- **Concrete beats abstract.** "Improved efficiency" → "cut deploy time from 40 min to 4". Names, numbers, dates, mechanisms, examples.
- **Portability test.** A sentence that could move unchanged to another company or product is filler — cut it or replace it with something specific to this subject.
- **Show, don't label.** Make facts carry the emphasis; delete commentary that tells the reader a point is important, surprising, or obvious.
- **Protect the specific fact.** Don't smooth a real detail into generic importance.
- **Untangle without flattening cadence.** Split genuinely hard sentences; keep clear spoken rhythm and fragments that belong to the voice.

## Words to cut

- **Banned:** delve, foster, leverage, utilize, facilitate, empower, streamline, robust, cutting-edge, paradigm shift, game changer, this is huge, this changes everything, tapestry, realm, beacon, multifaceted, meticulous, intricate, paramount, transformative, elevate, embark, supercharge, harness, ever-evolving.
- **Often-empty adverbs** (cut unless they carry emphasis or uncertainty): just, literally, honestly, simply, actually, truly, fundamentally, importantly, crucially, inherently, inevitably.
- **Often-empty phrases** (cut when they delay the point): it's worth noting, at the end of the day, when it comes to, at its core, in today's world, the reality is, in terms of, with regard to, in order to, going forward, let's dive in.

## Patterns to cut

1. **Binary contrasts** — "It's not X. It's Y." State Y directly.
2. **Throat-clearing openers** — "Here's the thing", "Let me be clear". State the point.
3. **Faux-insight setups** — "What nobody tells you", "The part everyone misses". Make the claim stand alone.
4. **Colon reveals** — "The best part: it learns." Use colons for lists and labels, not fake drama.
5. **Superficial analysis** — trailing "-ing" clauses that pretend to explain ("…, highlighting the team's commitment"). State the actual consequence.
6. **Importance puffery** — "marks a pivotal moment", "a testament to". State the fact; let the reader judge.
7. **Interpretive metadiscourse** — "That last part matters", "As you can see", "The key point is". Delete.
8. **Weasel attribution** — "experts agree", "studies show". Name the source or cut; ask before inventing one.
9. **Synonym cycling** — if the clear word is right, repeat it.
10. **Negative listing** — "Not a X. Not a Y. A Z." → just say Z.
11. **Dramatic fragments** — "That's it. That's the whole thing." Use complete sentences.
12. **Robotic rhythm** — vary repeated sentence shapes and paragraph structures only when it helps the point.
13. **Rhetorical setups** — "What if I told you…", "Think about it:", self-answered "Question? Answer."
14. **Fake-profound kickers** — delete the cute final line; end on the clearest concrete sentence, takeaway, or next action.
15. **Summary-recap endings** — "In conclusion", "Ultimately", restating the piece.
16. **Formatting slop** — emoji in headings, bold sprinkled mid-sentence, bullets where two sentences of prose read better, headers over two-sentence sections.
17. **Em dashes as a rhythm crutch** — none in short copy; 1–2 in long drafts only when they clearly beat commas or parentheses.

## Self-check (eval)

Before handing off end-user prose, answer:

- Does it preserve the writer's point, voice, and useful edge — without invented claims? (pass/fail)
- Is cutting proportional, leaving strong human sentences alone? (pass/fail)
- Does every generic sentence survive the portability test? (pass/fail)
- Are banned words, filler phrases, and the 17 patterns absent? (pass/fail)
- Would the writer recognize it as their own voice when read to a sharp colleague? (pass/fail)

If any check fails, fix and re-check before returning the draft.

## When NOT to use

- Internal Wize artifacts (PRD, ADR, story, gate) — they have their own editorial skills (`wize-editorial-review-prose` / `wize-editorial-review-structure`).
- Spelling/grammar — use a linter.
- The user wants audience calibration (age, role, depth) → that's `wize-eli5`; combine both when writing for a tuned audience.
