# Kiro (AWS) — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](kiro.pt-BR.md)

← [Back to README](../../README.md)

Kiro, the agentic IDE/CLI from AWS, follows the open [Agent Skills standard](https://agentskills.io) — the same folder + `SKILL.md` (YAML frontmatter: `name`, `description`) shape the kit already renders for Claude Code, Codex, Kimi Code, and Hermes.

## Output

`.kiro/skills/wize-{code}/SKILL.md` — one directory per persona, workflow, or skill, with companion files (`steps/`, `templates/`, `data/`) copied alongside.

## Notable

- **Workspace scope.** Kiro's default agent automatically loads workspace skills from `<repo-root>/.kiro/skills/` and global skills from `~/.kiro/skills/`; **workspace skills win** on name collisions. Generated `wize-*` entries are gitignored (regenerate with `npx wize-dev-kit sync`) — hand-written team skills you add next to them should be committed, per Kiro's own guidance.
- **Progressive disclosure.** At session start Kiro loads only each skill's `name` + `description`; the full `SKILL.md` activates when your request matches the description, or explicitly via `/wize-{code}` in chat. The kit's descriptions are written keyword-rich for exactly this match.
- **Steering is separate.** Always-on project context lives in `.kiro/steering/*.md` — Kiro-specific and not produced by this adapter, so pairing with the **Generic fallback** target (root `AGENTS.md`) is a bonus.
- **Custom agents caveat.** Kiro custom agents don't load skills by default — add `"skill://.kiro/skills/*/SKILL.md"` to the agent's `resources` field.

## Setup

Pick **Kiro — AWS** as an IDE target during `npx wize-dev-kit install` (or add it and re-run `npx wize-dev-kit sync`). Restart Kiro, then run `/wize-orchestrator`.

## Headless

`kiro-cli chat --no-interactive --trust-all-tools "<prompt>"` runs a one-shot headless session (requires `KIRO_API_KEY`), which the installer's brownfield baseline uses when Kiro CLI is the detected harness.
