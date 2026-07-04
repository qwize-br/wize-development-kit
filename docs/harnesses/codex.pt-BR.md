# OpenAI Codex — Wize Development Kit

🌐 **Idiomas:** [English](codex.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

O Codex usa o mesmo formato de Skill da Anthropic que o Claude Code e o Kimi Code.

## Saída

- `.agents/skills/wize-{code}/SKILL.md` — um diretório por persona, workflow ou skill.
- Um `AGENTS.md` na raiz (compartilhado com Cursor, Windsurf e Antigravity) listando o elenco e apontando pro `wize-orchestrator` como ponto de entrada.

## Destaques

- `.agents/skills/` é o caminho documentado do Codex pra skills locais do repositório — o kit grava lá diretamente, não num diretório específico do Codex.
- **Histórico:** a 0.7.2 moveu essa saída, por um breve período, para `.codex/skills/`, o que quebrou o carregamento das skills em sessões reais do Codex; a 0.7.3 reverteu para `.agents/skills/`. Se sua instalação é antiga, rode `npx wize-dev-kit update` pra corrigir o caminho.

## Como ativar

Escolha **Codex** como alvo de IDE em `npx wize-dev-kit install` (ou adicione depois e rode `npx wize-dev-kit sync`). Reinicie o Codex e rode `/wize-orchestrator` ou peça pra ele ler o `AGENTS.md`.
