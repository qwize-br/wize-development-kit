---
code: wize-tea-design
name: TEA Test Design
gate: design
owner: wize-agent-test-architect   # Hawkeye
when: per-story-start
status: stub
---

# TEA — Test Design

**Goal.** For one story: declare the test split (unit / integration / e2e), required fixtures, mocks, environments.

## Inputs
- `.wize/solutioning/stories/{epic}/{story}.md`
- `.wize/solutioning/architecture.md`

## Output
- `.wize/implementation/tea/{epic}/{story}/design.md`

## YAML frontmatter
```yaml
---
gate: design
story_id: …
ac_ids: [AC-1, AC-2, …]
test_split:
  unit: count + brief description
  integration: count + brief description
  e2e: count + brief description
fixtures: [...]
mocks: [...]
environment: dev|staging|isolated
---
```

## Body
Plain-English rationale + edge-case list.
