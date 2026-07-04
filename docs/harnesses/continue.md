# Continue.dev — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](continue.pt-BR.md)

← [Back to README](../../README.md)

## Output

`.continue/prompts/wize-{code}.prompt` — one file per persona, workflow, or skill.

## Notable

- Frontmatter: `name`, `description`, `invokable: true`. The `invokable` flag is what registers the file as a slash command in Continue's palette instead of a passive context document.

## Setup

Pick **Continue** as an IDE target during `npx wize-dev-kit install` (or add it and re-run `npx wize-dev-kit sync`). Reload the Continue extension, then run `/wize-orchestrator` from the prompt palette.

## Reference

- [docs.continue.dev — Prompts](https://docs.continue.dev/customize/deep-dives/prompts)
