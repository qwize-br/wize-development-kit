---
description: "2-to-3-boundary: NFR Principles"
---

# NFR Principles

# NFR Principles

**Goal.** Define non-functional non-negotiables Tony must design against and Hawkeye must verify. Hill defers to this when sizing scope. Mantis respects the a11y/perf bars in UX specs. Shuri implements with these targets in hand.

Fury drives. Output lands in `.wize/planning/nfr-principles.md`.

## Inputs

- `.wize/planning/prd.md`
- `.wize/planning/tech-vision.md`
- `.wize/planning/brief.md` (compliance constraints, audience implications)
- Overlay perf playbooks if active:
  - `web-overlay/playbooks/web-perf-budgets.md`
  - `app-overlay/playbooks/mobile-perf-budgets.md`
  - `web-overlay/playbooks/wcag-aa.md`
  - `app-overlay/playbooks/apple-hig.md`, `material-design-3.md`

## Outputs

- `.wize/planning/nfr-principles.md`

## Categories (always cover these six)

For each, write **non-negotiable** + **stretch** + **deferred** (with trigger). Use the playbooks as starting points; **tighten** if PRD demands, never loosen below playbook recommendations.

### 1. Performance

| Tier | Targets |
|---|---|
| Non-negotiable | LCP ≤ 2.5s mobile, INP ≤ 200ms, CLS ≤ 0.1 (web) — cold start ≤ 1.5s mid-range (app) |
| Stretch | LCP ≤ 1.8s, INP ≤ 100ms |
| Deferred | Server-side LCP for edge regions — revisit when audience > 30% non-NA |

### 2. Security

| Tier | Items |
|---|---|
| Non-negotiable | OWASP Top 10 covered; auth via {{vendor}}; tokens never logged; secrets via {{provider}}; RLS on every table with user_id |
| Stretch | SOC2 type-I controls in place by {{date}} |
| Deferred | SOC2 type-II — revisit at $1M ARR |

### 3. Reliability

| Tier | Targets |
|---|---|
| Non-negotiable | 99.9% uptime in primary region; error budget 0.1%/month; retries idempotent with deduplication key |
| Stretch | 99.95% uptime |
| Deferred | Multi-region active/active — revisit per tech-vision deferred |

### 4. Maintainability

| Tier | Items |
|---|---|
| Non-negotiable | Lint + format on commit; > 80% test coverage on logic modules; ADRs for every architectural decision; deps audited monthly |
| Stretch | < 5% files over 300 LOC; cyclomatic complexity < 15 per function |
| Deferred | Auto-doc generation — revisit when API consumers > 3 |

### 5. Accessibility

| Tier | Items |
|---|---|
| Non-negotiable | WCAG 2.2 AA on every shipped page; keyboard-complete; axe in CI |
| Stretch | AAA on critical flows (signup, billing) |
| Deferred | Full screen-reader manual audit every release — revisit at next compliance review |

### 6. Cost

| Tier | Targets |
|---|---|
| Non-negotiable | Total infra ≤ ${{X}}/month under {{load}}; degradation strategy documented for 10× spike |
| Stretch | Cost-per-active-user ≤ ${{Y}} |
| Deferred | Per-feature cost attribution — revisit when finance asks |

## Steps

### 1. Read the playbooks first

If web/app overlays are active, the perf and a11y playbooks already hold real targets calibrated to mid-range device + 3G fast. Use them as starting point.

### 2. Tighten by audience

Mid-range mobile is the playbook baseline. If your PRD audience is *more* constrained (emerging markets, kiosk hardware, healthcare older devices), tighten. Don't loosen.

### 3. Map every non-negotiable to a verifier

Every non-negotiable must answer the question: *Who and how do we verify this on every release?*

- LCP → `web-perf-budgets.md` lighthouse-ci config.
- WCAG → axe in CI + Hawkeye review.
- Uptime → SLO defined in `.wize/solutioning/observability.md` (Tony).
- Error budget → tracked in {{tool}}.

A non-negotiable with no verifier is a wish.

### 4. Tell the story (one paragraph)

Open the doc with a paragraph: *why these numbers, and what trade-offs they imply.* Future readers re-litigate non-negotiables every six months; the story saves that hour.

### 5. Hand off

Mark `status: aligned`. Tony reads before architecture; Hawkeye reads before risk profile.

## Output template

```markdown
---
status: aligned
owner: Nick Fury
created: YYYY-MM-DD
---

# NFR Principles — {{project_name}}

## Why these numbers

{{One paragraph: target audience, country mix, device class, compliance frame. Why we picked these targets specifically.}}

## Performance
| Tier | Targets | Verifier |
|---|---|---|
| Non-negotiable | LCP ≤ 2.5s mobile (CWV), INP ≤ 200ms, CLS ≤ 0.1 | lighthouse-ci + web-vitals beacon |
| Stretch | LCP ≤ 1.8s | same |
| Deferred | Multi-region LCP — trigger: EU DAU > 5k | — |

## Security
…

## Reliability
…

## Maintainability
…

## Accessibility
…

## Cost
…
```

## Anti-patterns Fury rejects

- **Targets without numbers.** "Fast." Wrong. "p95 server response ≤ 200ms."
- **Stretch targets that are actually goals.** If you must hit it, it's non-negotiable.
- **No verifier.** Every non-negotiable answers *who verifies, with what tool, on what cadence*.
- **Loosening below the playbook.** Tightening is fine. Loosening is a smell — escalate.
- **Cost left blank.** Cost is always an NFR.

## Hand-off

> NFRs at `.wize/planning/nfr-principles.md`. Tony, architecture must respect items 1.A and 4.A from day one (perf and ADR discipline). Hawkeye, your gate policy can stay advisory but NFR gate per epic is mandatory. Hill, scope must keep the budget headroom for item 6.A.
