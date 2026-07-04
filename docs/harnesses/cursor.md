# Cursor — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](cursor.pt-BR.md)

← [Back to README](../../README.md)

## Output

`.cursor/rules/wize-{code}.mdc` — one rule per persona, workflow, or skill.

## Notable

- Frontmatter: `description`, `globs` (empty — not file-pattern-triggered), `alwaysApply: false`. Every wize-dev-kit rule attaches **on demand**, matched by Cursor against its `description`, rather than being injected into every prompt.
- No native agent/subagent split in this format — personas and workflows/skills share the same `.mdc` shape (unlike [OpenCode](opencode.md)).

## Setup

Pick **Cursor** as an IDE target during `npx wize-dev-kit install` (or add it and re-run `npx wize-dev-kit sync`). Restart Cursor, then reference `@wize-orchestrator` or ask it to activate Wizer.

## Reference

- [cursor.com/docs/context/rules](https://cursor.com/docs/context/rules)
