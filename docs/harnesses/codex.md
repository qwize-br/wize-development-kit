# OpenAI Codex — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](codex.pt-BR.md)

← [Back to README](../../README.md)

Codex shares the same Anthropic Skill format as Claude Code and Kimi Code.

## Output

- `.agents/skills/wize-{code}/SKILL.md` — one directory per persona, workflow, or skill.
- A root `AGENTS.md` (shared with Cursor, Windsurf, and Antigravity) listing the roster and pointing at `wize-orchestrator` as the entry point.

## Notable

- `.agents/skills/` is Codex's documented path for repository-local skills — the kit writes there directly, not to a Codex-specific directory.
- **History:** 0.7.2 briefly moved this output to `.codex/skills/`, which broke skill loading in real Codex sessions; 0.7.3 reverted it to `.agents/skills/`. If you're on an older install, run `npx wize-dev-kit@latest update --pr`, merge the PR, then run `npx wize-dev-kit hydrate` to get the right path.

## Setup

Pick **Codex** as an IDE target during `npx wize-dev-kit install` (or add it and re-run `npx wize-dev-kit sync`). Restart Codex, then run `/wize-orchestrator` or ask it to read `AGENTS.md`.

Fresh clone or new worktree: generated files are gitignored, so run `npx wize-dev-kit hydrate` there (no prompts, touches no tracked file). `npx wize-dev-kit hooks print codex` shows the setup script to put in a Codex local environment. See [Worktrees and automatic updates](../WORKTREES.md).
