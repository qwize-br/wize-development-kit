---
name: wize-spec
description: "core skill: Spec"
---

# Spec

# Spec

**Goal.** Distill any intent input into a canonical, preservation-validated machine contract for downstream Wize work.

Takes any intent input — vague idea, brain dump, PRD, RFC, brief, Slack thread, customer email, meeting transcript, mockups, mixed multi-source — and produces `SPEC.md` carrying the five-field kernel (Why, Capabilities, Constraints, Non-goals, Success signal) plus companion files for load-bearing content that does not fit or would bloat the kernel.

Peggy Carter edits prose; Tony, Maria Hill, and Shuri consume the spec downstream.

## When to use

- "Create a spec for this idea."
- "Distill this PRD into a spec."
- "Validate this spec."
- "Update the spec."

Multiple skills may call to update the same spec over time.

## Workspace

The spec is **always a folder** named `{output_folder}/specs/spec-{slug}/`.

`{slug}` describes the thing being specced, not the input shape:

- Source artifact already carries a slug (e.g., `prd-foo-bar-2026-05-23/`): inherit (`foo-bar`).
- Sparse, in-chat, or multi-source input: ask interactively. Headless callers must provide it.
- Same slug = same folder. A second invocation updates in place, preserving capability IDs.

Inside the spec folder:

```
<spec-folder>/
  SPEC.md                  ← uppercase, the kernel
  <companion-1>.md         ← optional, content-typed
  <companion-2>.md
  .decision-log.md         ← canonical memory for this spec
```

## The Operation

1. Read the input and its ancillary linked materials. If no input, ask or block.
2. If a prior `SPEC.md` exists at the target folder, read it — the operation becomes an **update**. Preserve capability IDs; new capabilities get the next unused `CAP-N`; never reuse retired IDs.
3. When input is structured and pre-sorted (PRD with addendum, brief from Pepper, UX spec from Mantis), trust the authored separation.
4. When input is mixed (brain dump, transcript, email), sort claims using the three-lens load-bearing test and route to the kernel field or a companion.
5. Distill into the five-field kernel using `assets/spec-template.md`. When input is rich, extract directly. When input is sparse, choose:
   - **express** — best-effort distill, every gap becomes an `open_questions[]` entry
   - **guided** — walk the five fields with the user one at a time
6. Write lean: every sentence must earn its place.
7. If input is genuinely too thin (e.g. "an app for hikers" with no context), stop and suggest `wize-product-brief` or `wize-create-prd`.

## Load-bearing

A claim is **load-bearing** if any downstream consumer (skill, implementing agent, verification pass) would change a decision without it.

## Companions

When load-bearing content does not fit the five-field kernel, it lives in a companion. The kernel cites it; the companion holds it. Companions are part of the contract; every consumer reads `companions:` in `SPEC.md` frontmatter to discover them.

**Spawn a companion when the content needs more than one kernel-shape line:** multi-item catalogs (archetypes, modes, routes, entity matrices), tables, diagrams (always), editorial voice rules, long-form reference material the kernel cites by name.

Companions are either:

- **Spec-authored** — written by `wize-spec` and live as siblings of `SPEC.md` (e.g., `glossary.md`, `patron-archetypes.md`, `stack.md`, `conventions.md`, `brownfield.md`, `architecture-diagrams.md`, `state-machines.md`, `failure-modes.md`).
- **Adopted** — load-bearing artifacts written by upstream skills that downstream still needs to read (e.g., a `DESIGN.md` from Mantis, an API spec from a partner). The originating skill owns them; `wize-spec` references them in `companions:` but does not edit them.

Two rules govern companions:

1. Name spec-authored companions for the content type they hold.
2. Diagrams always land in a companion, regardless of size. Mermaid/ASCII/image references live there; `SPEC.md` holds prose only.

Pre-existing project-wide docs (e.g., `.wize/knowledge/document-project/conventions.md`) that downstream needs are listed as **adopted companions**, never duplicated.

## Spec Law

1. Each capability has both `intent` and `success`.
2. Intents describe WHAT, not HOW.
3. Constraints actually bend design decisions.
4. Non-goals are explicit — at least one.
5. Success signal is concrete enough to test or demonstrate against.
6. Capability IDs are stable and unique — never reused, never renumbered.
7. Preservation — every load-bearing source claim lands in `SPEC.md` or a companion.
8. Lean prose — every sentence carries load-bearing content.

## Self-Validate

After every create or update, sweep the artifact in two passes:

- **Pass 1 — Coherence.** Judge against Spec Law rules 1–6 and 8. Calls made without direct confirmation become `assumptions[]`; gaps become `open_questions[]`.
- **Pass 2 — Preservation.** Walk source claims; confirm each landed in `SPEC.md` or a companion. Wrapper-only drops are logged under "Wrapper-only content" so the drop is on the record.

Append a one-paragraph verdict to `.decision-log.md`.

## Output

- **Interactive** — share the spec folder path, name capability count, companions produced, and verdict in one or two sentences. List `assumptions[]` and `open_questions[]` if non-empty.
- **Headless** — return JSON per `assets/headless-schemas.md`.

## After the spec is output

Any update to assumptions, open questions, or other changes is appended to `.decision-log.md` and, when applicable, to the source artifact's decision log.

## Hand-off

> Spec `{slug}` distilled into `{output_folder}/specs/spec-{slug}/SPEC.md` with `{n}` capabilities and `{m}` companions. Verdict: `{verdict}`. Open questions: `{list}`.
