---
code: wize-validate-prd
name: Validate PRD
phase: 2-plan
owner: wize-agent-pm   # Maria Hill (with Pepper + Mantis + Fury input)
status: stub
---

# Validate PRD

**Goal.** Make sure the PRD is ready to leave Plan and enter Solutioning. Catch ambiguity before architecture is wasted on it.

## Inputs
- `.wize/planning/prd.md`

## Outputs
- Inline edits + a validation log appended to `prd.md`.

## Checklist
- [ ] Every scope item has measurable ACs.
- [ ] No "TBD" in goals or constraints.
- [ ] Mantis confirms UX is addressable.
- [ ] Fury approves stack-family direction (or has explicit reason not to yet).
- [ ] No open questions with `blocker` priority remain.

## Outcome
Either `validated: true` (timestamp + signatories) or list of fix-asks routed back to the right agent.
