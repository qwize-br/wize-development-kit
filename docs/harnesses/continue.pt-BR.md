# Continue.dev — Wize Development Kit

🌐 **Idiomas:** [English](continue.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

## Saída

`.continue/prompts/wize-{code}.prompt` — um arquivo por persona, workflow ou skill.

## Destaques

- Frontmatter: `name`, `description`, `invokable: true`. É a flag `invokable` que registra o arquivo como slash command na paleta do Continue, em vez de um documento de contexto passivo.

## Como ativar

Escolha **Continue** como alvo de IDE em `npx wize-dev-kit install` (ou adicione depois e rode `npx wize-dev-kit sync`). Recarregue a extensão do Continue e rode `/wize-orchestrator` na paleta de prompts.

## Referência

- [docs.continue.dev — Prompts](https://docs.continue.dev/customize/deep-dives/prompts)
