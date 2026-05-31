---
code: wize-code-review
name: Code Review
phase: 4-implementation
owner: wize-agent-dev   # Shuri (peer Shuri — done at PR open time)
status: stub
---

# Code Review

**Goal.** Self/peer review focused on code health. Separate from Hawkeye's story review.

## What this checks
- Naming, structure, dead code
- Test coverage and quality (not just presence)
- Security obvious-misses
- Performance obvious-misses
- Architectural drift (call Tony if found)

## What this does NOT check
- AC fulfillment — that's Hawkeye's `trace` + `review` + `gate`.

## Outputs
- Inline comments / suggestions on the diff.
