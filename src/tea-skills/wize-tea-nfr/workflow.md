---
code: wize-tea-nfr
name: TEA NFR Assessment
gate: nfr
owner: wize-agent-test-architect   # Hawkeye
when: pre-merge-per-epic
status: stub
---

# TEA — NFR Assessment

**Goal.** Verify the epic meets Fury's NFR principles: performance, security, reliability, maintainability, accessibility, cost.

## Inputs
- `.wize/planning/nfr-principles.md`
- Code from all stories in the epic
- Telemetry/benchmark output

## Output
- `.wize/implementation/tea/nfr/{epic}.md`

## YAML frontmatter
```yaml
---
gate: nfr
epic: …
status: PASS | CONCERNS | FAIL | WAIVED
scores:
  performance: …
  security: …
  reliability: …
  maintainability: …
  accessibility: …
  cost: …
findings: [...]
---
```
