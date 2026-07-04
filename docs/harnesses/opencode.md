# OpenCode — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](opencode.pt-BR.md)

← [Back to README](../../README.md)

OpenCode is the harness where the kit's persona/workflow split maps onto a **native** primitive instead of being flattened to one file type. Everywhere else, "agent" and "workflow" both become the same kind of file; on OpenCode they become two different things OpenCode itself understands.

## Output

`npx wize-dev-kit sync` (or `install`) writes two trees:

- `.opencode/agents/wize-{code}.md` — the 10 personas (Wizer, Pepper, Shuri, Hawkeye...).
- `.opencode/commands/wize-{code}.md` — the workflows and skills (`/wize-dev-story`, `/wize-code-review`, ...).

## Notable

- **`mode: primary | subagent`.** Only `wize-orchestrator` (Wizer) is `primary`. Every other persona is `subagent` — addressable directly with `@wize-agent-dev`, or delegated to automatically based on its `description`.
- **`agent:` on commands.** Each workflow/skill's `owner:` frontmatter (e.g. `owner: wize-agent-dev # Shuri`) is resolved against the installed personas, so `/wize-dev-story` runs under Shuri's system prompt instead of whatever agent happened to be active. Commands with no clear owner (the Agent Builder skills) are left unbound.
- **`subtask: true` on fan-out workers.** `wize-review-adversarial` and `wize-review-edge-case-hunter` — the two named subagent workers `wize-code-review` dispatches in parallel — are marked `subtask: true`, so OpenCode isolates them from the caller's context regardless of who invokes them.

This is also the harness the kit's own subagent fan-out pattern (documented in Wizer's persona) is written against: name each worker, scope its context, dispatch on `mode: subagent` / `subtask: true`, tolerate partial failure.

## Setup

Pick **OpenCode** as an IDE target during `npx wize-dev-kit install` (or add it and re-run `npx wize-dev-kit sync`). Restart OpenCode, then say *"Activate Wizer and brief him on the project"* or run `/wize-orchestrator`.

## Reference

- [opencode.ai/docs/agents](https://opencode.ai/docs/agents/)
- [opencode.ai/docs/commands](https://opencode.ai/docs/commands/)
