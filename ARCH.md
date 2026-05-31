# Wize Development Kit — Arquitetura Proposta v1

> Consolidação das Fases 1-7 da entrevista. Pré-build.
> Referências de inspiração: BMAD Method v6.8.0 + WDS Expansion (Norse).
> Tema do roster: **Marvel**.

---

## 1. Identidade

- **Nome do pacote npm:** `wize-dev-kit`
- **CLI:** `wize-dev-kit` (subcomandos: `install`, `update`, `uninstall`, `agent`, `workflow`, `sync`)
- **Namespace de arquivos/agentes/skills:** `wize-*`
- **Licença:** MIT — open-source desde o dia 1.
- **Tema visual do roster:** Marvel.
- **Tema visual do WDS embarcado:** Norse (mantido por dentro como tributo à referência).

---

## 2. Modelo de distribuição

**1 pacote, 3 perfis selecionáveis, overlays combináveis.**

```
wize-dev-kit (pacote npm)
│
├── Wize Dev Core      ← base completa (sempre instalada)
├── Wize Web Dev       ← overlay opt-in
└── Wize App Development ← overlay opt-in
                     (Web + App podem coexistir no mesmo repo)
```

- Selecionar perfil no installer aplica Core + overlay correspondente.
- Multi-perfil suportado (monorepo).
- TEA (Hawkeye) e WDS (Pepper+Mantis) **sempre embutidos** no Core — não são opcionais.

---

## 3. Roster final (9 personas Marvel)

| Persona | Code | Papel | Fase principal |
|---|---|---|---|
| Wizer | `wize-orchestrator` | Orchestrator / KB / Briefing | Todas |
| Pepper Potts | `wize-agent-analyst` | Business Analyst + WDS-Saga | 1 (Analysis) |
| Peggy Carter | `wize-agent-tech-writer` | Technical Writer | Transversal |
| Maria Hill | `wize-agent-pm` | Product Manager | 2 (Planning) |
| Mantis | `wize-agent-ux-designer` | UX (Whiteport / WDS-Freya) | 2-3 |
| Nick Fury | `wize-agent-solution-strategist` | Solution Strategy / Tech Vision | 2→3 boundary |
| Tony Stark | `wize-agent-architect` | System Architect | 3 (Solutioning) |
| Hawkeye | `wize-agent-test-architect` | Test Architect (TEA) | Gates 2/3/4 |
| Shuri | `wize-agent-dev` | Senior Developer | 4 (Implementation) |

---

## 4. Fluxo canônico (full-cycle)

```
┌─ FASE 1: Analysis ───────────────────────────────┐
│  Pepper Potts (Analyst + WDS Saga)              │
│    → brief.md                                   │
│    → research.md                                │
│    → trigger-map.md  (WDS)                      │
│  Peggy Carter (transversal): edita docs.        │
└──────────────────────────────────────────────────┘
         │
         ▼
┌─ FASE 2: Planning ──────────────────────────────┐
│  Maria Hill (PM)                                │
│    → prd.md                                     │
│  Mantis (UX/WDS Freya, depois do PRD)           │
│    → ux-scenarios.md   (WDS 8-question dialog) │
│    → ux-design/        (page specs)             │
│  Hawkeye: pre-risk advisory (leve, opcional).   │
└──────────────────────────────────────────────────┘
         │
         ▼
┌─ FASE 2→3 Boundary: Strategy ───────────────────┐
│  Nick Fury (Solution Strategy)                  │
│    → tech-vision.md                             │
│    → nfr-principles.md                          │
└──────────────────────────────────────────────────┘
         │
         ▼
┌─ FASE 3: Solutioning ───────────────────────────┐
│  Tony Stark (System Architect)                  │
│    → architecture.md                            │
│    → adrs/                                      │
│    → epics/                                     │
│    → stories/                                   │
│  Mantis (continua): design-system/ + tokens     │
│  Hawkeye:                                       │
│    → risk-profile.md  (gate global)             │
└──────────────────────────────────────────────────┘
         │
         ▼
┌─ FASE 4: Implementation ────────────────────────┐
│  Por story:                                     │
│    Hawkeye → design.md (test design)            │
│    Shuri   → implementa (TDD)                   │
│    Hawkeye → trace.md (AC↔Test)                 │
│    Hawkeye → review.md                          │
│    Hawkeye → gate.md (PASS/CONCERNS/FAIL/WAIVE) │
│  Por epic:                                      │
│    Hawkeye → nfr/{epic}.md                      │
│  Por sprint:                                    │
│    Maria Hill → sprint-status.md                │
│    Wizer/Maria → retrospective.md               │
└──────────────────────────────────────────────────┘
```

### Atalho quick-dev

