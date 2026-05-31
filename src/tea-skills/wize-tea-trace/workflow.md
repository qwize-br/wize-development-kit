---
code: wize-tea-trace
name: TEA Traceability
gate: trace
owner: wize-agent-test-architect   # Hawkeye
when: during-or-after-implementation
status: stub
---

# TEA — Traceability

**Goal.** Map every Acceptance Criterion to one or more concrete tests in the repo.

## Inputs
- Story file (ACs)
- Test files produced by Shuri

## Output
- `.wize/implementation/tea/{epic}/{story}/trace.md`

## YAML frontmatter
```yaml
---
gate: trace
story_id: …
status: PASS | CONCERNS | FAIL
coverage:
  - ac_id: AC-1
    tests:
      - path/to/test.spec.ts::case-name
    status: covered | partial | missing
---
```

## Body
For any `missing` or `partial`, propose what to write.
