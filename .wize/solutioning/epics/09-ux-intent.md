---
epic_id: 09-ux-intent
status: backlog
owner: Tony Stark + Mantis + Maria Hill
linked_prd: TBD
priority: 1
estimate: L
created: 2026-07-11
source: REVIEW-2026-07-11.md
---

# Epic 09: Melhor aproveitamento de components e intenção do usuário

## Outcome
O usuário chega com uma **intenção** ("quero pesquisar X", "corrige esse bug", "faz o release",
"roda um pentest") e o kit o leva à skill certa sem que ele precise conhecer os 73 assets. Hoje a
camada de intenção é o elo fraco: as descrições que os harnesses usam para rotear estão quebradas,
o `wize-help` roteia só por fase (nunca pelo que o usuário pediu), e famílias de skills que se
sobrepõem (4 de pesquisa) não têm despacho entre si. Este épico conserta o substrato de roteamento
e adiciona os pontos de entrada que faltam.

Aberto pelo review de 2026-07-11 (`REVIEW-2026-07-11.md`). Todas as stories foram
verificadas adversarialmente contra o código.

## Stories

- **E09-S01 — Descrições de skill ponta-a-ponta (bugfix P0).**
  `readYamlField`/`readFrontmatter` em `tools/installer/render-shared.js` não lê block scalars
  (`description: |`), então as 10 skills de persona são renderizadas com a descrição literal `— |`
  em todos os adapters (`.claude/skills/*/SKILL.md`, `.cursor/rules/*.mdc`, `.opencode/agents/*`,
  `AGENTS.md`, `.wize/agents/*`). Em Cursor/Claude Code a descrição É o gatilho de descoberta.
  Ensinar o parser a ler block scalars (`|` e `>`) ou usar o 1º parágrafo do `persona.md` como
  fallback; re-render; adicionar validador que rejeita descrição terminando em `— |`.
  _Owner: Shuri. Evidência: render-shared.js:15,104; .claude/skills/wize-agent-analyst/SKILL.md:3._

- **E09-S02 — Descrição de intenção em todo workflow/skill.**
  46 de 47 workflows não têm `description:` no frontmatter, então o harness sintetiza
  `"${phase}: ${name}"` (ex. `gate: TEA Gate Decision`) — zero informação sobre *quando* invocar.
  Adicionar um `description:` de uma frase orientado a intenção ("Use quando…") a cada
  `workflow.md`/`skill.md`; preferir esse campo sobre o fallback derivado da fase em `collectAssets`;
  adicionar validador exigindo-o. _Owner: Peggy + Tony. Evidência: render-shared.js:123._

- **E09-S03 — Roteamento por intenção no Wizer/wize-help.**
  Adicionar uma tabela intenção→skill no `wize-help` (e na persona do Wizer): variantes de pesquisa,
  variantes de review, gates TEA, overlays. "quero pesquisar concorrência" cai em `wize-market-research`,
  não na primeira das 4. Complementa o heurístico por-fase que já existe (agora corrigido para ler
  `sprint-status.yaml`). _Owner: Wizer/Tony. Evidência: audit wize-help + ux-intents._

- **E09-S04 — Consolidar a família de pesquisa.**
  `wize-research` duplica o território de `wize-market-research` e nunca menciona
  `wize-domain-research`/`wize-technical-research`; nada roteia entre elas. Fazer `wize-research`
  um dispatcher (classifica a pergunta, delega à variante) ou fundir as variantes; ligar as três a
  `wize-agent-analyst/agent.yaml` (`skills:`) e à tabela de S03.
  _Owner: Pepper. Evidência: src/method-skills/1-analysis/wize-research/workflow.md:38._

