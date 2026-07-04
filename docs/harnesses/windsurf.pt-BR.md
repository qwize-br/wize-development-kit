# Windsurf (Codeium) — Wize Development Kit

🌐 **Idiomas:** [English](windsurf.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

## Saída

`.windsurf/rules/wize-{code}.md` — Markdown puro, sem frontmatter: um título, um resumo de uma linha em bloco de citação, e o corpo completo.

## Destaques

- O Cascade do Windsurf lê tudo dentro de `.windsurf/rules/` no início da sessão. O modo de ativação (sempre ativo, manual, decidido pelo modelo, por glob) é configurado **dentro do painel de Rules da IDE**, por arquivo — o kit não codifica isso, já que o formato de rule do Windsurf não tem frontmatter pra isso.
- Mesmo achatamento do Cursor: sem distinção agente/workflow no formato do arquivo.

## Como ativar

Escolha **Windsurf** como alvo de IDE em `npx wize-dev-kit install` (ou adicione depois e rode `npx wize-dev-kit sync`). Reinicie o Windsurf, confira as novas rules em **Cascade → Rules**, e peça pra ativar o Wizer.

## Referência

- [docs.windsurf.com — Cascade rules](https://docs.windsurf.com/windsurf/cascade/memories#rules)
