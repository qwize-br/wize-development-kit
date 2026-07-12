# Wize Development Kit — Decisions Log

> Log vivo de decisões tomadas durante a entrevista de design.
> Inspiração: BMAD Method v6.8.0 (repositório-pai deste workspace).
> Data início: 2026-05-31.

## Estado

- **Fase atual:** Entrevista — Discovery
- **Pasta destino:** `wize-dev-kit/`
- **Repositório de inspiração:** BMAD Method (raiz deste repo)

## Escopo confirmado pelo usuário

- Pacote instalável em qualquer repositório (greenfield ou brownfield).
- **Não importar** todos os stacks do BMAD; selecionar:
  - **Core** (core-skills do BMAD).
  - **Method**: Full-lifecycle AI agile development (analysis, planning, architecture, implementation).
  - **Test Architect (Q/A)** — embutido em todos os produtos.
  - **Agent Builder** — incluso.
  - **UX — Whiteport Design Studio v0.4.3** — embutido em todos os produtos.
- **Três produtos derivados:**
  1. **Wize Development Core** = Core + AI Agile Dev.
  2. **Wize Web Dev**.
  3. **Wize App Development**.
- Todos os três embutem Test Architect + UX (Whiteport).
- Documentação de inspiração: https://docs.bmad-method.org//llms-full.txt

## Decisões

### Fase 1 — Posicionamento, naming, distribuição

- **D1.1 — Distribuição:** 1 pacote npm único (`wize-dev-kit`) com 3 perfis selecionáveis no install (Core / Web / App). Inspirado no installer único do BMAD. _Single source of truth, menor custo de manutenção._
- **D1.2 — CLI:** comando principal `wize-dev-kit`. Subcomandos: `wize-dev-kit install`, `wize-dev-kit agent`, `wize-dev-kit workflow`, etc. _(Nome custom do usuário, não abreviar para `wize` nem `wdk`.)_
- **D1.3 — Namespace de arquivos/skills/agents:** prefixo `wize-` (ex.: `wize-agent-architect`, `wize-create-prd`). Espelha a convenção `bmad-*` do original.
- **D1.4 — Público-alvo:** **Open-source desde o dia 1**. Licença MIT, docs públicas, contribuições externas bem-vindas. Decisões de design devem favorecer generalidade e clareza.

### Fase 2 — Installer (greenfield + brownfield)

- **D2.1 — Brownfield:** installer **auto-detecta** sinais (`package.json`, `src/`, histórico git) e **oferece rodar `wize-document-project`** antes de qualquer planning para gerar baseline de arquitetura/docs do estado atual.
- **D2.2 — Pasta de artefatos:** `.wize/` na raiz do repo-alvo (oculta, isolada). Subpastas padrão: `.wize/planning/`, `.wize/implementation/`, `.wize/knowledge/`, `.wize/config/`.
- **D2.3 — IDE targets (multi-runtime):** suporte verboso no installer, **selecionável** durante o setup (estilo BMAD). Targets:
  - **Claude Code** — `.claude/skills/wize-*` (skills nativas).
  - **Cursor** — `.cursor/rules/` (regras MDC).
  - **Windsurf**, **Codex**, **Continue** — adaptadores específicos.
  - **Kimi Code**, **OpenCode**, **Antigravity (CLI e IDE)** — adaptadores específicos (não cobrir via fallback genérico).
  - **Fallback genérico:** `.wize/agents/` em markdown para qualquer outro agente.
  - **Web bundles:** _decisão adiada_ — não selecionado nesta rodada; reavaliar na Fase 8 se útil para distribuição open-source.
- **D2.4 — Lifecycle do installer:** **idempotente, com install / update / uninstall completos**. Re-rodar `install` aplica diff preservando customizações em `config.user.toml`. `uninstall` remove tudo do kit sem tocar código do projeto. Espelha BMAD.

### Fase 3 — Roster de agentes (tema Marvel)

