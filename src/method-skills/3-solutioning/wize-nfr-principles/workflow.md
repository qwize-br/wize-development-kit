---
code: wize-nfr-principles
name: NFR Principles
phase: 2-to-3-boundary
owner: wize-agent-solution-strategist   # Nick Fury
status: stub
---

# NFR Principles

**Goal.** Define non-functional non-negotiables Tony must design against and Hawkeye must verify.

## Output
- `.wize/planning/nfr-principles.md`

## Categories
- **Performance** — targets (LCP, p95, throughput).
- **Security** — auth model, data classes, threat surface posture.
- **Reliability** — uptime, error budget, retry/idempotency policy.
- **Maintainability** — coding standards, tech-debt allowance.
- **Accessibility** — WCAG / platform guidelines minimums.
- **Cost** — monthly envelope and degradation strategy.

## Template
```markdown
# NFR Principles

| Category | Non-negotiable | Stretch | Deferred |
|---|---|---|---|
| Performance | … | … | … |
| Security | … | … | … |
…
```
