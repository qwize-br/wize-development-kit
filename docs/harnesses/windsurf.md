# Windsurf (Codeium) — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](windsurf.pt-BR.md)

← [Back to README](../../README.md)

## Output

`.windsurf/rules/wize-{code}.md` — plain Markdown, no frontmatter: a heading, a one-line summary blockquote, and the full body.

## Notable

- Windsurf's Cascade reads everything under `.windsurf/rules/` at session start. Activation mode (always-on, manual, model-decided, glob) is configured **inside the IDE's Rules panel** per file — the kit doesn't encode it, since Windsurf's rule format has no frontmatter for it.
- Same flattening as Cursor: no agent/workflow distinction in the file format.

## Setup

Pick **Windsurf** as an IDE target during `npx wize-dev-kit install` (or add it and re-run `npx wize-dev-kit sync`). Restart Windsurf, review the new rules under **Cascade → Rules**, then ask it to activate Wizer.

## Reference

- [docs.windsurf.com — Cascade rules](https://docs.windsurf.com/windsurf/cascade/memories#rules)
