# Google Antigravity — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](antigravity.pt-BR.md)

← [Back to README](../../README.md)

Antigravity uses the same public Anthropic Skill format as Claude Code and Codex.

## Output

- `.agent/skills/wize-{code}/SKILL.md` — note the **singular** `.agent`, not `.agents` (that's Codex's directory).
- A root `AGENTS.md` (shared with Codex, Cursor, and Windsurf).

## Notable

- `.antigravitycli/` is Antigravity's own CLI state directory and is never touched by the kit — only `.agent/skills/` and `AGENTS.md` are written.

## Setup

Pick **Antigravity** as an IDE target during `npx wize-dev-kit install` (or add it and re-run `npx wize-dev-kit sync`). Restart Antigravity, then run `/wize-orchestrator` or ask it to read `AGENTS.md`.
