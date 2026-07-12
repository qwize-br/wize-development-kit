---
status: ready-for-stories
owner: Tony Stark
created: 2026-06-17
updated: 2026-06-17
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: architecture
lastStep: 8
inputDocuments:
  - .wize/planning/brief.md
  - .wize/planning/prd.md
  - .wize/planning/tech-vision.md
  - .wize/planning/nfr-principles.md
---

# Architecture — wize-dev-kit · `security-overlay` (AI Pentester)

## Summary

Overlay file-first `security-overlay` no trilho existente do kit. **Stack:** Node 20+ zero-dep, com 5 skills de fase (`wize-sec-recon`, `wize-sec-enumerate`, `wize-sec-exploit`, `wize-sec-report`) + 1 orquestradora (`wize-sec-pentest`) + 1 persona (`red-teamer`). **Persistência:** arquivos (`.wize/security/scope.md`, `*.md` parciais, `report.{md,html}`). **Sem deploy target** — distribuição via npm como o kit. **Componentes centrais reutilizados:** `_shared/scope-gate.js` (gate único, módulo compartilhado por todas as skills ofensivas) + `_shared/detect.js` (detecção com cache de sessão) + `data/tool-allowlist.json` (allowlist de flags). **Render:** `wize-sec-report/scripts/render-report.js` em Node built-ins produz `report.html` self-contained (CSS inline, axe-friendly). **Validação:** `npm run validate` verde em claude-code/cursor/codex; `node --test` para cobertura; gate TEA valida zero-dep npm + teste de recusa. **Status:** READY FOR IMPLEMENTATION, confidence high.

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
30 ACs cobrindo 7 epics (E08 preflight added post-validation). E01 (empacotamento) e E07 (relatório) são os extremos do pipeline; E02 (gate de escopo) é o módulo central reutilizado por E03–E06; E03 é a única composição multi-skill; E04–E06 são folhas que orquestram ferramentas externas via Bash.

**Non-Functional Requirements:**
7 non-negotiables de Security (categoria central), 3 de Reliability (idempotência do artefato), 4 de Maintainability (compatibilidade com kit), 2 de Accessibility (WCAG 2.2 AA + semantic-html no report.html), 2 de Cost (zero infra + zero-dep npm).

**Scale & Complexity:**
- Primary domain: file-first package / CLI tooling (não web/mobile)
- Complexity: medium — acoplamento leve ao instalador, gate de escopo central, ferramentas externas opcionais
- Componentes: ~10 (5 skills, 1 orquestradora, 1 gate, 1 detect, 1 render, 1 persona + agents)

### Technical Constraints & Dependencies
- Node 20+ (kit baseline)
- Zero npm deps novas no overlay
- Ferramentas externas opcionais (nmap, gitleaks, osv-scanner/grype, nuclei, nikto, sqlmap, ffuf) — degradação suportada
- Trilhos de install existentes: PROFILES (wize-cli.js:43), frontmatter `overlay:` (render-shared.js:79), hints (onboarding.js:27)
- Playbooks reusados: `semantic-html.md`, `wcag-aa.md` (web-overlay)

### Cross-Cutting Concerns Identified
- **Gate de escopo** atravessa todas as skills ofensivas (E02 é pré-requisito de E04–E06)
- **Recusa auditada** atravessa todo o pipeline (não falha em silêncio)
- **Detecção de ferramentas** atravessa todas as skills que usam CLI (E04–E06)
- **Formato de parcial** é o contrato entre E04–E06 e E07
- **Aviso de uso autorizado** aparece em install (wize-cli) e no gate de escopo (primeira execução)

## Starter Template Evaluation

### Primary Technology Domain
**CLI/file-first package dentro de um monorepo de skills.** Não é web/mobile/backend/app — é um overlay instalável do wize-dev-kit, consumido pelos harnesses do usuário (claude-code, cursor, codex, etc.).

### Starter Options Considered
N/A. Este overlay é **greenfield dentro do kit existente**; o "starter" são as convenções já estabelecidas pelos overlays `web-overlay` e `app-overlay` (mesmo padrão de `src/<overlay>/...`). Não há template externo a avaliar — buscar starters na web seria forçar um paralelo que não existe.

Decisões de fundação já fixadas em `.wize/planning/tech-vision.md` e `.wize/planning/nfr-principles.md`:
- Linguagem: Node 20+ (built-ins apenas — zero `npm` deps novas no overlay).
- Render de relatório: template HTML inline com CSS inline, gerado por função pura em Node.
- Test: `node --test` (já usado pelo kit).
- Distribuição: via npm como o kit atual; skills empacotadas em `src/security-overlay/`.
- Validação: `npm run validate` continua verde.

