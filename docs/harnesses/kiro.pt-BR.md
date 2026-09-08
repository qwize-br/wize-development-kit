# Kiro (AWS) — Wize Development Kit

🌐 **Idiomas:** [English](kiro.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

O Kiro, IDE/CLI agêntica da AWS, segue o padrão aberto [Agent Skills](https://agentskills.io) — a mesma forma de pasta + `SKILL.md` (frontmatter YAML: `name`, `description`) que o kit já renderiza para Claude Code, Codex, Kimi Code e Hermes.

## Saída

`.kiro/skills/wize-{code}/SKILL.md` — um diretório por persona, workflow ou skill, com arquivos complementares (`steps/`, `templates/`, `data/`) copiados junto.

## Destaques

- **Escopo workspace.** O agente padrão do Kiro carrega automaticamente skills de workspace de `<repo-root>/.kiro/skills/` e skills globais de `~/.kiro/skills/`; **skills de workspace vencem** em colisões de nome. As entradas `wize-*` geradas ficam no .gitignore (regenere com `npx wize-dev-kit sync`) — skills de time escritas à mão, ao lado delas, devem ser commitadas, conforme a própria orientação do Kiro.
- **Progressive disclosure.** No início da sessão o Kiro carrega apenas `name` + `description` de cada skill; o `SKILL.md` completo é ativado quando o pedido combina com a descrição, ou explicitamente via `/wize-{code}` no chat. As descrições do kit são escritas ricas em palavras-chave exatamente para esse match.
- **Steering é separado.** Contexto de projeto sempre-on vive em `.kiro/steering/*.md` — específico do Kiro e não produzido por este adapter, então combinar com o alvo **Fallback genérico** (raiz `AGENTS.md`) é um bônus.
- **Ressalva de custom agents.** Custom agents do Kiro não carregam skills por padrão — adicione `"skill://.kiro/skills/*/SKILL.md"` ao campo `resources` do agente.

## Como ativar

Escolha **Kiro — AWS** como alvo de IDE em `npx wize-dev-kit install` (ou adicione depois e rode `npx wize-dev-kit sync`). Reinicie o Kiro e rode `/wize-orchestrator`.

## Headless

`kiro-cli chat --no-interactive --trust-all-tools "<prompt>"` roda uma sessão headless de uma execução (requer `KIRO_API_KEY`), usada pelo baseline brownfield do instalador quando o Kiro CLI é o harness detectado.
