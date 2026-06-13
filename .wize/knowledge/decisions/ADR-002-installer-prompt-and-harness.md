---
status: accepted
date: 2026-06-13
deciders: André Dantas, Claude
---

# ADR-002: Fix installer prompt residual-line bug and offer to open a harness

## Context

During installation in an interactive terminal, the prompt for "How should the agents call you?" skipped user input and immediately accepted the default. The next prompt (gitignore) was then printed on the same line. This happened because the custom `prompt()` helper in `wize-dev-kit install` consumed a residual empty line left in the readline queue by the preceding `prompts`-library questions.

Additionally, after installation the CLI only told the user to "restart your IDE" without offering to launch a detected harness directly, even when `claude`, `codex`, or `opencode` was available on PATH.

## Decision

1. **Fix `prompt()`** in `tools/installer/wize-cli.js` so it discards the `_queue` of stale lines before writing the question and waiting for fresh input.
2. **Offer to open a harness** at the end of interactive installs. When a harness is detected on PATH, ask the user whether to launch it with `/wize-orchestrator`. If declined, show the equivalent manual command. If no harness is detected, keep the existing instruction to open the IDE manually.

## Alternatives considered

- **Keep `prompt()` as-is and add a flush hack around each call.** Rejected — the queue can contain stale input at multiple points; fixing it centrally is more robust.
- **Launch the harness automatically without asking.** Rejected — unexpected terminal behavior and IDE context switches should be opt-in.
- **Use `prompts` for the name question too.** Rejected — we intentionally use a plain text prompt for simple string input; the fix preserves that while clearing residual state.

## Consequences

- The name prompt now correctly waits for user input in interactive mode.
- Users can jump straight into Wizer from the installer when a harness is present.
- CI / non-TTY paths are unaffected because the new offer is gated on `INTERACTIVE`.
