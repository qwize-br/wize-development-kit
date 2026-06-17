---
story_id: E03-S01
epic: 03-persona-orchestrator
status: ready-for-dev
priority: 1
estimate: S
linked_acs: [AC-E03-1, AC-E03-4]
---

# Story: Persona red-teamer (agent.yaml + persona.md)

## Context
O PRD decidiu "novo agente red-teamer" (decisão no brief). O overlay precisa de uma persona com identidade clara. Reusar o formato dos agents existentes em `src/web-overlay/agents/` para consistência.

## Acceptance criteria
- **AC-E03-1:** Existe `agents/red-teamer/agent.yaml` com frontmatter `name: red-teamer`, `overlay: security`, e `commands` apontando para `wize-sec-pentest`. Existe `persona.md` com identidade, tom e escopo do red-teamer.
- **AC-E03-4 (preparação):** Persona inclui seção "Hand-off to TEA" indicando que findings de segurança podem ser revisados pelo Hawkeye/TEA.

## Out of scope
- A skill orquestradora — S02.
- Outros agents (ex.: appsec-reviewer) — não decidido, fora do escopo da v1.

## Notes for Shuri
- Criar `src/security-overlay/agents/red-teamer/agent.yaml` (mirror de `src/web-overlay/agents/.../agent.yaml` se houver; senão olhar `src/app-overlay/agents/`).
- `persona.md`: ~30 linhas. Identidade ("red-teamer ofensivo responsável"), tom (técnico, direto, sem floreio), escopo (pentest do próprio projeto do usuário, com gate de escopo obrigatório), ferramentas (lista do brief), limites (não atacar alvos fora do scope, não exfiltrar, não persistir além do `.wize/security/`).
- Incluir seção explícita "## Hand-off to TEA" apontando que findings podem ser revisados por Hawkeye/TEA no gate de implementação do overlay.
- Manter tom: pragmático, "pentester real que respeita o escopo".

## Notes for Hawkeye
- 1 teste: agent.yaml tem campos obrigatórios (`name`, `overlay`, `commands`).
- 1 teste: persona.md menciona "scope" e "autorizado" (palavras-chave do brief).
