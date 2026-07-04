# Google Antigravity — Wize Development Kit

🌐 **Idiomas:** [English](antigravity.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

O Antigravity usa o mesmo formato público de Skill da Anthropic que o Claude Code e o Codex.

## Saída

- `.agent/skills/wize-{code}/SKILL.md` — repare no **singular** `.agent`, não `.agents` (esse é o diretório do Codex).
- Um `AGENTS.md` na raiz (compartilhado com Codex, Cursor e Windsurf).

## Destaques

- `.antigravitycli/` é o diretório de estado do próprio CLI do Antigravity e nunca é tocado pelo kit — só `.agent/skills/` e `AGENTS.md` são gravados.

## Como ativar

Escolha **Antigravity** como alvo de IDE em `npx wize-dev-kit install` (ou adicione depois e rode `npx wize-dev-kit sync`). Reinicie o Antigravity e rode `/wize-orchestrator` ou peça pra ele ler o `AGENTS.md`.
