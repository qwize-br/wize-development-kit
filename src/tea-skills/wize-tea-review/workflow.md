---
code: wize-tea-review
name: TEA Story Review
gate: review
owner: wize-agent-test-architect   # Hawkeye
when: story-end
status: stub
---

# TEA — Story Review

**Goal.** Structured story review (separate from Shuri's `wize-code-review`).

## Inputs
- Story file (ACs)
- Test results
- Trace doc

## Output
- `.wize/implementation/tea/{epic}/{story}/review.md`

## YAML frontmatter
```yaml
---
gate: review
story_id: …
status: PASS | CONCERNS | FAIL
ac_check:
  - id: AC-1
    met: true|partial|false
    evidence: …
findings: [...]
recommendations: [...]
---
```
