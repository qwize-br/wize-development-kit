---
code: wize-tea-risk
name: TEA Risk Profile
gate: risk
owner: wize-agent-test-architect   # Hawkeye
when: once-after-architecture
status: stub
---

# TEA — Risk Profile

**Goal.** Build the probability × impact matrix that prioritizes the rest of TEA's work.

## Inputs
- `.wize/solutioning/architecture.md`
- `.wize/solutioning/epics/`

## Output
- `.wize/implementation/tea/risk-profile.md`

## YAML frontmatter (canonical)
```yaml
---
gate: risk
status: PASS | CONCERNS | FAIL | WAIVED
score: 0-100
created_at: ISO-8601
findings:
  - id: R-1
    area: …
    probability: low | medium | high
    impact: low | medium | high
    rationale: …
    mitigation: …
---
```

## Body
Narrative summary; the structured data is the YAML.