### Selected Starter: convenções internas do wize-dev-kit

**Rationale:** o overlay deve ser indistinguível em forma dos outros overlays (`web-overlay`, `app-overlay`) — mesma estrutura de pastas, mesmo trilho de PROFILES, mesmo frontmatter. Reutilizar o pattern existente minimiza risco, acelera review e mantém `npm run validate` verde sem retrabalho.

**Initialization Command:** n/a (não há scaffold — copiar convenção de `src/web-overlay/` e `src/app-overlay/`).

**Architectural Decisions Provided by Starter:**
- Language & Runtime: Node 20+ (built-ins apenas)
- Build Tooling: nenhum (skill é texto + scripts `.js`); `npm run validate` é o gate
- Testing Framework: `node:test` (já no kit)
- Code Organization: `src/security-overlay/<skill>/SKILL.md` + `scripts/`, `agents/<name>/agent.yaml`, `persona.md`, `playbooks/`, `data/`
- Development Experience: smoke test no E01; axe em CI no E07

## Core Architectural Decisions

> Adaptação ao contexto: o template assume web/backend. Aqui, 4 das 5 categorias (DB, API, Frontend, Infra) **não se aplicam** — o overlay é file-first, sem deploy. As decisões concentram-se em **estrutura de módulos, contrato de artefatos e ADRs**.

### Decision Priority Analysis

**Critical Decisions (block implementation):**
1. **Módulo de gate único** compartilhado por todas as skills (E02 é cross-cutting)
2. **Formato do `scope.md`** (frontmatter + allowlist)
3. **Contrato de parciais** entre fases e relatório
4. **Detecção de ferramentas** (módulo shared + cache de sessão)

**Important Decisions (shape architecture):**
5. Estrutura de pastas do overlay (espelhar `web-overlay`)
6. Lista de ADRs a registrar
7. Localização do `data/owasp-top10.json` e `data/tool-allowlist.json`

**Deferred Decisions (post-MVP):**
- Webhooks de scan contínuo em CI
- Plugins de ferramentas além do kit amplo v1
- Auth criptográfica do `scope.md`

### Data Architecture
**N/A para um pacote file-first.** Persistência é 100% em arquivos (`.wize/security/scope.md`, `*.md` parciais, `report.{md,html}`). Sem DB. Validação do `scope.md` é feita pelo módulo de gate (YAML frontmatter via Node built-ins).

### Authentication & Security
| Item | Decisão | Versão | Rationale | Affects | Provided by starter? |
|---|---|---|---|---|---|
| Mecanismo de "auth" do pentester | **Gate de escopo via `scope.md`** com `accepted_by/accepted_at/scope_sha256` | n/a | Decisão do brief; default passivo + flag explícita para ativo. Sem chave criptográfica na v1 (integridade, não autenticação). | E02, E03–E06 | Não (decisão deste overlay) |
| Módulo de gate | **`src/security-overlay/_shared/scope-gate.js`** exportando `assertTargetInScope(scopePath, target)` | n/a | Módulo único compartilhado por todas as skills — facilita teste de recusa (AC-E02-5) e auditoria. | E02, E04–E06 | Não |
| Allowlist de flags por ferramenta | **`src/security-overlay/data/tool-allowlist.json`** (mapa tool → array de flags permitidas) | n/a | NFR Security non-negotiable #6: menor privilégio; gate do gate. | E04–E06 | Não |
| Recusa sempre auditada | Toda recusa emite linha com timestamp + motivo → gravada no `report.md` final | n/a | NFR Security non-negotiable #3. | E02, E07 | Não |
| Ofuscação de secrets no HTML | `render-report` substitui valores por `***REDACTED***` (regra por detector) | n/a | NFR Security non-negotiable #5. | E07 | Não |
| Detecção de ferramentas | **`src/security-overlay/_shared/detect.js`** com `detectTools([...names])`, cache em `.wize/security/.tools.json` (sessão) | n/a | Módulo shared + cache evita múltiplos `command -v`. Falta de tool = degradar, não abortar (PRD AC-E04-2, E05-3, E06-4). | E04–E06 | Não |

### API & Communication Patterns
**N/A — sem API, sem inter-service.** Comunicação intra-overlay = import Node entre módulos `_shared/`. Comunicação com ferramentas externas = `child_process.execFile` (não `exec` — sem shell injection) passando argumentos por array.

