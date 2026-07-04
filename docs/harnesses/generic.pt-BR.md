# Fallback genérico — Wize Development Kit

🌐 **Idiomas:** [English](generic.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

Para qualquer IDE com IA que não esteja entre os [alvos dedicados](../../README.pt-BR.md#harnesses-suportadas).

## Saída

- `.wize/agents/wize-{code}.md` — Markdown puro por persona, workflow ou skill: um título, um resumo de uma linha em bloco de citação, e o corpo. Sem frontmatter, sem integração de slash command.
- Um `AGENTS.md` na raiz — o mesmo arquivo-ponteiro de baseline lido nativamente por Codex, Cursor, Windsurf e Antigravity. Nunca é sobrescrito se já existir um no repositório.

## Destaques

- Esse alvo não tem mecanismo de ativação próprio — você aponta seu assistente pra `.wize/agents/wize-orchestrator.md` (ou `AGENTS.md`) e pede pra ele ler e seguir.

## Como ativar

Escolha **Fallback genérico** como alvo de IDE em `npx wize-dev-kit install` — ele já vem ligado por padrão junto do seu alvo principal, justamente pra que uma segunda ferramenta sem suporte dedicado no mesmo repositório ainda tenha algo pra ler.
