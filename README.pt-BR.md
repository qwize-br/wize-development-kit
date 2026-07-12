# Wize Development Kit

> **Kit de desenvolvimento assistido por IA, de ciclo completo** — leva um projeto do brief à implementação testada por meio de 10 agentes especializados, com um Test Architect, um estúdio de UX Whiteport e um Pentester de IA embarcados. Roda dentro da sua IDE com IA.

[![npm version](https://img.shields.io/npm/v/wize-dev-kit?color=blue)](https://www.npmjs.com/package/wize-dev-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-beta-green)](#status)
[![Repo](https://img.shields.io/badge/repo-qwize--br%2Fwize--development--kit-181717?logo=github)](https://github.com/qwize-br/wize-development-kit)

**🌐 Idiomas:** [English](README.md) · **Português (pt-BR)** · [Español](README.es.md)

---

## Resumo rápido

```bash
npx wize-dev-kit install
```

Escolha os perfis e a IDE; depois, na sua IDE com IA, diga *"Ative o Wizer e dê o briefing do projeto a ele."* O Wizer te conduz pelo agente certo em cada fase — brief, PRD, UX, arquitetura, código testado — e (opcionalmente) roda um pentest de IA na sua aplicação.

---

## O que é

O Wize Development Kit (WDK) é uma **stack de agentes de IA** instalável que roda dentro da sua IDE com IA (Claude Code, Cursor, Windsurf, Codex e outras) e grava artefatos estruturados em uma pasta oculta `.wize/` no seu repositório. Leva um projeto de **brief → PRD → estratégia de UX → arquitetura → implementação testada** e também pode **fazer pentest da aplicação rodando e planejar a sprint de correção**.

É **file-first e zero-runtime**: os agentes são skills em Markdown que sua IDE lê; o tooling é Node puro (uma única dependência de runtime, `prompts`, usada pelo instalador interativo — nada é adicionado ao seu projeto). Nada é simulado — cada passo lê o artefato anterior e grava um real.

### Perfis (combináveis em monorepos)

| Perfil | O que adiciona |
|---|---|
| **Wize Dev Core** | Ciclo completo (análise → plano → solução → implementação) + Test Architect + UX Whiteport + Agent Builder. Sempre instalado. |
| **Wize Web Dev** *(overlay)* | Scaffolds web, SEO, analytics, playbook WCAG para o Mantis, Playwright/Vitest para o Hawkeye. |
| **Wize App Development** *(overlay)* | Scaffolds mobile, listagem em loja, diretrizes de plataforma (HIG / Material 3), Detox/Maestro para o Hawkeye. |
| **Wize Security** *(overlay)* 🆕 | **Pentester de IA.** Pipeline de pentest file-first (recon → enumerate → SAST → DAST → report) conduzido pela persona `red-teamer`, com gate de escopo, classificação OWASP/CVSS e relatório executivo. |

---

## Instalação

Em qualquer repositório, novo ou existente (greenfield ou brownfield):

```bash
npx wize-dev-kit install
```

Ou direto do GitHub (sem precisar de npm):

```bash
npx github:qwize-br/wize-development-kit install
```

O instalador pergunta:

1. **Perfil(is)** — Core / +Web / +App / +Security (múltipla escolha).
2. **IDE(s) alvo** — Claude Code, Cursor, Windsurf, Codex, Continue, Kimi Code, OpenCode, Antigravity ou fallback genérico (múltipla escolha).
3. **Idiomas** — comunicação + saída de documentos.
4. **Brownfield** — oferece rodar `wize-document-project` para criar a baseline do código existente.

Após instalar, abra sua IDE e diga:

> "Ative o Wizer e dê o briefing do projeto a ele."

---

## Harnesses suportadas

Os 9 alvos de IDE são gerados a partir da mesma fonte; formato e mecânica mudam por harness. O **OpenCode** tem a integração mais profunda — a divisão persona/workflow do kit mapeia pras primitivas nativas do próprio OpenCode (`mode: primary|subagent`, `agent:`, `subtask:`) em vez de ser achatada num único tipo de arquivo.

| Harness | Saída | Destaque |
|---|---|---|
| **OpenCode** 🆕 | `.opencode/agents/` + `.opencode/commands/` | `mode: primary\|subagent` nativo; commands se ligam à persona dona (`agent:`); workers de fan-out rodam isolados (`subtask: true`). [Docs →](docs/harnesses/opencode.pt-BR.md) |
| **Claude Code** | `.claude/skills/*/SKILL.md` | Formato Skill da Anthropic; fan-out ad hoc via Task/Agent tool (`wize-code-review`). [Docs →](docs/harnesses/claude-code.pt-BR.md) |
| **Codex** | `.agents/skills/*/SKILL.md` | Mesmo formato Skill + `AGENTS.md` na raiz. [Docs →](docs/harnesses/codex.pt-BR.md) |
| **Kimi Code** | `.kimi/skills/*/SKILL.md` | Mesmo formato Skill; autodetecta as árvores do Claude/Codex. [Docs →](docs/harnesses/kimi-code.pt-BR.md) |
| **Antigravity** | `.agent/skills/*/SKILL.md` | Mesmo formato Skill + `AGENTS.md` na raiz. [Docs →](docs/harnesses/antigravity.pt-BR.md) |
| **Cursor** | `.cursor/rules/*.mdc` | Rules sob demanda (`alwaysApply: false`), casadas por descrição. [Docs →](docs/harnesses/cursor.pt-BR.md) |
| **Windsurf** | `.windsurf/rules/*.md` | Markdown puro; modo de ativação definido dentro da IDE. [Docs →](docs/harnesses/windsurf.pt-BR.md) |
| **Continue.dev** | `.continue/prompts/*.prompt` | Slash commands via `invokable: true`. [Docs →](docs/harnesses/continue.pt-BR.md) |
| **Fallback genérico** | `.wize/agents/*.md` + `AGENTS.md` na raiz | Para qualquer IDE sem adapter dedicado. [Docs →](docs/harnesses/generic.pt-BR.md) |

---

## O elenco

| # | Persona | Código | Papel |
|---|---|---|---|
| 1 | **Wizer** | `wize-orchestrator` | Orquestrador, base de conhecimento, briefing, roteamento |
| 2 | **Pepper Potts** | `wize-agent-analyst` | Analista de Negócio + WDS Saga (brief de produto, trigger map) |
| 3 | **Peggy Carter** | `wize-agent-tech-writer` | Redatora Técnica (transversal) |
| 4 | **Maria Hill** | `wize-agent-pm` | Product Manager (PRD, epics, sprints) |
| 5 | **Mantis** | `wize-agent-ux-designer` | UX Designer + WDS Freya (cenários, design, design system) |
| 6 | **Nick Fury** | `wize-agent-solution-strategist` | Estratégia de Solução, visão técnica, princípios de NFR |
| 7 | **Tony Stark** | `wize-agent-architect` | Arquiteto de Sistemas (arquitetura, ADRs, epics, stories) |
| 8 | **Hawkeye** | `wize-agent-test-architect` | Test Architect — 6 gates (risk, design, trace, nfr, review, gate) |
| 9 | **Shuri** | `wize-agent-dev` | Desenvolvedora Sênior (TDD, código, refactor) |
| 10 | **red-teamer** 🆕 | `red-teamer` (overlay de segurança) | Pentester de IA — recon, SAST/DAST, testes ofensivos com escopo, relatório |

Veja [`ROSTER.md`](ROSTER.md) para personas, estilos e equivalências com o BMAD.

---

## Passo a passo — um projeto completo, de ponta a ponta

Cada passo é um slash command na sua IDE; cada persona lê o artefato anterior antes de escrever o seu.

```
1.  /wize-orchestrator          Wizer cumprimenta, lê config, detecta estado e roteia.

2.  /wize-product-brief         Pepper transforma a demanda bruta em brief.md.
    /wize-trigger-map           Pepper mapeia psicologia do usuário → metas de negócio (WDS).
    /wize-research              Pepper sintetiza evidências externas (opcional).

3.  /wize-create-prd            Maria Hill escreve prd.md (metas, escopo, ACs).
    /wize-validate-prd          Maria Hill (+ Mantis/Fury) aprova.

4.  /wize-ux-scenarios          Mantis conduz o diálogo WDS de 8 perguntas.
    /wize-ux-design             Mantis escreve specs de tela (um .md por tela).

5.  /wize-tech-vision           Fury escolhe a família de stack + não-negociáveis.
    /wize-nfr-principles        Fury escreve o orçamento de NFR (perf, seg, a11y…).

6.  /wize-create-architecture   Tony escreve architecture.md + ADRs (8 passos).
    /wize-design-system         Mantis escreve design-system/ (tokens + componentes).
    /wize-create-epics-and-stories
                                Tony fatia epics → stories (cada uma com ACs).

7.  /wize-tea-risk              Hawkeye monta o perfil global de risco.
    /wize-tea-design            Hawkeye escreve o test design da próxima story.
    /wize-dev-story             Shuri implementa (TDD, IDs de AC nos commits).
    /wize-tea-trace             Hawkeye mapeia cada AC → testes.
    /wize-tea-review            Hawkeye faz a revisão da story.
    /wize-tea-gate              Hawkeye emite PASS / CONCERNS / FAIL / WAIVED.

8.  /wize-sprint-status         Maria Hill mantém o snapshot diário atualizado.
    /wize-retrospective         Wizer facilita a retro no fim de cada sprint.

Transversais:
    /wize-help                  Wizer descobre onde você está e o próximo passo.
    /wize-quick-dev             Shuri pega uma correção pequena sem o ciclo completo.
    /wize-code-review           Revisão adversarial antes do gate TEA do Hawkeye.
    /wize-party-mode            Wizer reúne multi-persona para decisões difíceis.
```

> Use `/wize-help next` sempre que estiver em dúvida — ele inspeciona `.wize/` e diz a única próxima ação.

---

## 🛡️ Overlay de segurança — Pentester de IA

Com o perfil **Wize Security** instalado, a persona `red-teamer` roda um pentest file-first do seu projeto e produz um relatório pronto para stakeholders.

### Como funciona

1. **Autorize o alvo.** Você declara hosts/URLs permitidos em um `.wize/security/scope.md` assinado (integridade por SHA-256). Qualquer coisa fora da allowlist é **recusada e auditada** — a ferramenta nunca toca em um alvo que você não autorizou.
2. **Rode o pipeline.**
   ```
   /wize-sec-pentest                 # passivo por padrão (checagens read-only)
   /wize-sec-pentest --active        # habilita tooling ofensivo (sqlmap, ffuf)
   ```
   Encadeia: **recon** (nmap) → **enumerate** (superfície HTTP) → **SAST** (secrets via gitleaks + deps via osv-scanner/grype) → **DAST** (nuclei, nikto, sqlmap, ffuf) → **report**.
3. **Leia o relatório.** `report.md` + um `report.html` self-contained (offline, WCAG 2.2 AA) com:
   - **Score de risco 0–100** + **briefing** executivo (o que o risco significa para o negócio),
   - findings classificados por **CVSS v3.1** e **OWASP Top 10**, com secrets redatados,
   - **cobertura honesta** ("audit confidence" — o que foi e o que não foi testado),
   - um **plano de ação priorizado** (P0/P1/P2).
4. **Planeje a correção.** O scan gera `security-backlog.md` (epics de remediação agrupados por tema, rastreáveis aos findings) e imprime o comando exato para virar uma sprint:
   ```
   /wize-create-epics-and-stories --from .wize/security/security-backlog.md
   ```

### Garantias de design

- **Zero runtime próprio** — só built-ins do Node; nenhuma dependência npm nova; o overlay nunca invoca uma skill (ele imprime o comando para você/o agente rodar).
- **Os dados ficam locais** — relatórios e findings são gravados em `.wize/security/`, nunca enviados a lugar nenhum.
- **Ferramentas são detectadas, nunca auto-instaladas** — um preflight checa seu toolchain e gera um `install-pentest-tools.sh` ciente do SO (apt para nmap/nikto/sqlmap; releases do GitHub para gitleaks/nuclei/ffuf/osv-scanner; script oficial para grype). Ferramenta ausente degrada só aquela checagem — o pipeline continua.
- **Passivo por padrão** — tooling ofensivo (sqlmap/ffuf) só roda com `--active`; flags perigosas (`--dump`, `--os-shell`) são vetadas por uma allowlist independente do input.

> ⚠️ **Ferramenta dual-use.** Só teste sistemas que você possui ou está explicitamente autorizado a testar.

---

## Layout de saída (no repositório alvo)

```
.wize/
├── config/             # project.toml, user.toml, tea.toml
├── planning/           # brief, research, ux/, prd, tech-vision, nfr-principles
├── solutioning/        # architecture, adrs, epics, stories
├── implementation/     # sprint-status, retrospective, tea/{gates}
├── knowledge/          # docs e referências de longa duração
├── security/           # scope.md, report.{md,html}, security-backlog.md (overlay de segurança)
└── custom/             # agents/skills/workflows criados pelo Agent Builder
```

---

## Comandos da CLI

```bash
npx wize-dev-kit install         # setup interativo
npx wize-dev-kit update          # atualiza um kit instalado para a versão atual
npx wize-dev-kit sync            # re-renderiza os adapters de IDE após editar a config
npx wize-dev-kit list            # lista agentes nativos + customizados
npx wize-dev-kit agent list      # lista agentes nativos + customizados
npx wize-dev-kit agent create    # cria um novo agente customizado (validado + dry-run)
npx wize-dev-kit agent edit <code>  # sobrescreve um agente nativo
npx wize-dev-kit workflow <create|list>  # cria ou lista workflows customizados
npx wize-dev-kit doctor          # diagnostica kit / projeto / adapters / gates
npx wize-dev-kit validate        # checagens estruturais nos assets do kit
npx wize-dev-kit document-project [quick|initial_scan|full_rescan|deep_dive] [--resume] [--target <path>]
npx wize-dev-kit uninstall       # remove .wize/ (seu código permanece intacto)
```

---

## Documentação

- [`ARCH.md`](ARCH.md) — arquitetura completa: distribuição, fluxos, layout, instalador.
- [`ROSTER.md`](ROSTER.md) — personas com estilo, papel, equivalências BMAD.
- [`DECISIONS.md`](DECISIONS.md) — log de decisões.
- [`CHANGELOG.md`](CHANGELOG.md) — histórico de releases.
- [`docs/harnesses/`](docs/harnesses/) — um doc por [harness suportada](#harnesses-suportadas), em português + [English](README.md#supported-harnesses).

---

## Status

**v0.8.0 — beta.** O ciclo completo (análise → plano → solução → implementação) está montado com 10 agentes e uma biblioteca estruturada de skills. O `security-overlay` (Pentester de IA) entrega um pipeline de pentest completo, um relatório executivo (score de risco + briefing + plano de ação por IA) e planejamento de correção pós-scan — validado de ponta a ponta contra uma aplicação Laravel/PHP real. Os adapters de IDE para Claude Code, Cursor, Windsurf, Codex, Continue, Kimi Code, OpenCode e Antigravity são regenerados automaticamente — o [OpenCode](docs/harnesses/opencode.pt-BR.md) tem a integração mais profunda das 9, com `mode`/`agent`/`subtask` nativos.

---

## Inspiração & créditos

- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) por Brian (BMad) Madison — ciclo ágil de IA, personas de agentes, padrão de instalador, sistema de módulos.
- [Whiteport Design Studio expansion](https://github.com/bmad-code-org/bmad-method-wds-expansion) — metodologia UX-first, panteão nórdico (Saga, Freya), estrutura de fases.

O Wize Development Kit é uma **adaptação independente** — não afiliada nem endossada pelos autores do BMAD ou do WDS. Os nomes de personas Marvel são referências criativas sob uso nominativo justo.

---

## Licença

MIT — veja [`LICENSE`](LICENSE).
