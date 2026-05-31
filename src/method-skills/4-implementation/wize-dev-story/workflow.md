---
code: wize-dev-story
name: Dev Story
phase: 4-implementation
owner: wize-agent-dev   # Shuri
status: stub
---

# Dev Story

**Goal.** Implement one story under TDD discipline.

## Inputs
- `.wize/solutioning/stories/{epic}/{story-id}.md`
- `.wize/solutioning/architecture.md`
- `.wize/implementation/tea/{epic}/{story-id}/design.md` (Hawkeye must have produced this)

## Outputs
- Code + tests in the target repo
- Commit messages reference AC IDs
- Story file updated to `status: ready-for-review`

## Steps (TDD loop)
1. **Read.** Story ACs and Hawkeye's design.
2. **Red.** Write the failing test first.
3. **Green.** Minimum code to pass.
4. **Refactor.** Clean — only with green tests.
5. **Repeat** until every AC has at least one test.
6. **Self-check.** Security, perf, dead code, naming.
7. **Hand-off.** Ping Hawkeye for trace + review.

## Quick-dev exception
If invoked via `wize-quick-dev`, the design step is replaced by smoke-test-only commitment.