- **E09-S05 — `--sign-scope` + criação guiada de escopo.**
  `scope-parser.js` manda o usuário "re-assine com `wize-sec-pentest --sign-scope`" mas a flag não
  existe (`run-pipeline.js` só trata `--active`/`--scope`). Implementar `--sign-scope` (recomputa o
  SHA-256 do corpo do `parseScope` — incluindo o newline separador — e reescreve `scope_sha256`), ou
  trocar as mensagens de erro por um one-liner shell exato. Idealmente, um fluxo `wize-sec-scope`
  que cria o `scope.md` a partir de perguntas em vez de edição+hash manuais.
  _Owner: red-teamer + Shuri. Evidência: scope-parser.js:76,87; run-pipeline.js:28-38._

- **E09-S06 — Instalação não-interativa + uninstall honesto.**
  `cmdInstall(args)` ignora `args` — não há `--profiles/--targets/--lang/--yes/--name`; instalações
  não-TTY dependem de pipar respostas em ordem. E `cmdUninstall` só apaga `.wize/` e imprime um
  `(stub)` — os 64+ dirs de skill renderizados em `.claude/skills/`, `.cursor/rules/`, etc. ficam
  para trás. Adicionar flags não-interativas (documentar em HELP/README); implementar limpeza de
  adapters no uninstall (reusar `adapterTargetPath` de `commands/doctor.js`, apagar `wize-*` por
  target listado em `project.toml`). _Owner: Shuri. Evidência: wize-cli.js:428,552-564._

- **E09-S07 — Skills de _ship_ (release/changelog).**
  O perfil core termina em "tested implementation": não há skill para release/changelog/PR. Deploy só
  existe em web-overlay (`wize-web-deploy`) e release-channels em app-overlay. Criar um cluster
  4-implementation: `wize-release` (bump de versão + changelog a partir das stories gated + tag) e/ou
  `wize-changelog`, roteado no `wize-help` entre gate PASS e retrospectiva.
  _Owner: Shuri + Maria Hill. Evidência: grep 4-implementation; wize-help step 20._

- **E09-S08 — Higiene de metadados e CI.**
  (a) Normalizar labels de fase: `wize-edit-prd` usa `phase: 2-plan-workflows` (irmãos usam `2-plan`);
  `wize-tech-vision`/`wize-nfr-principles` dizem `2-to-3-boundary` mas vivem em `3-solutioning`; TEA
  usa `gate:` em vez de `phase:`. (b) Corrigir sugestões do `doctor.js` que imprimem skills como se
  fossem comandos shell (`Run \`wize-refresh-knowledge\``). (c) Remover o alias `/wize` inexistente
  (feito no `wize-help`, verificar demais). (d) Atualizar o comentário de cabeçalho "v0.1 scaffold" em
  `wize-cli.js`. (e) Adicionar `.github/workflows/ci.yml` rodando `npm test` + `npm run validate` em
  push/PR (hoje só roda no publish por tag). (f) Contrato real por ferramenta (RETRO-1).
  _Owner: Tony + Hawkeye. Evidência: completeness-critic + ux-intents findings._

## Dependencies
- **E09-S01 é P0 e habilita S02/S03** — sem descrições reais, roteamento por intenção não tem substrato.
- S03 depende de S01+S02 (as descrições são o insumo do roteador) e de S04 (variantes de pesquisa).
- S05 é independente (security-overlay).
- S07 depende de S02/S03 para ser descoberta.
- S08 é higiene transversal; a CI (item e) deveria vir cedo para proteger o resto do épico.

## Success
- Nenhuma skill renderizada tem descrição `— |`; validador falha se isso ocorrer.
- Todo workflow/skill tem `description:` de intenção; validador exige.
- `wize-help` roteia tanto por fase quanto por intenção declarada.
- `wize-sec-pentest --sign-scope` (ou fluxo guiado) funciona sem hash manual.
- `wize-dev-kit install --profiles … --targets … --yes` roda sem TTY; `uninstall` remove os adapters.
- Existe um caminho de release para o perfil core; `wize-help` o roteia.
- CI roda testes + validate em push/PR.