`wize-quick-dev` (disponível em todos os perfis): pula brief/PRD/architecture. Shuri executa direto sob supervisão leve de Hawkeye (smoke test + lint). Para bugs, ajustes pequenos, manutenção.

---

## 5. Layout do repo-alvo (após install)

```
.wize/
├── config/
│   ├── project.toml         # Perfil(s), stack, conventions, idioma
│   ├── user.toml            # Customizações (preservado em updates)
│   └── tea.toml             # Granularidade gates, política de bloqueio
│
├── planning/
│   ├── brief.md
│   ├── research.md
│   ├── ux/
│   │   ├── trigger-map.md      (Pepper / WDS Saga)
│   │   ├── ux-scenarios.md     (Mantis / WDS Freya)
│   │   ├── ux-design/          (Mantis)
│   │   └── design-system/      (Mantis)
│   ├── prd.md                  (Maria Hill)
│   ├── tech-vision.md          (Fury)
│   └── nfr-principles.md       (Fury)
│
├── solutioning/
│   ├── architecture.md         (Tony)
│   ├── adrs/                   (Tony)
│   ├── epics/                  (Tony)
│   └── stories/                (Tony)
│
├── implementation/
│   ├── sprint-status.md
│   ├── retrospective.md
│   └── tea/                    (Hawkeye)
│       ├── risk-profile.md
│       ├── nfr/{epic}.md
│       └── {epic}/{story}/{design,trace,review,gate}.md
│
├── knowledge/                  (long-lived: docs, research, references)
│
└── custom/                     (Agent Builder output)
    ├── agents/{code}/
    ├── skills/{code}/
    └── workflows/{code}/
```

E nos IDE-targets (selecionáveis no install):

```
.claude/skills/wize-*           (Claude Code)
.cursor/rules/wize-*.mdc        (Cursor)
.windsurf/...                   (Windsurf)
.codex/...                      (Codex)
.continue/...                   (Continue)
.kimi/...                       (Kimi Code)
.opencode/...                   (OpenCode)
.antigravity/...                (Antigravity CLI/IDE)
.wize/agents/                   (fallback genérico)
```

---

## 6. Test Architect (Hawkeye) — gates

| Gate | Quando roda | Output | Quem aprova |
|---|---|---|---|
| `risk` | 1× pós-architecture | `tea/risk-profile.md` (matriz prob × impact) | Hawkeye + humano |
| `design` | Início da story | `tea/{epic}/{story}/design.md` | Hawkeye |
| `trace` | Durante/após implementação | `tea/{epic}/{story}/trace.md` | Hawkeye |
| `nfr` | Pré-merge do epic | `tea/nfr/{epic}.md` | Hawkeye + humano |
| `review` | Fim da story | `tea/{epic}/{story}/review.md` | Hawkeye |
| `gate` | Final da story | `tea/{epic}/{story}/gate.md` (PASS/CONCERNS/FAIL/WAIVED) | Hawkeye + humano |

- Formato: Markdown + YAML frontmatter (status, score, findings, AC IDs).
- Política default: **advisory**; enforcing opt-in via `tea.toml`.

---

## 7. Installer

```
wize-dev-kit install
  ├─ Detecta: greenfield vs brownfield
  ├─ Pergunta: perfil(s) — Core / +Web / +App
  ├─ Pergunta: IDE targets — multi-select
  ├─ Pergunta: idioma e output_folder
  ├─ Cria .wize/ + adapters IDE
  ├─ Se brownfield: oferece `wize-document-project`
  └─ Se ok: dispara onboarding (Wizer → Pepper/Mantis/Tony)

wize-dev-kit update   # diff + preserva customizações
wize-dev-kit uninstall # remove kit, preserva código
wize-dev-kit agent create | edit | list
wize-dev-kit workflow create
wize-dev-kit sync     # regera adapters IDE
```

---

## 8. Overlays Web e App

### Wize Web Dev (overlay)

- Workflows extras: `wize-web-scaffold` (Next/Vue/etc), `wize-web-deploy`, `wize-web-seo-audit`.
- Artefatos extras: `seo-strategy.md`, `analytics-plan.md`, `design-tokens.json` (responsivo).
- Hawkeye playbook: Playwright/Vitest patterns.
- Mantis playbook: WCAG, breakpoints, semantic HTML.

### Wize App Development (overlay)

- Workflows extras: `wize-app-scaffold` (RN/Expo/Flutter/native), `wize-app-release-channels`, `wize-app-store-listing`.
- Artefatos extras: `mobile-store-listing.md`, `app-perms-and-privacy.md`, `release-channels.md`.
- Hawkeye playbook: Detox/Maestro patterns.
- Mantis playbook: HIG/Material 3, touch targets, gestures, permissions UX.