- **D3.1 — Personas:** tema **Marvel**, não herdar nomes BMAD. Roster final em `ROSTER.md`.
- **D3.2 — 9 papéis no kit dev:**
  1. **Wizer** — `wize-orchestrator` (Knowledge Base / Briefing / Distribuição, tools globais).
  2. **Pepper Potts** — `wize-agent-analyst` (Business Analyst — brief, research, PRFAQ).
  3. **Peggy Carter** — `wize-agent-tech-writer` (Technical Writer transversal).
  4. **Maria Hill** — `wize-agent-pm` (PM — PRD, epics, sprints).
  5. **Mantis** — `wize-agent-ux-designer` (UX/Whiteport v0.4.3 — empathy, JTBD).
  6. **Nick Fury** — `wize-agent-solution-strategist` (Solution Strategy / Tech Vision — boundary Fase 2→3).
  7. **Tony Stark** — `wize-agent-architect` (System Architect — Fase 3).
  8. **Hawkeye** — `wize-agent-test-architect` (TEA — gates em 2, 3, 4).
  9. **Shuri** — `wize-agent-dev` (Senior Developer — Fase 4).
- **D3.3 — Agent Builder:** entregue como **skill** (`wize-create-agent`), não como agente. Wizer chama a skill quando precisa registrar nova persona/módulo custom em `_wize/custom/`.
- **D3.4 — Team default:** `software-development`. Times variantes (`web-dev`, `app-dev`) — decisão movida para Fase 4 (fluxos).
- **D3.5 — Escopo Marvel fora do kit:** Fury e Pepper já alocados aqui. Outras personas (Black Panther, Wanda, Falcon, Vision, Riri, Kamala) ficam reservadas para kits futuros (Wize Ops, Wize Data, Wize Security).

### Fase 4 — Fluxos por produto (Core / Web / App)

- **D4.1 — Arquitetura de perfis:** Core é a **base completa** (todas as fases + TEA + UX). Web e App são **overlays** que adicionam skills/workflows extras (scaffolds, deploy, stack-specific). Selecionar perfil no install = Core + overlay(s).
- **D4.2 — Stack-agnóstico:** kit **não impõe stack**. Conhecimento de opções (Web: Laravel/Vue, Next/React, Supabase, etc.; App: native, Expo, etc.) vive como **catálogo de referência** dentro dos agentes (Tony e Fury). Stack é decidido em **entrevista pós-install** conduzida por Wizer → Tony.
- **D4.3 — Quick-dev:** workflow `wize-quick-dev` disponível em **todos os 3 perfis**. Pula brief/PRD/architecture para tasks pequenas. Mantém TEA leve (smoke + lint). Espelha o quick-dev do BMAD.
- **D4.4 — Test Architect cross-stack:** **um único agente** Hawkeye, **genérico**, sem stack-awareness. Ferramentas concretas de teste vêm de Tony (na arquitetura) e Shuri (na implementação). Hawkeye decide gates, define critérios, avalia risco — independente de stack.
- **D4.5 — Ordem das fases:** seguir ordem **BMAD canônica** — Whiteport (Mantis) entra **depois** do PRD (Maria Hill). Sequência: Pepper (brief/research) → Maria Hill (PRD) → Mantis (UX strategy + flows) → Fury (solution strategy) → Tony (architecture/ADR) → Hawkeye (TEA gates) → Shuri (implementation).
- **D4.6 — Onboarding pós-install:** **Wizer abre** a sessão pós-install, faz triagem (greenfield/brownfield, perfil, objetivo) e **delega** para especialistas: Pepper (brief), Mantis (UX baseline), Tony (architecture preferences/stack). Cada agente pergunta o que precisa. Modelo distribuído.
- **D4.7 — Multi-perfil:** Web e App podem coexistir no **mesmo repo** (monorepo). Installer aceita ativar múltiplos overlays. Wizer roteia conforme path/pacote.
- **D4.8 — Catálogo de artefatos:** **fixo no Core**, **extensível nos overlays**.
  - Core: `brief.md`, `research.md`, `prd.md`, `ux-strategy.md`, `ux-flows.md`, `architecture.md`, `epics/`, `stories/`, `sprint-status.md`, `retrospective.md`, `tea/risk.md`, `tea/test-design.md`, `tea/trace.md`, `tea/nfr.md`, `tea/gate.md`.
  - Web overlay (exemplos): `design-tokens.json`, `seo-strategy.md`, `analytics-plan.md`.
  - App overlay (exemplos): `mobile-store-listing.md`, `app-perms-and-privacy.md`, `release-channels.md`.

