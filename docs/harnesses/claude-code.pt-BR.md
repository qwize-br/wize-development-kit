# Claude Code — Wize Development Kit

🌐 **Idiomas:** [English](claude-code.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

Claude Code foi o primeiro alvo do kit e usa o formato público de Skill da Anthropic ao pé da letra.

## Saída

`.claude/skills/wize-{code}/SKILL.md` — um diretório por asset (persona, workflow ou skill). Frontmatter YAML (`name`, `description`) mais o corpo em Markdown. Arquivos complementares que um workflow referencia por caminho relativo (`steps/`, `templates/`, `data/`, `customize.toml`, ...) são copiados junto do `SKILL.md` para que esses caminhos resolvam.

Não existe um formato separado de "agente" aqui — personas (Wizer, Shuri, Hawkeye...) e workflows/skills viram todos a mesma estrutura de `SKILL.md`.

## Destaques

- **Descoberta por descrição.** O Claude Code encontra as skills instaladas casando a tarefa em mãos contra cada `description`; também dá pra invocar direto pelo nome (`/wize-dev-story`) ou pedir pra "ativar o Wizer".
- **Fan-out de subagentes é ad hoc, não amarrado a persona.** O `wize-code-review` usa a própria ferramenta Task/Agent do Claude Code pra levantar workers isolados e paralelos (Blind Hunter, Edge Case Hunter, Acceptance Auditor) numa única passada de review. Qualquer skill pode fazer isso — não está amarrado a uma definição de subagente `.claude/agents/*.md`, já que o kit não gera nenhuma.
- O Claude Code **não** lê o `AGENTS.md` na raiz que o instalador gera (esse arquivo é pro Codex, Cursor, Windsurf e Antigravity).

## Como ativar

Escolha **Claude Code** como alvo de IDE em `npx wize-dev-kit install` (padrão). Reinicie o Claude Code e diga *"Ative o Wizer e dê o briefing do projeto a ele"* ou rode `/wize-orchestrator`.
