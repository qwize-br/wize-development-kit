# Hermes Agent — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](hermes.pt-BR.md)

← [Back to README](../../README.md)

Hermes Agent consumes the same public Anthropic Skill format as Claude Code, Codex, and Kimi Code, as project-local skills.

## Output

`.hermes/skills/wize-{code}/SKILL.md` — one directory per persona, workflow, or skill, with companion files (`steps/`, `templates/`, `data/`) copied alongside.

## Notable

- **Project-local skills.** Hermes discovers `<git-root>/.hermes/skills/` (Hermes-native) and `<git-root>/.agents/skills/` (cross-tool convention) for sessions started inside that project.
- **Trust gate.** Skills are load-on-demand procedure documents, so Hermes only loads project skills when the repo root is trusted — run `hermes skills trust` (or add the root to `skills.trusted_project_dirs` in `~/.hermes/config.yaml`) once per checkout. Untrusted repos are still discoverable with a one-line notice.
- **Precedence.** Trusted project skills override same-named profile/bundled skills — vendored repo skills win inside their repo.
- Hermes also reads root-level `AGENTS.md` (plus `CLAUDE.md`, `.cursorrules`) as project context, so pairing with the **Generic fallback** target is a bonus.

## Setup

Pick **Hermes Agent** as an IDE target during `npx wize-dev-kit install` (or add it and re-run `npx wize-dev-kit sync`). Run `hermes skills trust` in the repo, restart Hermes, then run `/wize-orchestrator`.

## Headless

`hermes -z "<prompt>"` runs a one-shot headless session, which the installer's brownfield baseline uses when Hermes is the detected harness CLI.