# Wize Development Kit

> **Kit de desarrollo asistido por IA, de ciclo completo** — lleva un proyecto del brief a la implementación testeada mediante 10 agentes especializados, con un Test Architect, un estudio de UX Whiteport y un Pentester de IA integrados. Funciona dentro de tu IDE con IA.

[![npm version](https://img.shields.io/npm/v/wize-dev-kit?color=blue)](https://www.npmjs.com/package/wize-dev-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-beta-green)](#estado)
[![Repo](https://img.shields.io/badge/repo-qwize--br%2Fwize--development--kit-181717?logo=github)](https://github.com/qwize-br/wize-development-kit)

**🌐 Idiomas:** [English](README.md) · [Português (pt-BR)](README.pt-BR.md) · **Español**

---

## Resumen rápido

```bash
npx wize-dev-kit install
```

Elige tus perfiles y tu IDE; luego, en tu IDE con IA, di *"Activa a Wizer y dale el briefing del proyecto."* Wizer te guía por el agente adecuado en cada fase — brief, PRD, UX, arquitectura, código testeado — y (opcionalmente) ejecuta un pentest de IA sobre tu aplicación.

---

## Qué es

Wize Development Kit (WDK) es un **stack de agentes de IA** instalable que funciona dentro de tu IDE con IA (Claude Code, Cursor, Windsurf, Codex y otros) y escribe artefactos estructurados en una carpeta oculta `.wize/` de tu repositorio. Lleva un proyecto de **brief → PRD → estrategia de UX → arquitectura → implementación testeada**, y también puede **hacer pentest de la app en ejecución y planificar el sprint de remediación**.

Es **file-first y zero-runtime**: los agentes son skills en Markdown que tu IDE lee; el tooling es Node puro (sin nuevas dependencias npm). Nada está simulado — cada paso lee el artefacto anterior y escribe uno real.

### Perfiles (combinables en monorepos)

| Perfil | Qué añade |
|---|---|
| **Wize Dev Core** | Ciclo completo (análisis → plan → solución → implementación) + Test Architect + UX Whiteport + Agent Builder. Siempre instalado. |
| **Wize Web Dev** *(overlay)* | Scaffolds web, SEO, analytics, playbook WCAG para Mantis, Playwright/Vitest para Hawkeye. |
| **Wize App Development** *(overlay)* | Scaffolds móviles, ficha de tienda, directrices de plataforma (HIG / Material 3), Detox/Maestro para Hawkeye. |
| **Wize Security** *(overlay)* 🆕 | **Pentester de IA.** Pipeline de pentest file-first (recon → enumerate → SAST → DAST → report) conducido por la persona `red-teamer`, con gate de alcance, clasificación OWASP/CVSS e informe ejecutivo. |

---

## Instalación

En cualquier repositorio, nuevo o existente (greenfield o brownfield):

```bash
npx wize-dev-kit install
```

O directamente desde GitHub (sin necesidad de npm):

```bash
npx github:qwize-br/wize-development-kit install
```

El instalador pregunta:

1. **Perfil(es)** — Core / +Web / +App / +Security (selección múltiple).
2. **IDE(s) objetivo** — Claude Code, Cursor, Windsurf, Codex, Continue, Kimi Code, OpenCode, Antigravity o fallback genérico (selección múltiple).
3. **Idiomas** — comunicación + salida de documentos.
4. **Carpeta de salida** — por defecto `.wize/`.
5. **Brownfield** — ofrece ejecutar `wize-document-project` para crear la baseline del código existente.

Tras instalar, abre tu IDE y di:

> "Activa a Wizer y dale el briefing del proyecto."

---

## El elenco

| # | Persona | Código | Rol |
|---|---|---|---|
| 1 | **Wizer** | `wize-orchestrator` | Orquestador, base de conocimiento, briefing, enrutamiento |
| 2 | **Pepper Potts** | `wize-agent-analyst` | Analista de Negocio + WDS Saga (brief de producto, trigger map) |
| 3 | **Peggy Carter** | `wize-agent-tech-writer` | Redactora Técnica (transversal) |
| 4 | **Maria Hill** | `wize-agent-pm` | Product Manager (PRD, epics, sprints) |
| 5 | **Mantis** | `wize-agent-ux-designer` | UX Designer + WDS Freya (escenarios, diseño, design system) |
| 6 | **Nick Fury** | `wize-agent-solution-strategist` | Estrategia de Solución, visión técnica, principios de NFR |
| 7 | **Tony Stark** | `wize-agent-architect` | Arquitecto de Sistemas (arquitectura, ADRs, epics, stories) |
| 8 | **Hawkeye** | `wize-agent-test-architect` | Test Architect — 6 gates (risk, design, trace, nfr, review, gate) |
| 9 | **Shuri** | `wize-agent-dev` | Desarrolladora Senior (TDD, código, refactor) |
| 10 | **red-teamer** 🆕 | `red-teamer` (overlay de seguridad) | Pentester de IA — recon, SAST/DAST, pruebas ofensivas con alcance, informe |

Consulta [`ROSTER.md`](ROSTER.md) para personas, estilos y equivalencias con BMAD.

---

## Recorrido — un proyecto completo, de principio a fin

Cada paso es un slash command en tu IDE; cada persona lee el artefacto anterior antes de escribir el suyo.

```
1.  /wize-orchestrator          Wizer saluda, lee config, detecta el estado y enruta.

2.  /wize-product-brief         Pepper convierte la demanda bruta en brief.md.
    /wize-trigger-map           Pepper mapea psicología del usuario → metas de negocio (WDS).
    /wize-research              Pepper sintetiza evidencia externa (opcional).

3.  /wize-create-prd            Maria Hill escribe prd.md (metas, alcance, ACs).
    /wize-validate-prd          Maria Hill (+ Mantis/Fury) aprueba.

4.  /wize-ux-scenarios          Mantis conduce el diálogo WDS de 8 preguntas.
    /wize-ux-design             Mantis escribe specs de pantalla (un .md por pantalla).

5.  /wize-tech-vision           Fury elige la familia de stack + innegociables.
    /wize-nfr-principles        Fury escribe el presupuesto de NFR (perf, seg, a11y…).

6.  /wize-create-architecture   Tony escribe architecture.md + ADRs (8 pasos).
    /wize-design-system         Mantis escribe design-system/ (tokens + componentes).
    /wize-create-epics-and-stories
                                Tony divide epics → stories (cada una con ACs).

7.  /wize-tea-risk              Hawkeye construye el perfil global de riesgo.
    /wize-tea-design            Hawkeye escribe el test design de la próxima story.
    /wize-dev-story             Shuri implementa (TDD, IDs de AC en los commits).
    /wize-tea-trace             Hawkeye mapea cada AC → tests.
    /wize-tea-review            Hawkeye ejecuta la revisión de la story.
    /wize-tea-gate              Hawkeye emite PASS / CONCERNS / FAIL / WAIVED.

8.  /wize-sprint-status         Maria Hill mantiene el snapshot diario actualizado.
    /wize-retrospective         Wizer facilita la retro al final de cada sprint.

Transversales:
    /wize-help                  Wizer averigua dónde estás y el próximo paso.
    /wize-quick-dev             Shuri toma un arreglo pequeño sin el ciclo completo.
    /wize-code-review           Revisión adversarial antes del gate TEA de Hawkeye.
    /wize-party-mode            Wizer reúne multi-persona para decisiones difíciles.
```

> Usa `/wize-help next` cuando tengas dudas — inspecciona `.wize/` y te dice la única acción siguiente.

---

## 🛡️ Overlay de seguridad — Pentester de IA

Con el perfil **Wize Security** instalado, la persona `red-teamer` ejecuta un pentest file-first de tu proyecto y produce un informe listo para stakeholders.

### Cómo funciona

1. **Autoriza el objetivo.** Declaras hosts/URLs permitidos en un `.wize/security/scope.md` firmado (integridad por SHA-256). Cualquier cosa fuera de la allowlist es **rechazada y auditada** — la herramienta nunca toca un objetivo que no autorizaste.
2. **Ejecuta el pipeline.**
   ```
   /wize-sec-pentest                 # pasivo por defecto (chequeos read-only)
   /wize-sec-pentest --active        # habilita tooling ofensivo (sqlmap, ffuf)
   ```
   Encadena: **recon** (nmap) → **enumerate** (superficie HTTP) → **SAST** (secrets con gitleaks + deps con osv-scanner/grype) → **DAST** (nuclei, nikto, sqlmap, ffuf) → **report**.
3. **Lee el informe.** `report.md` + un `report.html` self-contained (offline, WCAG 2.2 AA) con:
   - **Puntuación de riesgo 0–100** + **briefing** ejecutivo (qué significa el riesgo para el negocio),
   - hallazgos clasificados por **CVSS v3.1** y **OWASP Top 10**, con secrets redactados,
   - **cobertura honesta** ("audit confidence" — qué se probó y qué no),
   - un **plan de acción priorizado** (P0/P1/P2).
4. **Planifica la corrección.** El scan genera `security-backlog.md` (epics de remediación agrupados por tema, trazables a los hallazgos) e imprime el comando exacto para convertirlo en un sprint:
   ```
   /wize-create-epics-and-stories --from .wize/security/security-backlog.md
   ```

### Garantías de diseño

- **Cero runtime propio** — solo built-ins de Node; ninguna dependencia npm nueva; el overlay nunca invoca una skill (imprime el comando para que tú/el agente lo ejecuten).
- **Los datos quedan locales** — informes y hallazgos se escriben en `.wize/security/`, nunca se suben a ningún lado.
- **Las herramientas se detectan, nunca se auto-instalan** — un preflight comprueba tu toolchain y genera un `install-pentest-tools.sh` consciente del SO (apt para nmap/nikto/sqlmap; releases de GitHub para gitleaks/nuclei/ffuf/osv-scanner; script oficial para grype). Una herramienta ausente degrada solo ese chequeo — el pipeline continúa.
- **Pasivo por defecto** — el tooling ofensivo (sqlmap/ffuf) solo corre con `--active`; flags peligrosas (`--dump`, `--os-shell`) son vetadas por una allowlist independiente del input.

> ⚠️ **Herramienta de doble uso.** Prueba solo sistemas que poseas o estés explícitamente autorizado a probar.

---

## Estructura de salida (en el repositorio objetivo)

```
.wize/
├── config/             # project.toml, user.toml, tea.toml
├── planning/           # brief, research, ux/, prd, tech-vision, nfr-principles
├── solutioning/        # architecture, adrs, epics, stories
├── implementation/     # sprint-status, retrospective, tea/{gates}
├── knowledge/          # docs y referencias de larga duración
├── security/           # scope.md, report.{md,html}, security-backlog.md (overlay de seguridad)
└── custom/             # agents/skills/workflows creados por Agent Builder
```

---

## Comandos de la CLI

```bash
npx wize-dev-kit install         # setup interactivo
npx wize-dev-kit update          # actualiza un kit instalado a la versión actual
npx wize-dev-kit sync            # re-renderiza los adapters de IDE tras editar la config
npx wize-dev-kit agent list      # lista agentes nativos + personalizados
npx wize-dev-kit agent create    # crea un nuevo agente personalizado (validado + dry-run)
npx wize-dev-kit agent edit <code>  # sobrescribe un agente nativo
npx wize-dev-kit doctor          # diagnostica kit / proyecto / adapters / gates
npx wize-dev-kit validate        # chequeos estructurales en los assets del kit
npx wize-dev-kit document-project [quick|initial_scan|full_rescan|deep_dive] [--resume] [--target <path>]
npx wize-dev-kit uninstall       # elimina .wize/ (tu código queda intacto)
```

---

## Documentación

- [`ARCH.md`](ARCH.md) — arquitectura completa: distribución, flujos, layout, instalador.
- [`ROSTER.md`](ROSTER.md) — personas con estilo, rol, equivalencias BMAD.
- [`DECISIONS.md`](DECISIONS.md) — registro de decisiones.
- [`CHANGELOG.md`](CHANGELOG.md) — historial de releases.

---

## Estado

**v0.7.0 — beta.** El ciclo completo (análisis → plan → solución → implementación) está montado con 10 agentes y una biblioteca estructurada de skills. El `security-overlay` (Pentester de IA) entrega un pipeline de pentest completo, un informe ejecutivo (puntuación de riesgo + briefing + plan de acción por IA) y planificación de remediación post-scan — validado de principio a fin contra una aplicación Laravel/PHP real. Los adapters de IDE para Claude Code, Cursor, Windsurf, Codex, Continue, Kimi Code, OpenCode y Antigravity se regeneran automáticamente.

---

## Inspiración y créditos

- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) por Brian (BMad) Madison — ciclo ágil de IA, personas de agentes, patrón de instalador, sistema de módulos.
- [Whiteport Design Studio expansion](https://github.com/bmad-code-org/bmad-method-wds-expansion) — metodología UX-first, panteón nórdico (Saga, Freya), estructura de fases.

Wize Development Kit es una **adaptación independiente** — no afiliada ni respaldada por los autores de BMAD o WDS. Los nombres de personas Marvel se usan como referencias creativas bajo uso nominativo justo.

---

## Licencia

MIT — consulta [`LICENSE`](LICENSE).
