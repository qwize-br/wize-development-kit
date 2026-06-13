# Check Implementation Readiness

> 3-solutioning: Check Implementation Readiness

# Check Implementation Readiness

**Goal.** Before any story enters dev, confirm everything is in place. This is the **gate at the end of Phase 3**. Cheap; saves multiples of itself downstream.

Tony chairs. Hill and Hawkeye sign off. Pepper and Mantis answer if pulled in.

## Inputs

- `.wize/planning/prd.md` (validated)
- `.wize/planning/ux/ux-design/` + `index.md`
- `.wize/planning/tech-vision.md`
- `.wize/planning/nfr-principles.md`
- `.wize/solutioning/architecture.md`
- `.wize/solutioning/adrs/`
- `.wize/solutioning/design-system/`
- `.wize/solutioning/epics/` + `stories/`
- `.wize/implementation/tea/risk-profile.md` (Hawkeye)
- `.wize/config/tea.toml` (policy choice)

## Outputs

- `.wize/solutioning/readiness-{YYYY-MM-DD}.md` — checklist result + signoffs.

## Checklist (Tony chairs)

### Planning artifacts
- [ ] PRD `status: validated`.
- [ ] All open questions in PRD resolved (no `blocker` open).
- [ ] Trigger map covers every PRD goal.

### UX
- [ ] Every In-scope item has at least one screen spec.
- [ ] UX design index maps every screen → scenario → AC.
- [ ] Design system tokens + components needed by the UX exist.

### Strategy
- [ ] Tech vision `status: aligned`.
- [ ] NFR principles `status: aligned`; verifiers named for every non-negotiable.

### Architecture
- [ ] Architecture doc `status: ready-for-stories`.
- [ ] ADRs cover every meaningful trade-off.
- [ ] NFR check section answers *how* for each non-negotiable.

### Stories
- [ ] Every epic has 3–10 stories.
- [ ] Every story has AC IDs from the PRD; the union per epic equals the epic's AC set.
- [ ] No story is XL.
- [ ] Each story names touch-points + `testid` + reuse of design-system components.

### TEA
- [ ] `tea-risk.md` exists.
- [ ] `.wize/config/tea.toml` policy is committed (advisory / enforcing).
- [ ] First-story `tea-design.md` is drafted (proof Hawkeye's contract works).

### Cross-cutting
- [ ] CI runs tests + validators on every PR.
- [ ] Lint/format on commit.
- [ ] Branch protection on `main`.
- [ ] Secrets vault wired; no secret in repo.

## Outcome

- **Ready** → write the readiness file, link from `sprint-planning`.
- **Concerns** → list specifically what's missing, owner per item, deadline. Re-check.

## Output template

```markdown
---
status: ready | concerns
date: YYYY-MM-DD
chair: Tony Stark
signoffs:
  - Maria Hill (PM)
  - Hawkeye (TEA)
  - Mantis (UX) — async
  - Fury (Strategy) — async
---

# Implementation Readiness — {{project_name}}

## Result: Ready

## Notes
- Architecture covers 5 epics and 28 stories.
- TEA policy: advisory; NFR gate per epic.
- 2 ADRs accepted in this gate review (ADR-008, ADR-009).

## Open items (carry forward, not blockers)
- Marketing site for launch — separate track, owned by …
- Stripe-Atlas back-office decision — by date X.
```

## Anti-patterns

- "Looks ready" without running the checklist.
- Signing off before Hawkeye has risk-profiled.
- Closing concerns without re-checking.
- Leaving CI configuration "for later" — never gets done.

## Hand-off

> Implementation readiness signed off. Hill, kick `wize-sprint-planning`. Hawkeye, your gate cadence is set: design per story, trace + review + gate per story, NFR per epic.