---

## 9. Agent Builder

- 3 skills meta: `wize-create-agent`, `wize-create-skill`, `wize-create-workflow`.
- Customização de built-ins via `.wize/custom/{tipo}/{code}/customize.toml` (override sem fork).
- Validação obrigatória: schema → lint → dry-run.
- Auto-sync: regera adapters de todos os IDEs ativos a cada criação/edição.

---

## 10. Onboarding pós-install (Wizer)

1. Wizer triages: greenfield vs brownfield, perfil, objetivo do projeto.
2. Se brownfield: oferece rodar `wize-document-project` (Tony + Peggy geram baseline).
3. Wizer chama Pepper para começar brief (ou direto Maria Hill se brief existe).
4. Wizer roteia entre personas conforme a conversa avança.

---

## 11. Estrutura do repo `wize-dev-kit/` (source code do kit)

```
wize-dev-kit/
├── package.json                # main: tools/installer/wize-cli.js, bin: { wize-dev-kit }
├── README.md
├── LICENSE                     # MIT
├── CHANGELOG.md
├── DECISIONS.md                # ← este log (preservado no repo)
├── ARCH.md                     # ← este doc
├── ROSTER.md                   # ← quadro Marvel
│
├── src/
│   ├── core-skills/            # Core (advanced-elicitation, brainstorming, party-mode, etc)
│   │   └── wize-*/
│   ├── method-skills/          # AI Agile dev: 1-analysis, 2-plan, 3-solutioning, 4-implementation
│   │   ├── 1-analysis/
│   │   │   ├── wize-agent-analyst/        (Pepper)
│   │   │   ├── wize-agent-tech-writer/    (Peggy)
│   │   │   ├── wize-document-project/
│   │   │   ├── wize-product-brief/
│   │   │   ├── wize-trigger-map/          (WDS)
│   │   │   ├── wize-prfaq/
│   │   │   └── research/
│   │   ├── 2-plan-workflows/
│   │   │   ├── wize-agent-pm/             (Maria Hill)
│   │   │   ├── wize-agent-ux-designer/    (Mantis)
│   │   │   ├── wize-create-prd/
│   │   │   ├── wize-ux-scenarios/         (WDS)
│   │   │   ├── wize-ux-design/            (WDS)
│   │   │   └── wize-validate-prd/
│   │   ├── 3-solutioning/
│   │   │   ├── wize-agent-solution-strategist/ (Fury)
│   │   │   ├── wize-agent-architect/      (Tony)
│   │   │   ├── wize-create-architecture/
│   │   │   ├── wize-create-epics-and-stories/
│   │   │   ├── wize-design-system/        (WDS)
│   │   │   └── wize-check-implementation-readiness/
│   │   └── 4-implementation/
│   │       ├── wize-agent-dev/            (Shuri)
│   │       ├── wize-create-story/
│   │       ├── wize-dev-story/
│   │       ├── wize-quick-dev/
│   │       ├── wize-sprint-planning/
│   │       ├── wize-sprint-status/
│   │       ├── wize-retrospective/
│   │       └── wize-code-review/
│   ├── tea-skills/             # Test Architect (Hawkeye)
│   │   ├── wize-agent-test-architect/
│   │   ├── wize-tea-risk/
│   │   ├── wize-tea-design/
│   │   ├── wize-tea-trace/
│   │   ├── wize-tea-nfr/
│   │   ├── wize-tea-review/
│   │   └── wize-tea-gate/
│   ├── orchestrator-skills/    # Wizer
│   │   ├── wize-orchestrator/
│   │   ├── wize-onboarding/
│   │   └── wize-party-mode/
│   ├── builder-skills/         # Agent Builder
│   │   ├── wize-create-agent/
│   │   ├── wize-create-skill/
│   │   └── wize-create-workflow/
│   ├── web-overlay/            # Wize Web Dev overlay
│   │   ├── wize-web-scaffold/
│   │   ├── wize-web-seo-audit/
│   │   └── module.yaml
│   └── app-overlay/            # Wize App Development overlay
│       ├── wize-app-scaffold/
│       ├── wize-app-release-channels/
│       └── module.yaml
│
├── adapters/                   # IDE adapters
│   ├── claude-code/
│   ├── cursor/
│   ├── windsurf/
│   ├── codex/
│   ├── continue/
│   ├── kimi-code/
│   ├── opencode/
│   ├── antigravity/
│   └── generic/
│
├── tools/
│   └── installer/
│       ├── wize-cli.js
│       ├── detect.js           # greenfield/brownfield detector
│       ├── onboarding.js
│       ├── sync.js
│       └── validators/         # schema, lint, dry-run
│
└── test/                       # specs validating skills + workflows
```