### Frontend Architecture
| Item | Decisão | Rationale |
|---|---|---|
| Único artefato UI: `report.html` | Template HTML único com CSS inline | "Zero runtime próprio" (NFR Cost #2). Sem build. |
| Renderização | `src/security-overlay/skills/wize-sec-report/scripts/render-report.js` em Node 20 (built-ins) | NFR non-negotiable: zero-dep npm. |
| Acessibilidade | HTML semântico + WCAG 2.2 AA; axe em CI no E07 | Playbooks `web-overlay/playbooks/semantic-html.md` e `wcag-aa.md` como guia. |

### Infrastructure & Deployment
**N/A — sem hosting, sem CI próprio.** Distribuição via npm (já é o trilho do kit). `npm run validate` é o gate de release; `node --test` para cobertura. Opcional: axe-core no CI rodando contra um `report.html` de smoke — sem deps adicionadas ao kit (axe pode ser chamado via `npx axe` em CI externo; ou usado via `child_process` com binário pré-baixado em `tools/`).

### Decision Impact Analysis

**Implementation Sequence:**
1. **E01** (empacotamento) — estabelece a forma do overlay (primeiro passo, destrava todo o resto)
2. **E02** (gate) — single module + teste de recusa; pré-requisito de E04–E06
3. **E03** (persona + orquestradora) — consome o gate
4. **E04 → E05 → E06** (recon/SAST/DAST) — folhas, dependem só do gate + detect
5. **E07** (relatório) — última, consome os parciais de E04–E06

**Cross-Component Dependencies:**
- Todas as skills ofensivas (E04–E06) → `_shared/scope-gate.js` + `_shared/detect.js`
- `wize-sec-report` (E07) → todas as skills de fase (lê parciais) + `_shared/cvss.js` (cálculo de score) + `data/owasp-top10.json`
- Orquestradora `wize-sec-pentest` (E03) → todas as skills de fase, na ordem do PRD

## Implementation Patterns & Consistency Rules

> Adaptação: o template cobre API/DB/eventos. Aqui, padrões que importam são os de **naming de skill/agent**, **estrutura de pastas**, **formato de frontmatter/artefato**, **logging de recusa**, e **invocação de ferramentas externas** (onde múltiplos agentes podem divergir).

### Naming Patterns
| Item | Padrão | Exemplo |
|---|---|---|
| Skill | `wize-sec-<fase>` em kebab-case | `wize-sec-recon`, `wize-sec-pentest` |
| Agent | mesmo slug que a skill, sem prefixo | `red-teamer` (singular, em `agents/`) |
| Pasta de skill | `src/security-overlay/skills/<slug>/` com `SKILL.md` + `scripts/` | `src/security-overlay/skills/wize-sec-recon/` |
| Módulo shared | `src/security-overlay/_shared/<nome>.js` (Node, ESM ou CJS — convenção do kit) | `_shared/scope-gate.js` |
| Arquivo de dado estático | `src/security-overlay/data/<nome>.json` | `data/owasp-top10.json` |
| Parcial de fase | `.wize/security/<fase>.md` | `.wize/security/recon.md` |
| Relatório final | `.wize/security/report.md` + `.wize/security/report.html` | — |
| Ferramentas (data) | `data/tool-allowlist.json` com chave = nome da tool, valor = array de flags permitidas | `{ "nmap": ["-sV", "-Pn", ...] }` |

### Structure Patterns
- Toda skill tem `SKILL.md` (instruções para o agente) + `scripts/` (Node built-ins).
- Toda skill segue a mesma sequência interna: `detect → load gate → load scope → run → write partial → audit-refusals`.
- Tudo Node-script é **CJS** (consistente com `tools/installer/*.js` do kit).
- `data/` só é lido, nunca escrito.
- Parciais vão em `.wize/security/` (gravável), nunca no `src/`.

### Format Patterns
| Item | Formato |
|---|---|
| Timestamps em parciais e relatório | ISO-8601 UTC (`2026-06-17T13:45:00Z`) |
| Severidade (frontmatter dos findings) | score numérico CVSS v3.1 (`cvss: 7.5`) + string OWASP (`owasp: A03:2021`) |
| Recusa (no relatório) | bloco com `timestamp`, `phase`, `target`, `reason` em YAML |
| Cores das badges (HTML) | mapeamento fixo: Critical `#7f1d1d`, High `#b91c1c`, Medium `#b45309`, Low `#1d4ed8`, Info `#475569` |
| Tamanho do badge | `font-size: 0.75rem; padding: 2px 8px; border-radius: 4px` (mesma em todos os badges do relatório) |
| Path dentro do overlay (em logs/erros) | sempre relativo à raiz do projeto (`./.wize/security/...`), nunca absoluto |

### Communication Patterns
- **Invocação de ferramentas externas**: sempre via `child_process.execFile(bin, args, { timeout, maxBuffer })` — nunca `exec` (sem shell), nunca string concatenada. Argumentos vêm de `data/tool-allowlist.json` filtrados.
- **Logging**: stdout para output que o agente mostra; stderr para erros. Recusas vão para um arquivo `.wize/security/.refusals.log` (NFR Security #3).
- **Inter-módulo**: `require()` relativo (`require('../_shared/scope-gate')`).
- **Inter-skill (orquestradora)**: a orquestradora lê parciais em disco; **não importa scripts das skills de fase** (evita acoplamento e mantém cada skill standalone).

### Process Patterns
- Toda skill começa com `assertScopeLoaded()` — se `scope.md` inválido, aborta antes de qualquer I/O ofensivo.
- Toda skill verifica `detectTools()` antes de invocar ferramenta; se ausente, registra degradação e pula.
- Toda skill **não aborta o pipeline** se sua parte falhar — grava `partial_status: incomplete` no frontmatter e segue.
- Relatório final é regenerável: rerodar `wize-sec-report` (E07) é idempotente sobre os parciais existentes.
- Erros são sempre estruturados: `{ code, message, target?, recoverable }`. Sem strings de erro ad-hoc.

### Enforcement Guidelines

**All AI agents MUST:**
- Chamar `assertTargetInScope` antes de qualquer invocação de ferramenta ofensiva (gated pelo `scope.md`).
- Usar `execFile` (nunca `exec`) e validar argumentos contra `tool-allowlist.json` antes de invocar.
- Escrever parciais em `.wize/security/<fase>.md` com frontmatter YAML + seções MD — formato **idêntico** entre fases (ver `data/partial-schema.json`).
- Logar recusas com timestamp ISO-8601 em `.refusals.log` — nunca stderr-only.
- **Não adicionar npm deps**. Se um agente precisar de uma lib, é um cheiro — escalar.
- Manter `npm run validate` verde em claude-code/cursor/codex.

### Pattern Examples
**Good — invocação gated:**
```js
const { assertTargetInScope, loadScope } = require('../_shared/scope-gate');
const { execFileSync } = require('child_process');
const scope = loadScope('./.wize/security/scope.md');
assertTargetInScope(scope, target);
execFileSync('nmap', allowedArgsFromAllowlist(target), { timeout: 60_000 });
```
**Anti-patterns:**
```js
// PROIBIDO: shell injection
exec(`nmap -sV ${target}`);
// PROIBIDO: target sem gate
execFileSync('nmap', [userInput]);
// PROIBIDO: falha em silêncio
try { runNmap(); } catch (_) { /* swallow */ }
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
src/security-overlay/
├── module.yaml                          # Module manifest (espelha web-overlay)
├── skills/
│   ├── wize-sec-pentest/                # E03 — orquestradora
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── run-pipeline.js          # encadeia as fases; propaga --active
│   ├── wize-sec-recon/                  # E04 — recon (nmap) + SAST (gitleaks, osv/grype)
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       ├── run-nmap.js
│   │       ├── run-gitleaks.js
│   │       └── run-osv.js
│   ├── wize-sec-enumerate/              # E04 — enumeração de superfície
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── run-enumerate.js
│   ├── wize-sec-exploit/                # E06 — DAST (nuclei, nikto, sqlmap, ffuf)
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       ├── run-nuclei.js
│   │       ├── run-nikto.js
│   │       ├── run-sqlmap.js
│   │       └── run-ffuf.js
│   └── wize-sec-report/                 # E07 — relatório
│       ├── SKILL.md
│       └── scripts/
│           └── render-report.js         # MD+HTML a partir dos parciais
├── _shared/                             # Módulos Node compartilhados
│   ├── scope-gate.js                    # E02 — assertTargetInScope, loadScope
│   ├── detect.js                        # detectTools() + cache de sessão
│   ├── cvss.js                          # cálculo de score CVSS v3.1
│   ├── refuse.js                        # helper de logging de recusas
│   └── partial-schema.json              # schema do frontmatter dos parciais
├── data/                                # Arquivos estáticos (read-only)
│   ├── owasp-top10.json                 # OWASP Top 10 (2021) — categorias + tags
│   ├── tool-allowlist.json              # mapa tool → flags permitidas
│   └── partial-schema.json              # (espelho para documentação; validação usa _shared/)
├── agents/
│   └── red-teamer/
│       ├── agent.yaml
│       └── persona.md
├── playbooks/                           # Guias (não carregados por skills)
│   ├── scope-md-authoring.md
│   └── cvss-owasp-tagging.md
└── tests/                               # node:test, espelhando estrutura
    ├── _shared/
    │   ├── scope-gate.test.js
    │   ├── detect.test.js
    │   └── cvss.test.js
    ├── skills/
    │   ├── wize-sec-recon.test.js
    │   ├── wize-sec-enumerate.test.js
    │   ├── wize-sec-exploit.test.js
    │   └── wize-sec-report.test.js
    └── fixtures/
        ├── scope.md                     # fixture: scope válido
        └── scope-expired.md             # fixture: scope expirado / adulterado

.wize/security/                          # (gerado no projeto do usuário, NÃO no src/)
├── scope.md                             # entrada do usuário (acceptance)
├── .tools.json                          # cache de detectTools (sessão)
├── .refusals.log                        # recusas (NFR Security #3)
├── recon.md                             # parcial E04
├── enumerate.md                         # parcial E04
├── sast.md                              # parcial E05 (gitleaks + osv/grype)
├── dast.md                              # parcial E06 (nuclei + nikto + sqlmap + ffuf)
├── report.md                            # final
└── report.html                          # final (single-file)
```

### Architectural Boundaries

| Boundary | Conteúdo | Quem acessa |
|---|---|---|
| **Instalador (kit)** | `tools/installer/wize-cli.js` (PROFILES), `render-shared.js` (filtro `overlay: security`), `onboarding.js` (hint), `validators/` (valida) | Mantenedores do kit |
| **Overlay (src)** | Tudo em `src/security-overlay/**` | Instalador (le), harness do usuário (le/executa) |
| **Módulos shared** | `_shared/*.js` — código Node, testável isoladamente | Skills do overlay (require relativo) |
| **Artefatos (projeto do usuário)** | `.wize/security/**` — só leitura do agente após gravação | Skills (RW), harness (R) |
| **Tools externas** | binários no PATH do usuário | Skills via `child_process.execFile` |
| **Harness** | claude-code/cursor/codex/etc. | Usuário (interage), skills (executam via Bash) |

### Requirements to Structure Mapping

| Epic | Componentes | Notas |
|---|---|---|
| E01 Empacotamento | `tools/installer/wize-cli.js` + `render-shared.js` + `onboarding.js` | Mudanças pequenas no instalador, mesmo padrão de `web-overlay` |
| E02 Gate de escopo | `_shared/scope-gate.js` + `data/partial-schema.json` (cabeçalho do scope) | Módulo único; testado em `tests/_shared/scope-gate.test.js` |
| E03 Persona + orquestradora | `agents/red-teamer/` + `skills/wize-sec-pentest/` | Orquestradora encadeia E04→E05→E06→E07 propagando `--active` |
| E04 Recon + enum | `skills/wize-sec-recon/scripts/` + `skills/wize-sec-enumerate/` | nmap; degrada se ausente |
| E05 SAST | `skills/wize-sec-recon/scripts/run-gitleaks.js` + `run-osv.js` | Alojados em `wize-sec-recon` por proximidade conceitual (varredura sem app vivo) |
| E06 DAST | `skills/wize-sec-exploit/scripts/` | Gate de escopo + flag `--active` obrigatória |
| E07 Relatório | `skills/wize-sec-report/scripts/render-report.js` + `_shared/cvss.js` + `data/owasp-top10.json` | Consome parciais; ofusca secrets; gera MD+HTML |

### Integration Points

- **Instalador ↔ overlay:** frontmatter `overlay: security` em cada `SKILL.md` é o que `render-shared.js` filtra.
- **Overlay ↔ harness:** o harness lê `SKILL.md` (instruções) e executa os `scripts/` via Bash; a orquestradora é apenas uma skill que o usuário invoca.
- **Skills ↔ tools externas:** via `_shared/scope-gate.js` + `_shared/detect.js` antes de qualquer `execFile`.
- **`render-report` ↔ parciais:** leitura sequencial de `recon.md`, `enumerate.md`, `sast.md`, `dast.md` (o que existir); parciais ausentes = seção com `status: missing` no relatório.
- **Red-teamer ↔ TEA:** o agente red-teamer entrega os findings; Hawkeye revisa a implementação do overlay nas stories (gate `review` per-story), não o resultado do pentest do usuário.

## Architecture Validation Results

### Coherence Validation
- **Decisões compatíveis:** zero-dep npm (tech-vision) ↔ Node built-ins (decisions) ↔ `npm run validate` (NFR) — coerente.
- **Patterns consistentes:** `execFile` + allowlist (decisions) ↔ anti-pattern `exec` (patterns) — coerente.
- **Estrutura alinhada com starter:** estrutura replica `web-overlay`/`app-overlay` (patterns + structure) — coerente.

### Requirements Coverage Validation

| PRD goal | Componente arquitetural | Status |
|---|---|---|
| G1 Pacote instalável | Modificações em `wize-cli.js` + `render-shared.js` + `onboarding.js` (E01) | ✓ |
| G2 Pipeline file-first | Estrutura de skills em `src/security-overlay/skills/` (E03–E07) | ✓ |
| G3 Cobertura v1 (SAST + ≥6 OWASP) | `wize-sec-recon/scripts/run-{gitleaks,osv}.js` + `wize-sec-exploit/scripts/run-{nuclei,nikto,sqlmap,ffuf}.js` + `data/owasp-top10.json` | ✓ |
| G4 Segurança por padrão | `_shared/scope-gate.js` + `data/tool-allowlist.json` + flag `--active` | ✓ |
| G5 Relatório apresentável | `wize-sec-report/scripts/render-report.js` + `_shared/cvss.js` | ✓ |

| NFR non-negotiable | Coberto por | Status |
|---|---|---|
| Security 1–7 | `_shared/scope-gate.js`, `_shared/refuse.js`, `data/tool-allowlist.json`, `render-report.js` (ofuscação) | ✓ |
| Reliability 1–3 | Contrato de parciais (frontmatter padronizado) + padrão "degrada, não aborta" | ✓ |
| Maintainability 1–4 | Estrutura espelhada a outros overlays + zero-dep npm | ✓ |
| Accessibility 1–2 | `report.html` self-contained + axe no E07 | ✓ |
| Cost 1–2 | Zero infra + zero-dep npm | ✓ |
| Performance 1–2 | `npm run validate` verde + smoke test no E01 | ✓ |

### Implementation Readiness Validation
- Estrutura completa definida (componentes + paths + boundaries).
- Patterns documentados com exemplos **Good** vs **anti-pattern**.
- 4 ADRs pendentes para registro (próximo step).
- Decisões de fronteira (instalador) já mapeadas para diffs pequenos no `wize-cli.js`.

### Gap Analysis Results
- **Crítico:** nenhum.
- **Importante:** axe em CI — não está no stack do kit. Definido no NFR como `axe-core` rodando contra um `report.html` de smoke; se o kit não quiser nova dep, a validação roda **ad-hoc** (não no CI). Anotar para Hawkeye gate.
- **Nice-to-have:** dashboard de findings no terminal; ficou para fora do escopo (alinhado com o brief).

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented (gate, scope.md, parciais, detect)
- [x] Technology stack fully specified (Node 20, zero-dep)
- [x] Integration patterns defined (execFile + allowlist)
- [x] Performance considerations addressed (validate + smoke)

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION
**Confidence Level:** high
**Key Strengths:** decisões alinhadas com princípios do kit (zero-dep, file-first); gate como single source of truth; degradação em vez de abort mantém pipeline resiliente.
**Areas for Future Enhancement:** dashboard de findings; axe em CI (depende de decisão de infra do kit); sandbox de execução (Docker) para DAST (NFR Security stretch).

### Implementation Handoff

**AI Agent Guidelines:**
- Chamar `assertTargetInScope` **antes** de qualquer `execFile` (decisão + pattern).
- Zero `package.json` deps novas no overlay. Resistir à tentação de adicionar libs.
- Toda skill: `detect → load scope → gate → execFile (filtered args) → write partial → log refusals`. Sequência canônica.
- Reportar degradações no parcial com `partial_status: incomplete` quando aplicável; nunca abortar pipeline.
- Rerun de `wize-sec-report` é idempotente.

## ADRs

See `.wize/solutioning/adrs/`:

- **ADR-001** — Gate de escopo como módulo único compartilhado
- **ADR-002** — Formato do `scope.md` (YAML frontmatter + Markdown body)
- **ADR-003** — `render-report` em Node 20 zero-dependency
- **ADR-004** — Flag `--active` no escopo da skill/orquestradora
