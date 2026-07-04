# Kimi Code — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](kimi-code.pt-BR.md)

← [Back to README](../../README.md)

Moonshot's Kimi Code consumes the same public Anthropic Skill format as Claude Code and Codex.

## Output

`.kimi/skills/wize-{code}/SKILL.md` — one directory per persona, workflow, or skill, with companion files (`steps/`, `templates/`, `data/`) copied alongside.

## Notable

- Kimi Code also auto-detects `.claude/skills/` and `.agents/skills/` (Codex) if present in the repo, so installing the **Kimi Code** target alongside **Claude Code** and/or **Codex** is harmless — Kimi just has more places to find the same skills.

## Setup

Pick **Kimi Code** as an IDE target during `npx wize-dev-kit install` (or add it and re-run `npx wize-dev-kit sync`). Restart Kimi Code, then run `/wize-orchestrator`.