### Fase 5 — Test Architect (Hawkeye)

- **D5.1 — Gates oferecidos:** **pacote completo de 6 gates** (espelha BMAD QA):
  1. `risk` — Risk Profile (matriz prob × impact), 1× pós-architecture.
  2. `design` — Test Design por story (unit/integration/e2e splits, mocks, fixtures).
  3. `trace` — Traceability AC ↔ Test.
  4. `nfr` — NFR Assessment (perf, sec, reliability, maintainability, a11y), por epic.
  5. `review` — Story Review estruturado (independente do code-review do Shuri).
  6. `gate` — Gate Decision final (`PASS` / `CONCERNS` / `FAIL` / `WAIVED`) com justificativa.
- **D5.2 — Granularidade:** **por story** (default). Risk roda 1× pós-architecture; NFR roda por epic; design/trace/review/gate rodam por story. Configurável via `.wize/config/tea.toml` para times maduros reduzirem.
- **D5.3 — Formato:** **Markdown + YAML frontmatter** estruturado (status, score, findings, AC IDs). Humano-legível + parseável por CI. Espelha BMAD QA.
- **D5.4 — Política de bloqueio:** **advisory por padrão, enforcing opt-in**. Gate `FAIL` gera warning visível mas não bloqueia merge default. Opt-in via `.wize/config/tea.toml` para CI bloquear. Permite adoção gradual.
- **D5.5 — Localização:** `.wize/implementation/tea/{epic}/{story}/{gate}.md` (gates por story); `.wize/implementation/tea/risk-profile.md` (global pós-architecture); `.wize/implementation/tea/nfr/{epic}.md` (por epic).

### Fase 6 — Whiteport Design Studio (WDS) — Mantis

