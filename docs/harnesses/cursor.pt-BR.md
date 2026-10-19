# Cursor — Wize Development Kit

🌐 **Idiomas:** [English](cursor.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

## Saída

`.cursor/rules/wize-{code}.mdc` — uma rule por persona, workflow ou skill.

## Destaques

- Frontmatter: `description`, `globs` (vazio — não é disparado por padrão de arquivo), `alwaysApply: false`. Toda rule do wize-dev-kit se anexa **sob demanda**, casada pelo Cursor contra sua `description`, em vez de ser injetada em todo prompt.
- Sem divisão nativa agente/subagente nesse formato — personas e workflows/skills compartilham o mesmo formato `.mdc` (diferente do [OpenCode](opencode.pt-BR.md)).

## Como ativar

Escolha **Cursor** como alvo de IDE em `npx wize-dev-kit install` (ou adicione depois e rode `npx wize-dev-kit sync`). Reinicie o Cursor e referencie `@wize-orchestrator` ou peça pra ativar o Wizer.

Clone ou worktree novo: os arquivos gerados estão no `.gitignore`, então rode `npx wize-dev-kit hydrate` ali (sem perguntas, não toca arquivo rastreado). `npx wize-dev-kit hooks install --cursor` hidrata cada worktree novo do Cursor automaticamente. Veja [Worktrees e atualizações automáticas](../WORKTREES.pt-BR.md).

## Referência

- [cursor.com/docs/context/rules](https://cursor.com/docs/context/rules)
