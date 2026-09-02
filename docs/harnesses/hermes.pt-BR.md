# Hermes Agent — Wize Development Kit

🌐 **Idiomas:** [English](hermes.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

O Hermes Agent consome o mesmo formato público de Skill da Anthropic usado pelo Claude Code, Codex e Kimi Code, na forma de skills project-local.

## Saída

`.hermes/skills/wize-{code}/SKILL.md` — um diretório por persona, workflow ou skill, com arquivos complementares (`steps/`, `templates/`, `data/`) copiados junto.

## Destaques

- **Skills project-local.** O Hermes descobre `<git-root>/.hermes/skills/` (nativo do Hermes) e `<git-root>/.agents/skills/` (convenção compartilhada) para sessões iniciadas dentro do projeto.
- **Trust gate.** Skills são documentos de procedimento carregados sob demanda, então o Hermes só carrega skills do projeto quando a raiz do repositório é confiável — rode `hermes skills trust` (ou adicione a raiz em `skills.trusted_project_dirs` no `~/.hermes/config.yaml`) uma vez por checkout. Repositórios não confiáveis seguem detectáveis com um aviso de uma linha.
- **Precedência.** Skills project-local confiáveis sobrescrevem skills de mesmo nome do perfil/bundle — skills versionadas no repo vencem dentro do próprio repo.
- O Hermes também lê `AGENTS.md` na raiz (além de `CLAUDE.md`, `.cursorrules`) como contexto de projeto, então combinar com o alvo **Fallback genérico** é um bônus.

## Como ativar

Escolha **Hermes Agent** como alvo de IDE em `npx wize-dev-kit install` (ou adicione depois e rode `npx wize-dev-kit sync`). Rode `hermes skills trust` no repo, reinicie o Hermes e rode `/wize-orchestrator`.

## Headless

`hermes -z "<prompt>"` roda uma sessão headless de uma execução, usada pelo baseline brownfield do instalador quando o Hermes é o CLI de harness detectado.