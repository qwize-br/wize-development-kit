---
code: wize-create-story
name: Create Story
phase: 4-implementation
owner: wize-agent-architect   # Tony writes; Shuri may refine
status: stub
---

# Create Story

**Goal.** Author one Pull-Request-sized story unit with crisp acceptance criteria.

## Inputs
- `.wize/solutioning/architecture.md`
- `.wize/solutioning/epics/{epic}.md`
- (optional) UX screen reference

## Outputs
- `.wize/solutioning/stories/{epic}/{story-id}.md`

## Story template
(See `wize-create-epics-and-stories` for the canonical template.)

## Rules
- One story = one PR. If two, split.
- Each AC must be testable. If Hawkeye can't write a test for it, rewrite the AC.
- "Out of scope" is mandatory. Force the cut.
