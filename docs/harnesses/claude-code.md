# Claude Code — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](claude-code.pt-BR.md)

← [Back to README](../../README.md)

Claude Code was the kit's first target and uses the public Anthropic Skill format verbatim.

## Output

`.claude/skills/wize-{code}/SKILL.md` — one directory per asset (persona, workflow, or skill). YAML frontmatter (`name`, `description`) plus the Markdown body. Companion files a workflow references by relative path (`steps/`, `templates/`, `data/`, `customize.toml`, ...) are copied alongside the `SKILL.md` so those paths resolve.

There is no separate "agent" file shape here — personas (Wizer, Shuri, Hawkeye...) and workflows/skills all render to the same `SKILL.md` structure.

## Notable

- **Discovery is description-based.** Claude Code surfaces installed skills by matching the task at hand against each `description`; you can also invoke one directly by name (`/wize-dev-story`) or ask to "activate Wizer."
- **Subagent fan-out is ad hoc, not persona-bound.** `wize-code-review` uses Claude Code's own Task/Agent tool to spin up isolated, parallel workers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) for a single review pass. Any skill can do this — it isn't wired to a specific `.claude/agents/*.md` subagent definition, since the kit doesn't emit one.
- Claude Code does **not** read the root `AGENTS.md` the installer generates (that file is for Codex, Cursor, Windsurf, and Antigravity).

## Setup

Pick **Claude Code** as an IDE target during `npx wize-dev-kit install` (default). Restart Claude Code, then say *"Activate Wizer and brief him on the project"* or run `/wize-orchestrator`.