> **Referência canônica:** [bmad-code-org/bmad-method-wds-expansion](https://github.com/bmad-code-org/bmad-method-wds-expansion) (Pantheon Norse: Saga + Freya).

- **D6.1 — Mapeamento WDS → Marvel:**
  - **Pepper Potts** absorve **Saga** (Analyst): Product Brief + Trigger Mapping.
  - **Mantis** absorve **Freya** (Designer): UX Scenarios + UX Design + Design System.
  - Sem novos agentes; roster permanece com 9 personas.
- **D6.2 — Fases adotadas (subset essencial 5 de 8):**
  1. Product Brief — **Pepper**.
  2. Trigger Map (user psychology + business goals) — **Pepper**.
  3. UX Scenarios (8-question dialog) — **Mantis**.
  4. UX Design (page specs, interactions) — **Mantis**.
  5. Design System (component library, design tokens) — **Mantis**.
  - **Não adotadas:** Asset Generation (fora do escopo dev kit), Agentic Development (já é responsabilidade de Shuri), Product Evolution (já é responsabilidade de Wizer + retrospective).
- **D6.3 — Estrutura de pastas:** `.wize/planning/ux/` com nomes Wize.
  - `brief.md` (Pepper)
  - `trigger-map.md` (Pepper)
  - `ux-scenarios.md` (Mantis)
  - `ux-design/` (Mantis: page specs)
  - `design-system/` (Mantis: tokens + components)
- **D6.4 — Handoff:** Pepper escreve brief + trigger-map em `.wize/planning/ux/`. Maria Hill lê os 2 + escreve PRD em `.wize/planning/prd.md`. Mantis lê PRD + brief + trigger-map e escreve ux-scenarios → ux-design → design-system. Tony lê PRD + UX docs e escreve architecture.
- **D6.5 — Design tools MCPs:** **fora do escopo** do kit. Mantis trabalha com markdown, ASCII wireframes e specs textuais. Usuário pode integrar Figma/Penpot/Stitch externamente se quiser.
- **D6.6 — Overlays por perfil:**
  - **Web overlay:** Mantis recebe playbook extra com WCAG, breakpoints responsivos, semantic HTML, design tokens com unidades web (rem/em).
  - **App overlay:** Mantis recebe playbook extra com platform guidelines (Apple HIG / Material Design 3), touch targets, gestures, system permissions UX.

### Fase 7 — Agent Builder (skills meta)

- **D7.1 — Escopo: pacote completo de 3 skills meta:**
  - `wize-create-agent` — cria nova persona/agente.
  - `wize-create-skill` — cria skill simples.
  - `wize-create-workflow` — cria workflow composto (multi-step).
- **D7.2 — Customização de built-ins:** **permitida via override em `.wize/custom/`**. Built-ins ficam intocados em `node_modules/wize-dev-kit/`; overrides em `.wize/custom/agents/{code}/customize.toml` aplicam mudanças (persona, lema, tools). Preserva updates do upstream sem fork. Espelha mecanismo `config.user.toml` do BMAD.
- **D7.3 — Validação completa:** **schema + lint + dry-run**.
  - Schema check no `agent.yaml` (JSON Schema).
  - Markdown lint na persona.
  - Dry-run: invoca o agente com input fake e checa output.
  - Falha em qualquer etapa = registro abortado, mensagem clara de erro.
- **D7.4 — Multi-IDE auto-sync:** ao criar/editar agente/skill/workflow, Builder regera adapters para **todos os IDEs ativos** do repo-alvo (Claude Code, Cursor, Windsurf, Codex, Continue, Kimi Code, OpenCode, Antigravity). Consistência sem passo manual.
- **D7.5 — Localização das custom:** `.wize/custom/agents/{code}/`, `.wize/custom/skills/{code}/`, `.wize/custom/workflows/{code}/`. Estrutura espelha a do kit core.
- **D7.6 — Ponto de entrada:** `wize-dev-kit agent create` no CLI + skill nativo `wize-create-agent` chamável pelo Wizer dentro do IDE.

### Fase 8 — Importação de fluxos Steps do BMAD

- **D8.1 — Seleção:** dos fluxos de Steps do BMAD ainda não importados, selecionamos quatro para adaptação imediata:
  - `bmad-spec` → `wize-spec` (core skill).
  - `bmad-create-architecture` → `wize-create-architecture` reescrito em 8 steps (micro-file architecture).
  - `bmad-code-review` → `wize-code-review` reescrito em 4 steps com triagem adversarial.
  - Research do BMAD (`bmad-market-research`, `bmad-domain-research`, `bmad-technical-research`) → três skills verticais Wize em `src/method-skills/1-analysis/`.
- **D8.2 — Micro-file architecture:** workflows substituídos por step files auto-contidos em `steps/` ou `{vertical}-steps/`. Cada step controla frontmatter `stepsCompleted` e só avança com confirmação do usuário.
- **D8.3 — Manter dispatcher genérico:** `wize-research` continua existindo como skill genérico, mas as três vertentes oferecem passos estruturados e templates próprios.
- **D8.4 — Versionamento dos workflows antigos:** cópias dos `workflow.md` monolíticos de `wize-create-architecture` e `wize-code-review` são arquivadas em `.wize/knowledge/decisions/` para referência, não mantidas em produção.
- **D8.5 — Registro em catálogos:** skills adicionados a `src/core-skills/module.yaml` e `src/method-skills/module.yaml`; fluxos refletidos no `README.md`.

### Fase 9 — Security Overlay + OpenCode nativo (2026-07-11)

- **D9.1 — Security Overlay neste kit:** o perfil `security-overlay` (AI Pentester) passa a ser distribuído **dentro do `wize-dev-kit`** como 4º perfil opt-in do installer, com a persona **red-teamer** (`wize-sec-red-teamer`) em `src/security-overlay/`. _Supersede parcialmente D1.1 (3 perfis → 4 perfis), D3.2 (9 papéis → 9 core + 1 overlay) e D3.5 (security deixava de ser reservado para kit futuro)._ As entradas históricas permanecem inalteradas como registro.
- **D9.2 — OpenCode com wiring nativo (0.8.0):** o adapter OpenCode passa a gerar **agents e commands nativos** (`.opencode/agents/` + `.opencode/commands/`), com commands vinculados à persona dona e workers de fan-out isolados — em vez do fallback genérico.

## Perguntas em aberto

_(serão preenchidas conforme a entrevista avança)_

