# TEA NFR Assessment

> nfr: TEA NFR Assessment

# TEA — NFR Assessment

**Goal.** Verify that the **epic** as a whole meets Fury's NFR principles: performance, security, reliability, maintainability, accessibility, cost. Story-level gates miss NFRs that emerge only at integration; this gate catches them.

Hawkeye drives. Tony reviews perf + security findings. Fury escalates if a non-negotiable is at risk. Runs **per epic**, just before any of its stories merges.

## Inputs

- `.wize/planning/nfr-principles.md` (Fury's targets)
- Code from all stories in the epic
- Telemetry / benchmark output (lighthouse, web-vitals, macrobenchmark, Sentry perf)
- Overlay perf playbooks: `web-perf-budgets.md`, `mobile-perf-budgets.md`

## Output

- `.wize/implementation/tea/nfr/{epic}.md`

## Steps

### 1. For each category, run the verifier

| Category | Verifier (typical) |
|---|---|
| Performance | lighthouse-ci against epic-scope routes; web-vitals beacon delta |
| Security | `npm audit --omit=dev`; manual OWASP Top 10 walk; secret scan |
| Reliability | injected-failure tests (`@chaos` tag); retry policy review; idempotency check |
| Maintainability | coverage delta; cyclomatic complexity delta; lint baseline |
| Accessibility | axe on every epic-scope route; keyboard walk on critical flows |
| Cost | cost dashboard delta in the epic window |

### 2. Score each

For each category: `PASS` (meets non-negotiable) / `CONCERNS` (within stretch range; below non-negotiable on a measurable item with mitigation plan) / `FAIL` (non-negotiable missed; no plan) / `WAIVED` (with documented reason + sign-off).

### 3. Findings (one per slip)

If anything failed or concerned, write the finding: what we measured, what was expected, why the slip, what the next step is.

### 4. Hand off

`PASS` → epic can merge. `CONCERNS` (advisory) → flag in PR description. `FAIL` (enforcing) → blocks merge.

## YAML frontmatter (canonical)

```yaml
---
gate: nfr
epic: 01-onboarding
status: CONCERNS
scores:
  performance: PASS
  security: PASS
  reliability: CONCERNS
  maintainability: PASS
  accessibility: PASS
  cost: PASS
findings:
  - id: NFR-01-1
    category: reliability
    severity: medium
    summary: "Outbox retry interval too aggressive for Resend's documented backoff."
    expected: "Exponential 30s/2m/10m; we set 5s/15s/45s."
    actual: "Spike in Resend 429s during integration test."
    recommendation: "Update retry policy in `lib/email/outbox.ts`; capture with `outbox-retry.spec.ts`."
    owner: shuri
    blocking: false
created_at: 2026-06-11T18:00:00Z
---
```

## Body of `nfr/{epic}.md`

```markdown
## Summary
Epic 01 (onboarding) at gate. Performance and a11y pass non-negotiables; reliability has one mid-severity concern around outbox backoff.

## Per category

### Performance — PASS
- LCP (signup): 1.45s p75 (target ≤ 2.5s).
- INP (signup): 90ms p75 (target ≤ 200ms).
- CLS (signup): 0.03 (target ≤ 0.1).
- LCP (onboarding): 1.7s p75.

### Security — PASS
- `npm audit` clean (dev advisories noted in `.audit-ignore.md`).
- OWASP Top 10 walk: no findings.
- RLS verified on `users`, `teams`, `memberships`.

### Reliability — CONCERNS
- See NFR-01-1.

### Maintainability — PASS
- Coverage 84% on logic modules in this epic.
- No file > 300 LOC introduced.

### Accessibility — PASS
- axe clean on `/signup`, `/signup/error`, `/onboarding`, `/onboarding/invite-sent`.
- Keyboard walk: focus order matches visual; modal traps + restores.

### Cost — PASS
- No cost dashboard change beyond expected (account creation; mailer spend within budget).

## Action items
- Shuri: PR-XXX fixes NFR-01-1. Re-run NFR after merge.
- Hawkeye: re-baseline web-vitals after epic ships to prod.
```

## Anti-patterns Hawkeye rejects

- **Self-reported "looks fine" with no verifier output.** Attach the artifact.
- **Concerns left for "later."** Either an action item with owner+deadline or it's not a concern.
- **Waived without sign-off.** WAIVED needs `waived_by: NAME` + reason.
- **NFR run on stage with synthetic data.** Use realistic distributions whenever possible.

## Hand-off

> NFR gate for Epic 01: **CONCERNS**. PR can proceed if the reliability finding (NFR-01-1) is committed to be addressed in the next sprint. Otherwise hold the merge.
