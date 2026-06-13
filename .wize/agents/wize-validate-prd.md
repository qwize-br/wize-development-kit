# Validate PRD

> 2-plan: Validate PRD

# Validate PRD

**Goal.** Decide whether the PRD is ready to leave Plan and enter Solutioning. Catch ambiguity before architecture is wasted on it. Cheap step; saves multiples of itself downstream.

Maria Hill chairs. Pepper, Mantis, Fury contribute. Output is either `validated: true` written to `prd.md` or a punch list routed back to authors.

## When to run

After `wize-create-prd` produces `status: ready-for-validation`. Run once per major PRD change.

## Inputs

- `.wize/planning/prd.md`
- `.wize/planning/brief.md`
- `.wize/planning/ux/trigger-map.md`
- `.wize/planning/research.md` (when present)
- `.wize/planning/tech-vision.md` (when Fury already wrote one)

## Outputs

- In-place edits to `prd.md` (validators add a "Validation log" section).
- If validated: `prd.md` frontmatter flips to `status: validated`.
- If not: a punch list, each item routed back to the owning agent.

## Checklist (Maria Hill runs this)

### Completeness
- [ ] Vision sentence present and matches the brief.
- [ ] 3–5 goals; each measurable; each tied to a trigger-map row.
- [ ] Scope `In` and `Out` both populated; `Out` items have reasons.
- [ ] Backbone stories cover every In-scope item.
- [ ] Every In-scope item has 3–7 ACs.
- [ ] Constraints + Assumptions + Dependencies all named.
- [ ] NFR pointer present.
- [ ] Open questions: each has an owner + deadline.

### Quality
- [ ] Every AC is observable (testable by Hawkeye without ambiguity).
- [ ] No AC contains the word "easy", "intuitive", "responsive" without a numeric criterion.
- [ ] INVEST: every backbone story passes (independent, negotiable, valuable, estimable, small, testable).
- [ ] No goal repeats a brief constraint as if it were a goal.

### Cross-checks
- [ ] **Pepper:** every goal anchors on a row of the trigger map.
- [ ] **Mantis:** every screen implied by the ACs is addressable in UX (no AC requires a UI the team hasn't agreed exists).
- [ ] **Fury:** the PRD's NFR pointer doesn't contradict the tech-vision.
- [ ] **Hawkeye preview:** at least the gate strategy is mentioned (advisory vs enforcing) for visibility.

### Risk
- [ ] No open question is marked `blocker` AND has a deadline past the PRD validation date.
- [ ] Any assumption that, if wrong, kills > 30% of the scope has a verification plan.

## Decision

After the checklist:

- **Validated** → flip frontmatter to `status: validated`. Append a Validation log block to `prd.md` with date + each signatory.
- **Concerns** → write specific fix-asks per agent. Each fix-ask is concrete (line ref + what to change).
- **Reject** → rare. Use when the brief itself is wrong; loop back to Pepper.

## Validation log template (appended to `prd.md`)

```markdown
## Validation log — YYYY-MM-DD

**Status:** validated

**Signatories**
- Maria Hill (PM)  — concerns: none
- Pepper Potts (Analyst) — concerns: trigger-map row 3 needs a stronger signal name, will update.
- Mantis (UX) — concerns: none, UX work starts next.
- Fury (Solution Strategy) — concerns: none. NFR pointer confirmed.

**Notes**
- Open question "Brazil-only beta?" was answered by sales lead — added to *Out of scope: global launch* with rationale.
```

## Punch-list template (when not validated)

```markdown
## Validation punch list — YYYY-MM-DD

**Status:** changes required

**By Maria Hill — author rewrites:**
- `AC-02-3`: "loads fast" is not observable. Rewrite with numeric target tied to Fury's NFRs.
- Backbone story E04 fails INVEST-S (too large). Split into 2 stories.

**By Pepper:**
- Goal 2 is not anchored on a trigger-map row. Add row reference or remove.

**By Mantis:**
- AC-01-4 implies a "preview" screen that isn't in any UX list. Either spec the screen or cut the AC.

**By Fury:**
- NFR pointer cites old version of nfr-principles.md. Update.
```

## Anti-patterns

- "Looks good to me" with no checklist run. The validation only counts if checked.
- Validating to keep the schedule, knowing concerns are open. Document the concern.
- Validating with no Hawkeye preview at all. Even a one-line gate strategy reference matters.

## Hand-off

If validated:

> PRD validated. Mantis, you're up: `wize-ux-scenarios`. Fury, write or refresh `tech-vision.md` so Tony can read both.

If not:

> PRD not yet validated. Punch list lives at the bottom of `prd.md`. {{Author}} fixes by {{date}}; we re-run validation.
