# Generic fallback — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](generic.pt-BR.md)

← [Back to README](../../README.md)

For any AI IDE that isn't one of the [dedicated targets](../../README.md#supported-harnesses).

## Output

- `.wize/agents/wize-{code}.md` — plain Markdown per persona, workflow, or skill: a heading, a one-line summary blockquote, and the body. No frontmatter, no slash-command wiring.
- A root `AGENTS.md` — the same baseline pointer file also read natively by Codex, Cursor, Windsurf, and Antigravity. It is never overwritten if one already exists in the repo.

## Notable

- This target has no activation mechanism of its own — you point your assistant at `.wize/agents/wize-orchestrator.md` (or `AGENTS.md`) and ask it to read and follow it.

## Setup

Pick **Generic fallback** as an IDE target during `npx wize-dev-kit install` — it's on by default alongside your primary target, precisely so an unsupported second tool in the same repo still has something to read.
