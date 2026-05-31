---
code: wize-tea-gate
name: TEA Gate Decision
gate: gate
owner: wize-agent-test-architect   # Hawkeye
when: story-final
status: stub
---

# TEA — Gate Decision

**Goal.** Final per-story gate. PASS / CONCERNS / FAIL / WAIVED with documented rationale.

## Inputs
- `design.md`, `trace.md`, `review.md` for the story
- `nfr/{epic}.md` if applicable
- Story file

## Output
- `.wize/implementation/tea/{epic}/{story}/gate.md`

## YAML frontmatter (canonical)
```yaml
---
gate: gate
story_id: …
status: PASS | CONCERNS | FAIL | WAIVED
score: 0-100
policy: advisory | enforcing
inputs:
  - design.md: …
  - trace.md: …
  - review.md: …
  - nfr/{epic}.md: …
findings:
  - id: G-1
    severity: low | medium | high
    summary: …
    recommendation: …
waived_by: null | "wizer"
waived_reason: null | "…"
created_at: ISO-8601
---
```

## Body
Narrative explanation; structured data is the YAML.

## Policy
- **advisory** (default): FAIL is a warning. Merge proceeds.
- **enforcing**: FAIL blocks merge via CI. Configured in `.wize/config/tea.toml`.
