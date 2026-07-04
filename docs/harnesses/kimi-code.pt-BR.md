# Kimi Code — Wize Development Kit

🌐 **Idiomas:** [English](kimi-code.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

O Kimi Code, da Moonshot, consome o mesmo formato público de Skill da Anthropic usado pelo Claude Code e pelo Codex.

## Saída

`.kimi/skills/wize-{code}/SKILL.md` — um diretório por persona, workflow ou skill, com arquivos complementares (`steps/`, `templates/`, `data/`) copiados junto.

## Destaques

- O Kimi Code também autodetecta `.claude/skills/` e `.agents/skills/` (Codex) se existirem no repositório, então instalar o alvo **Kimi Code** junto com **Claude Code** e/ou **Codex** é inofensivo — o Kimi só passa a ter mais lugares onde achar as mesmas skills.

## Como ativar

Escolha **Kimi Code** como alvo de IDE em `npx wize-dev-kit install` (ou adicione depois e rode `npx wize-dev-kit sync`). Reinicie o Kimi Code e rode `/wize-orchestrator`.
