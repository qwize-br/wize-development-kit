---
code: wize-quick-dev
name: Quick Dev (lifecycle shortcut)
phase: 4-implementation
owner: wize-agent-dev   # Shuri
status: stub
---

# Quick Dev

**Goal.** When the task is small and well-scoped (bug fix, copy edit, small refactor), skip the full lifecycle.

## When to use
- Bug fix with clear root cause
- Copy or content edit
- Small refactor with no behavior change
- Dependency bump
- Brownfield maintenance

## When NOT to use
- New feature
- Cross-cutting change touching architecture
- Anything where ACs need to be agreed

## Steps
1. **Frame.** One paragraph: what changes and why.
2. **Implement.** TDD or smoke-test-and-fix, depending on risk.
3. **Hawkeye lite.** Smoke test + lint only (no design/trace/nfr/review).
4. **Gate.** Tiny `gate.md` (PASS or CONCERNS) appended to a rolling `.wize/implementation/quick-dev-log.md`.
5. **Commit.** Conventional commit referencing the change.

## Disabling
Set `quick_dev_enabled = false` in `.wize/config/project.toml` to force full lifecycle for everything.
