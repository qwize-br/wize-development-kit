# Changelog

All notable changes to **wize-dev-kit** are documented here.
Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.8.0] — 2026-07-04

### Added

- **OpenCode: commands agora rodam sob a persona dona.** O adapter deriva `agent: <code>` do `owner:` de cada workflow/skill (código, nome de exibição ou combinações "X + Y"), então `/wize-dev-story` já ativa o system prompt da Shuri em vez de depender de qual agente estava ativo.
- **OpenCode: fan-out isolado nativamente.** `wize-review-adversarial` e `wize-review-edge-case-hunter` — os dois workers nomeados que o `wize-code-review` dispara em paralelo — ganham `subtask: true`, isolando-os do contexto de quem invoca independentemente do chamador.
- **Escada de reuso (YAGNI) na persona da Shuri.** Antes de escrever código novo: precisa existir? já está no repo? a stdlib resolve? é nativo da plataforma? uma dependência instalada resolve? é uma linha? Só então código novo — referenciada por `wize-dev-story` e `wize-quick-dev`.
- **Padrão de fan-out de subagentes documentado na persona do Wizer**, generalizado a partir do `wize-code-review`: nomear cada worker, escopar contexto, despachar pela primitiva nativa do harness (Task/Agent tool no Claude Code; `mode`/`subtask` no OpenCode; geração de prompts + fallback manual nos demais), tolerar falha parcial.
- **`docs/harnesses/`** — um doc por harness suportada (9 adapters, em inglês + pt-BR), com overview curto e tabela no README apontando pra cada um. `package.json` passa a publicar `docs/` no pacote npm.

### Fixed

- **Instalador não tenta mais abrir a harness detectada ao final do `install`.** Em vez do prompt "abrir agora com Wizer?", sugere o comando inicial certo pro estado do repo (greenfield/brownfield) via `composeOnboarding`.
- Comentário desatualizado no adapter do Kimi Code, que ainda citava o path antigo do Codex (`.codex/skills/`).

## [0.7.3] — 2026-06-27

### Fixed

- **Codex adapter alinhado com a documentação pública da OpenAI.** O target `codex` voltou a renderizar skills em `.agents/skills/`, que é o diretório documentado para skills locais de repositório no Codex. A regressão em `0.7.2` tinha movido a saída para `.codex/skills/`, o que quebrou o carregamento das skills no harness real.
- **Doctor, smoke tests e `.gitignore` corrigidos para o path canônico do Codex.**

## [0.7.2] — 2026-06-27

### Fixed

- **Codex adapter path corrigido.** O instalador e o `sync` agora renderizam as skills do target `codex` em `.codex/skills/`, alinhado com o harness usado no projeto. Antes, o kit escrevia em `.agents/skills/`, o que deixava o install aparentemente bem-sucedido, mas sem as skills serem carregadas no Codex.
- **Diagnóstico e smoke alinhados ao Codex real.** `doctor`, `.gitignore`, smoke tests e testes de adapters passaram a validar `.codex/skills/`, evitando falso positivo no suporte multi-harness.

## [0.7.1] — 2026-06-21

### Changed

- **README reescrito** com TL;DR, perfil **Wize Security** na tabela, seção dedicada do AI Pentester (como funciona + garantias de design), roster com 10 agentes (red-teamer), `.wize/security/` no layout e status atualizado para v0.7.x.

### Added

- **Traduções do README:** `README.pt-BR.md` (Português) e `README.es.md` (Español), com seletor de idioma cruzado. Incluídos no pacote npm.

## [0.7.0] — 2026-06-21

### Added

- **Post-scan remediation planning (security-overlay).** Ao fim do `wize-sec-pentest`, o overlay traduz os findings em um backlog de correção pronto para `wize-create-epics-and-stories`.
  - **`security-backlog.md`** gerado em `.wize/security/`: findings agrupados por tema (ex.: 97 secrets → 1 epic de rotação, não 97 stories), priorizados **P0/P1/P2** pela pior severidade do grupo, estimados S/M/L, com rastreabilidade aos findings de origem + `scope_sha256` e DoD ("re-rodar scan e confirmar finding ausente").
  - Epics semeados pelo action plan do `ai-insights.json` quando presente.
  - **Call-to-action** com o comando exato (`/wize-create-epics-and-stories --from .wize/security/security-backlog.md`) impresso no terminal, no `report.md` e como banner no `report.html`.
  - Mantém **zero runtime próprio**: o overlay gera o backlog e imprime o comando; o usuário/agente é quem executa a skill de planejamento (o Node nunca invoca skills).

## [0.6.0] — 2026-06-20

### Added

- **`security-overlay` — AI Pentester (novo profile opcional).** Pipeline file-first de pentest que roda no harness do usuário (zero runtime próprio, zero dependência npm nova). Selecionável no instalador como `security-overlay`.
  - **Persona `red-teamer`** + orquestradora `wize-sec-pentest` que encadeia recon → enumerate → SAST → DAST → report.
  - **Gate de escopo** (`.wize/security/scope.md`, allowlist assinada com SHA-256): toda ação ofensiva é verificada por fase; alvo fora do escopo é recusado e auditado em `.refusals.log`. Default passivo; exploit ativo só com `--active`.
  - **Allowlist de flags por ferramenta** (`data/tool-allowlist.json`): `--dump`/`--os-shell` e afins nunca chegam ao `execFile`, independente do input.
  - **SAST**: secrets via gitleaks (com redação `***REDACTED***`) + dependências vulneráveis via osv-scanner/grype (CVE + CVSS).
  - **DAST**: nuclei, nikto (safe checks), sqlmap e ffuf (content discovery), gated por `--active` quando ofensivos.
  - **CVSS v3.1** zero-dep + tagger **OWASP Top 10 (2021)**.
  - **Relatório** `report.md` + `report.html` self-contained (CSS inline, offline, WCAG 2.2 AA): risk score 0–100, briefing executivo, plano de ação P0/P1/P2, cobertura honesta do teste (audit confidence), recomendação por finding.
  - **AI insights**: o renderer consome `ai-insights.json` escrito pelo LLM do harness (briefing + recomendações), sem chamada externa — dados ficam locais.
  - **Preflight** (Epic 08): detecta SO/arch/package-manager e gera `install-pentest-tools.sh` com a fonte correta por ferramenta (apt para nmap/nikto/sqlmap; GitHub release para gitleaks/nuclei/ffuf/osv-scanner; script oficial para grype).
- Documentação completa do overlay em `.wize/planning` e `.wize/solutioning` (brief, PRD, tech-vision, NFR, architecture, 4 ADRs, 8 epics, 26+ stories).

## [0.5.0] — 2026-06-17

### Added

- **Onboarding real.** `wize-onboarding` is no longer a stub; reads `.wize/config/{project,user}.toml` and detects state S0–S4, then routes to the right next workflow with explicit hand-off copy.
- **`wize-correct-course`** (4-implementation) — react when a sprint drifts. 5 sections: detect, classify (cut / re-route / escalate), propose, confirm with human, update `sprint-status.yaml`. Logs to `course-corrections.md`.
- **`wize-edit-prd`** (2-plan) — update `.wize/planning/prd.md` without rewriting. 4 edit types (AC, scope, non-goal, decision) with mandatory `prd-changelog.md` row per change.
- **`wize-project-context`** (3-solutioning) — consolidates brief + PRD + UX + architecture + ADRs + risk profile into `.wize/knowledge/project-context.md`. 5 sections, one canonical source for other agents.
- **`wize-checkpoint-preview`** (4-implementation) — pause mid-story to validate direction. Records snapshot + decision in `checkpoints/{story_id}.md`.
- **`wize-investigate`** (4-implementation) — structured RCA: frame, reproduce, hypothesize (top 3), verify, conclude. Report in `investigations/{date}-{slug}.md`.
- **`wize-qa-generate-e2e-tests`** (tea) — translates UX screens + ACs into concrete E2E cases with P0/P1/P2 priority. Output in `tea/e2e-cases/{screen}.md`.
- **`wize-review-edge-case-hunter`** (core) — focused edge-case pass. 4 areas (input, state, time/race, integration) with top-5 P0 ranking.
- **`wize-index-docs`** (core) — rebuilds `.wize/knowledge/index.md` from the actual tree, 5 sections.
- **`wize-editorial-review-prose` + `wize-editorial-review-structure`** (core) — Peggy Carter's review skills. Voice/jargon/hedging/pronouns; missing/misordered/heading-level/empty.
- **`wize-customize`** (core) — guided override of built-in agents/skills/workflows via `.wize/custom/{type}/{code}/customize.toml`.
- Sprint tracking: `.wize/implementation/sprint-status.yaml` (YAML state machine) plus human-readable `.wize/implementation/sprint-status.md`. 4 sprints closed (S1–S4).
- Backlog: `.wize/implementation/backlog.md` with prioritized list of missing agile workflows.
- TEA risk profile: 17 risks catalogued, all HIGH-impact mitigated.

### Changed

- **`wize-sprint-planning` hand-off** now suggests `/loop /wize-dev-story` so the dev loop runs across the sprint's `ready-for-dev` queue without re-invoking the workflow per story.
- IDE adapters now copy companion files (`steps/`, `templates/`, `data/`, `*.csv`, `*-template.md`, `customize.toml`, `research.template.md`) alongside the SKILL.md. Anthropic-family adapter emit count: 63 → 119 per run.

### Fixed

- Installer: the "How should the agents call you?" prompt is always surfaced (was being skipped when the user name was inferred from the OS). Uses `prompts` library consistently for text + confirm inputs; no more residual stdin.
- IDE adapters: micro-file workflows like `wize-create-architecture` previously rendered only their SKILL.md, dropping the entire `steps/` folder. Now all 4 Anthropic-family adapters copy siblings.

### Tests

- 233 passing (was 222). New: 4 Anthropic-family companion-file tests + 1 sprint-planning hand-off regression test.

## [0.4.1] — 2026-06-13

### Fixed

- Installer no longer skips the "How should the agents call you?" prompt due to residual input from previous `prompts`-library questions.

### Added

- Interactive install now detects AI harness CLIs on PATH and offers to launch `/wize-orchestrator` directly, showing the exact command (e.g. `claude -p /wize-orchestrator`).

## [0.4.0] — 2026-06-13

Adapts four BMAD Method step-based flows into the Wize universe: spec, architecture, code review, and research.

### Added

- **`wize-spec`** (core skill) — distills any intent input into a canonical five-field `SPEC.md` (Why, Capabilities, Constraints, Non-goals, Success signal) plus optional companion files. Includes template and headless response schemas.
- **Vertical research skills** under `src/method-skills/1-analysis/`:
  - `wize-market-research` — 6-step competition and customer research.
  - `wize-domain-research` — 6-step industry, regulatory, and trend research.
  - `wize-technical-research` — 6-step technology and architecture research.
- Registered new skills in `src/core-skills/module.yaml` and `src/method-skills/module.yaml`.

### Changed

- **`wize-create-architecture`** rewritten as an 8-step micro-file workflow: init → context → starter → decisions → patterns → structure → validation → complete. Old monolithic body archived in `.wize/knowledge/decisions/`.
- **`wize-code-review`** rewritten as a 4-step adversarial triage workflow: gather-context → review (Blind Hunter, Edge Case Hunter, Acceptance Auditor) → triage → present. Integrates with existing `wize-review-adversarial` and `wize-review-edge-case-hunter`.
- `README.md`, `DECISIONS.md`, and `.wize/knowledge/decisions/ADR-001-bmad-steps-import.md` document the import rationale and scope.
- `test/workflow-bodies.test.js` allowlists the short research dispatcher workflows.

### Tests

- Total: **222 passing**.

## [0.3.1] — 2026-06-13

Expands `wize-document-project` from a single lightweight baseline into a multi-mode documentation engine with project-type classification, resume state, and BMAD-equivalent templates.

### Added — `wize-document-project` engine

- **CLI modes:** `quick`, `initial_scan`, `full_rescan`, `deep_dive` via `wize-dev-kit document-project [mode]`.
- **Project-type classification:** `documentation-requirements.csv` with 12 types + `classifyProject()` module; detects monolith, multi-part repos, and the kit itself as `cli` + `library`.
- **JSON state file:** `project-scan-report.json` with schema, init/load/update/archive helpers, and `--resume` support.
- **Batch scanner:** subfolder-sized scans that skip noise directories and flag files >5000 LOC.
- **Master index renderer:** `index.md` with links + `_(To be generated)_` markers for missing conditional docs.
- **Deep-dive mode:** folder, file, feature, `api_group`, `component_group` targets with typed resolution.
- **11 BMAD-equivalent templates:** index, project-overview, source-tree-analysis, architecture, component-inventory, development-guide, api-contracts, data-models, deployment-guide, contribution-guide, deep-dive.

### Added — integration

- `doctor` now reports scan-state age, `index.md` "To be generated" marker count, and suggests `document-project` / `wize-refresh-knowledge` when stale.
- Brownfield installer prompts for documentation mode (quick / initial_scan / full_rescan / skip) with non-TTY fallback to quick.
- `wize-tea-risk` workflow adds documentation gaps as a risk category.
- CI smoke E2E now runs `wize-dev-kit document-project quick` and asserts the 6 baseline files.
- `README.md` and `ARCH.md` updated to describe the new engine and current maturity.

### Tests

- Total: **219 passing** (was 115).

## [0.3.0] — 2026-06-12

Adds a single-command diagnostic plus traceable GitHub Releases on every tag.

### Added — `wize-dev-kit doctor`

Single-command snapshot of kit + project + environment, plus a ranked list of suggestions. Designed to be the first command a new developer runs in an unfamiliar wize-enabled repo, and the go-to command when something looks off. Sections covered:

- **Kit versions** (installed, project-pinned in `kit_version`, registry-latest) — flags drift between any of them.
- **Project** — name, profiles, IDE targets, languages, current phase (heuristic: brief → trigger-map → PRD → UX → tech-vision → architecture → stories → risk profile → sprint planning → implementation).
- **IDE Adapters** — file count per target (`.claude/skills/`, `.cursor/rules/`, etc.). Flags adapters that didn't render and points at `wize-dev-kit sync`.
- **TEA gates** — counts PASS / CONCERNS / FAIL / WAIVED across `gate.md` files in `.wize/implementation/tea/`. Flags any FAIL or CONCERNS.
- **Knowledge baseline** — `last_refreshed` age per `document-project/*.md` file, plus inline-note count in `_pending.md`. Suggests `wize-refresh-knowledge` when files go stale (> 60 days) or pending notes pile up (≥ 5).
- **Harness CLIs on PATH** — claude / codex / opencode, with detected install paths.
- **Git** — branch / head, repo presence.

Implementation in `tools/installer/commands/doctor.js`. 11 new unit tests cover phase detection, gate counting, knowledge parsing, adapter path mapping, and end-to-end run on a minimal install.

Output is plain text (no colors) so it's grep-friendly and pipe-friendly. Section headers are stable for editors / dashboards to parse.

### Added — GitHub Release on every tag

After a successful `npm publish` from a `v*` tag, the workflow now:

1. Extracts the matching version's CHANGELOG entry (`## [VERSION]` to the next `## [`) with a small awk filter.
2. Creates a GitHub Release at the tag using `softprops/action-gh-release@v2`, with the CHANGELOG entry as the release body.
3. If no CHANGELOG entry is found for the version, falls back to GitHub's auto-generated notes.

Pre-release tags (`-alpha`, `-beta`, `-rc`) are marked as pre-release automatically. Requires `permissions: contents: write` (added to the publish job).

### Tests

- Total: **115 passing** (was 104).

## [0.2.5] — 2026-06-12

Fixes a real install-time bug that bit non-TTY users (CI smoke + anyone piping input into `wize-dev-kit install`).

### Fixed

- **Non-TTY prompt stall.** The CLI's `prompt()` helper created a new `readline.createInterface` per call and used `rl.question()`. Both choices misbehave in pipe mode: per-call interfaces close stdin on the first `rl.close()`, and even with a shared interface `readline.question` stalls when it has to read an empty line in non-TTY mode (Node 24 behavior). After step 1 of `install` (project name), every subsequent prompt would hang silently. Replaced with an event-based line reader: subscribe once to `line`, push waiters in order, propagate empty lines as `""`, treat EOF as "remaining waiters resolve empty". `printf '...\n\n\n\n\nName\n\n' | wize-dev-kit install` now runs cleanly to completion.

### Notes

This was the actual cause behind the CI smoke E2E loop. The 0.2.4 fix to the smoke script (using `npm install <tarball>` instead of `npx <tarball>`) was correct, but the underlying CLI couldn't accept piped input either, so the smoke kept failing at the second prompt. With both fixed, the smoke runs end-to-end.

## [0.2.4] — 2026-06-12

CI-only hotfix to actually unblock the publish pipeline. Surface area of wize-dev-kit unchanged.

### Fixed

- Smoke E2E step used `npx --yes "$tarball" install`. On the GitHub Actions runner that path is interpreted as a shell command, which tries to **execute the tarball directly** before npx ever extracts it — exit code 126, `Permission denied`. Rewrote the step to: install the tarball into a throwaway project via `npm install <tarball>`, then invoke `$NODE_MODULES/.bin/wize-dev-kit` directly. `npm install` extracts the archive properly and sets the bin executable bit, so the rest of the smoke (`install` → assertions → `update` → `agent list`) runs cleanly. Same coverage, named-per-check error messages, and now also sets `WIZE_DISABLE_UPDATE_CHECK=1` so the registry isn't probed mid-smoke.

## [0.2.3] — 2026-06-11

Hotfix: 0.2.1 and 0.2.2 publish workflows hung because `test/version-check.test.js` had a sync/async bug in its test scaffolding. CI's smoke E2E never started for those releases. This release fixes the test and re-runs the same smoke for 0.2.2 + 0.2.3.

### Fixed

- `withTempCacheHome` helper in `test/version-check.test.js` was synchronous (`return fn(dir)`), so its `finally` block restored the env var before the async callback's `writeCache` resolved. The cache lookup inside the callback then landed in the real `~/.cache/wize-dev-kit/`, contaminating subsequent test runs and intermittently failing the `getLatestVersion returns the cached value when fresh` assertion. Fix: make the helper `async` and `return await fn(dir)`. Confirmed locally + ensures CI doesn't get a stuck cache file across tags.

### Notes

No surface area changed; behavior of `wize-dev-kit` itself is identical to 0.2.2. The bump exists only so the publish workflow re-runs cleanly.

## [0.2.2] — 2026-06-11

Closes the "documentation always stale" gap: inline knowledge captures per story, Hawkeye enforces, sprint-end refresh consolidates. Plus auto-update nudges on the CLI and Wizer.

### Added — knowledge stays current

- **`wize-dev-story` step 8 — Knowledge update (inline).** After commits and before pre-PR check, Shuri checks whether the story touched any of the 5 baseline axes (architecture / conventions / risk-spots / dependencies / overview) and, if yes, adds 1–3 dated bullets to the matching `.wize/knowledge/document-project/*.md` file — same PR. ~60 seconds when applicable; skipped otherwise.
- **`wize-quick-dev` step 5 — Knowledge update (only if applicable).** Quick-dev rarely touches axes; when it does (dep bump that shifts API, rename that breaks a contract), one line lands in the relevant doc.
- **`wize-tea-review` step 5 — Knowledge update check.** Hawkeye walks the diff. Touched-but-not-updated stories get a `KN-NN` finding. `tea-review` frontmatter now carries `knowledge_axes_touched` + `knowledge_axes_updated`.
- **`wize-tea-gate` decision rule extended.** When `knowledge_axes_touched ≠ knowledge_axes_updated`, recommendation flips to `CONCERNS` (advisory) or `FAIL` (enforcing). Example `KN-NN` finding shape documented in the canonical YAML.
- **`wize-refresh-knowledge` (new workflow).** Sprint-end consolidation: Pepper + Peggy roll the dated bullets accumulated through the sprint into the narrative prose of each axis file, demote stale claims to a `Deprecated` section, freeze a snapshot at `.wize/knowledge/document-project/_history/{YYYY-Qn}/sprint-{N}.md`, and stamp `last_refreshed` in each file. Triggered when `wize-help next` detects the sprint emptied.
- **`wize-document-project` — Update mode section.** Documents the two-cadence loop (inline-per-story + sprint-refresh) and the file frontmatter convention (`last_refreshed`).

### Added — proactive nudges

- **`wize-help` skill — version-skew detection.** Wizer now reads `kit_version` from `.wize/config/project.toml`, compares with the installed package version and (via Bash tool when available) the registry, and proactively suggests `npx wize-dev-kit@latest update` when behind. Worded as a single short line, never as a banner.
- **`wize-help` skill — sprint-end detection.** Heuristic refined: when sprint-status shows all stories gated and no `ready-for-dev` left, the next-step recommendation is `wize-retrospective` + `wize-refresh-knowledge`, not just retro.
- **CLI version check (camera 1).** `wize-dev-kit list / sync / agent / workflow / help` now print a one-line `↑ Update available: X → Y` at the top when a newer version sits in the npm registry. Cached for 1 hour, 1.5s network timeout, silent on offline / non-TTY / `WIZE_DISABLE_UPDATE_CHECK=1`. Never blocks. New module `tools/installer/version-check.js`.

### Tests

- Total: **104 passing** (was 94 in 0.2.1).
- 10 new tests in `test/version-check.test.js` covering semver compare, cache freshness, fetch fallback (offline + non-2xx), TTY guard, env disable.

### Files

- `src/method-skills/1-analysis/wize-refresh-knowledge/workflow.md` (new).
- `tools/installer/version-check.js` (new).
- Edits to `wize-dev-story`, `wize-quick-dev`, `wize-tea-review`, `wize-tea-gate`, `wize-help` skill, `wize-document-project`, `tools/installer/wize-cli.js`.

## [0.2.1] — 2026-06-11

Focused polish: brownfield baseline finally runs end-to-end through a detected harness CLI, CI publishes without the deprecated-config warning, and every release is now smoke-tested before going up.

### Added

- **Brownfield baseline runs real now.** When the installer detects existing code and you accept the `Run wize-document-project?` prompt, it now scans your PATH for an AI harness CLI (Claude Code, then Codex, then OpenCode), prioritizes whichever you selected as an IDE target, asks you to confirm the headless invocation, and spawns it with the right flags (`claude -p`, `codex exec`, `opencode run`). If no harness CLI is on PATH, the installer prints the exact command you can run later in your IDE. Set `WIZE_SKIP_BASELINE=1` to disable the headless run entirely (used by CI and unattended setups).
- `tools/installer/baseline.js` — exports `detectHarnessCli`, `runHeadlessBaseline`, `manualInstructions`, `defaultPrompt`. Self-contained, no extra deps; uses a manual PATH walk for hermetic, cross-platform detection.
- 7 new unit tests covering detection priority, PATH isolation, the skip-baseline env, and instruction strings.

### Fixed

- CI publish workflow now strips the deprecated `always-auth=false` line from the runner's `.npmrc` before installing. Removes the `npm warn Unknown user config "always-auth"` noise that appeared in every 0.2.0 publish log. See actions/setup-node#1129.

### Added — CI

- **Smoke E2E before publish.** The workflow now packs the tarball, installs it in a temp git repo via `npx`, and asserts that `.wize/`, the Claude adapter SKILL.md, generic AGENTS-equivalent, `kit_version` in `project.toml`, `update`, and `agent list` all work — exactly like a user would experience. Fails the release if anything is off, so we never publish a broken tarball again.
- Sets `WIZE_SKIP_BASELINE=1` in the smoke step so the harness-run prompt doesn't try to spawn `claude` inside GitHub's runner.

### Tests

- Total now **94 passing** (was 87 in 0.2.0).

## [0.2.0] — 2026-06-11

First release that delivers the lifecycle end-to-end. Workflows have real bodies; CLI commands work for real; the team has a Walkthrough to follow.

### Added — CLI

- **`wize-dev-kit update`** — refreshes an installed kit to the version resolved by `node_modules/wize-dev-kit`. Re-runs every active IDE adapter, preserves `.wize/config/user.toml`, re-applies the suggested `.gitignore` block, and writes the new `kit_version` into `.wize/config/project.toml`. Prints the relevant CHANGELOG excerpt between the previous and current version.
- **`wize-dev-kit sync`** — re-renders adapter outputs for whatever `ide_targets` the project opted into. Cheap idempotent call after editing config or running `agent create`.
- **`wize-dev-kit agent list`** — lists every built-in agent (9) plus any custom or override agents the project added.
- **`wize-dev-kit agent create`** — interactive scaffold of a new custom agent. Validates `code` shape, checks for collisions with built-ins, does a dry-run write+read, then persists to `.wize/custom/agents/{code}/{agent.yaml, persona.md}`. Non-TTY callers can pass a spec via API (`fromSpec`).
- **`wize-dev-kit agent edit <code>`** — writes a `customize.toml` override for an existing built-in agent into `.wize/custom/agents/{code}/`.

### Added — UX

- **End-of-install message** now ends with: "Restart your IDE — many harnesses load skills only at startup." plus a quick-reference to the new CLI commands (`update`, `sync`, `agent list`).
- **README walkthrough** — a complete end-to-end slash-command map from `/wize-orchestrator` through `/wize-tea-gate`, plus a new "CLI commands" reference section.

### Changed — workflows now have real bodies

22 workflows that were ≈ 30–50-line stubs in 0.1.x now ship 100–250 lines of working method, examples, anti-patterns, and YAML schemas. Tone aligned with the 0.1.5 playbooks (dense, opinionated, citable).

- **Analysis (Pepper):** `wize-product-brief`, `wize-trigger-map`, `wize-research`, `wize-prfaq`, `wize-document-project`.
- **Plan (Maria Hill + Mantis):** `wize-create-prd`, `wize-validate-prd`, `wize-ux-scenarios`, `wize-ux-design`.
- **Strategy + Solutioning (Fury + Tony + Mantis):** `wize-tech-vision`, `wize-nfr-principles`, `wize-create-architecture`, `wize-design-system`, `wize-create-epics-and-stories`, `wize-check-implementation-readiness`.
- **TEA gates (Hawkeye):** `wize-tea-risk`, `wize-tea-design`, `wize-tea-trace`, `wize-tea-nfr`, `wize-tea-review`, `wize-tea-gate` — each with canonical YAML frontmatter + concrete examples.
- **Implementation (Shuri + Hill + Wizer):** `wize-create-story`, `wize-dev-story`, `wize-quick-dev`, `wize-sprint-planning`, `wize-sprint-status`, `wize-retrospective`, `wize-code-review`.

### Added — engineering

- `tools/installer/commands/{update,sync,agent}.js` — modular command implementations with a minimal TOML reader for the `project.toml` subset.
- `test/cli-commands.test.js` — coverage for update / sync / agent list / agent create / agent edit (10 tests).
- `test/workflow-bodies.test.js` — guards that every workflow.md has ≥ 1.5 KB body and ≥ 4 H2 sections, with an explicit allow-list for intentionally short workflows (overlay scaffolds, builder helpers, orchestrator helpers).
- Test count: **87 passing** (was 33).

### Notes

This release closes JTBD backlog categories 3 (CLI commands real) and 2 (workflows with body) plus 4 (end-of-install UX, README walkthrough). Categories 5 (CI hygiene incl. smoke E2E) and 6 (monorepo routing, TEA enforcing helper) remain on the roadmap.

## [0.1.5] — 2026-06-01

### Added — promises kept

All files that previous releases declared in `module.yaml` but never shipped are now in the kit, with real content (not placeholders).

**Web overlay playbooks** (`src/web-overlay/playbooks/`):

- `wcag-aa.md` — WCAG 2.2 AA checklist for Mantis, with the newer SCs (2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8) and an audit toolchain.
- `responsive-breakpoints.md` — mobile-first stack with container queries, fluid typography (`clamp`), layout primitives (Stack/Cluster/Switcher/Sidebar/Grid/Cover/Frame), image strategy.
- `semantic-html.md` — landmarks, headings, the 12 must-reach-first elements, ARIA rules, common widget patterns with minimum ARIA, anti-patterns.
- `playwright-vitest.md` — Hawkeye's split (70/20/10), Vitest + Testing Library + MSW setup, Playwright POM pattern, selector hierarchy (role → label → text → testid), CI sketch, anti-patterns.
- `web-perf-budgets.md` — Core Web Vitals targets, baseline budgets per resource class, image/font strategy, third-party audit checklist, critical rendering path snippet, lighthouse-ci config, field measurement via `web-vitals` beacon.

**App overlay playbooks** (`src/app-overlay/playbooks/`):

- `apple-hig.md` — POUR-equivalent four principles, layout (status bar/nav/tab/safe-area), navigation patterns, SF Symbols, Dynamic Type, motion, common idioms, iPad specifics, do-not list.
- `material-design-3.md` — pillars, color/type/shape tokens, elevation-by-color, component starter set, adaptive windows (Compact/Medium/Expanded/Large), motion + reduced motion, Material You theming.
- `touch-targets-and-gestures.md` — minimums per platform (iOS 44pt / Android 48dp / web 24px), hit-area snippets per stack, thumb reach zones, reserved gestures, multi-touch, drag-and-drop with keyboard fallback, haptics, reduce-motion.
- `permissions-ux.md` — the four states (not-determined/granted/denied/limited), pre-flight pattern, per-permission guidance (camera/photos/location/notifications/contacts/BLE/health/tracking), denied-state UI + Settings deep-link, copy template.
- `detox-maestro.md` — when to pick each, Maestro YAML + cloud, Detox config + `testID` discipline, cross-platform CI sketch, flakiness rules, critical journeys to cover.
- `mobile-perf-budgets.md` — cold/warm start, TTI, FPS, jank, app size, memory, battery; per-platform targets; size reductions that work; build-time + field measurement.
- `device-matrix.md` — three buckets (floor/volume/ceiling), 2026 iOS + Android matrices, cloud farm comparison, accessibility runs, network conditions, locale coverage.

**Stack catalogs**:

- `src/web-overlay/stack-catalog.md` — Tony's reference for the web architecture interview: frameworks (Next/Nuxt/SvelteKit/Astro/Remix/SPA/Laravel-Inertia), back-end (Supabase/PlanetScale/Drizzle/Prisma/tRPC/GraphQL), auth, hosting, styling, state, forms; ADR record path.
- `src/app-overlay/stack-catalog.md` — Tony's mobile architecture reference: frameworks (RN+Expo / RN bare / Flutter / SwiftUI / Compose / Compose-Multiplatform / Capacitor / native+KMP), build & release, auth, data/sync, state, storage, push, analytics, anti-patterns; ADR record path.

### Added — tests

- `test/playbooks-and-catalogs.test.js`: guards that every playbook declared in an overlay `module.yaml` exists on disk, has frontmatter, and is non-trivial (> 400 chars). Stack catalog presence + size also asserted. Total tests now: **39** (was 33).

### Notes

This release closes Category 1 of the backlog ("promessas vazias"). Categories 2–6 (workflow bodies, `update`/`sync`/`agent create` CLI, polish, Node-24 CI, OIDC return, monorepo & TEA-enforcing) remain on the roadmap.

## [0.1.4] — 2026-06-01

### Added

- **`user_name` prompt at install time.** The installer asks "How should the agents call you?" (default = `$USER`), and persists the answer to `.wize/config/user.toml` under `[user] name`. Wizer and `wize-help` read this file and greet the user by name (e.g., *"Welcome back, [USER_NAME]. {project} — {profiles}. Next: …"*).
- **Opt-in suggested `.gitignore` block.** The installer asks whether to apply the suggested entries. When accepted, an idempotent block is injected between `# >>> wize-dev-kit (managed) >>>` and `# <<< wize-dev-kit (managed) <<<` markers covering: per-developer files (`user.toml`, `scratch/`, `.local/`, `quick-dev-log.md`) and the generated IDE adapter outputs (`.claude/skills/wize-*`, `.agent/skills/wize-*`, `.cursor/rules/wize-*.mdc`, etc.). Re-running install only updates lines between the markers; everything outside is untouched. Declining keeps `.gitignore` exactly as it was.
- `tools/installer/setup-helpers.js`: pure-ish helpers for `applyGitignore()` (create / append / replace / unchanged) and `generateUserToml()`.
- 8 new unit tests covering gitignore idempotency (create, append, idempotent re-run, stale-block replace, dry-run) and user.toml generation (name, escaping, optional role). Total: 33 passing.

### Changed

- Wizer (orchestrator) persona and `wize-help` skill now instruct the agent to read `.wize/config/user.toml` and use `[user] name` when greeting.
- `project.toml` template comment clarifies "personal preferences live in user.toml".

### Recommended layout (for a team repo)

Commit: `.wize/config/project.toml`, `.wize/config/tea.toml`, `.wize/planning/`, `.wize/solutioning/`, `.wize/implementation/tea/`, `.wize/implementation/retrospective/`, `.wize/knowledge/`, `.wize/custom/`, `AGENTS.md`.
Ignore (handled by the suggested block): `.wize/config/user.toml`, `.wize/scratch/`, `.wize/.local/`, `.wize/implementation/quick-dev-log.md`, and all generated adapter outputs (each developer runs `npx wize-dev-kit install` for their own IDE target).

## [0.1.3] — 2026-06-01

### Added

- **All 9 IDE adapters now ship real renderers** (previously 8 of them were stub printers). Each adapter writes files at the canonical path each harness expects:
  - **Claude Code** → `.claude/skills/wize-{code}/SKILL.md`
  - **Antigravity (Google)** → `.agent/skills/wize-{code}/SKILL.md` (singular `.agent`; `.antigravitycli/` is the CLI's own state and is left untouched)
  - **OpenAI Codex CLI** → `.agents/skills/wize-{code}/SKILL.md`
  - **Moonshot Kimi Code** → `.kimi/skills/wize-{code}/SKILL.md`
  - **Cursor** → `.cursor/rules/wize-{code}.mdc` (with `description`, `globs`, `alwaysApply` frontmatter)
  - **Windsurf (Codeium)** → `.windsurf/rules/wize-{code}.md`
  - **Continue.dev** → `.continue/prompts/wize-{code}.prompt` (`invokable: true` → slash command)
  - **OpenCode (sst/opencode)** → `.opencode/agents/wize-{code}.md` (personas, with `mode: primary` for Wizer and `mode: subagent` for the others) + `.opencode/commands/wize-{code}.md` (workflows/skills as slash commands)
  - **Generic fallback** → `.wize/agents/wize-{code}.md` + a root `AGENTS.md` baseline (read by Codex, Cursor, Windsurf and Antigravity even without their dedicated adapter)
- New shared module `tools/installer/render-shared.js` centralizes kit traversal, asset parsing, and the Anthropic-style SKILL.md emitter reused by Claude Code, Antigravity, Codex and Kimi adapters.
- Adapter test suite expanded from 12 → 25 passing tests, with one sanity test per adapter plus format-specific checks (Cursor frontmatter shape, Continue `invokable: true`, OpenCode primary/subagent mode split, generic AGENTS.md emission).

### Fixed

- Antigravity adapter previously created/touched nothing useful. It now emits skills at the correct location (`.agent/skills/`) and explicitly avoids `.antigravitycli/` (CLI state, owned by the Antigravity CLI itself).

### Notes

- Several harnesses inject custom skills at session startup; you may need to restart the IDE after `wize-dev-kit install` for slash commands to appear.

## [0.1.2] — 2026-05-31

### Added

- **Claude Code adapter is now functional.** `npx wize-dev-kit install` (when `claude-code` is selected as IDE target) generates `.claude/skills/wize-*/SKILL.md` for every agent, workflow and skill in the kit. Each SKILL.md uses the Claude Code skill frontmatter so the slash menu picks up `/wize-orchestrator`, `/wize-product-brief`, `/wize-create-prd`, `/wize-tea-gate`, etc.
- **`wize-help` reworked as an orchestrator-aware skill.** Moved from `core-skills/` to `orchestrator-skills/`. The skill instructs Wizer to read `.wize/config/project.toml` plus the state of `.wize/planning/`, `.wize/solutioning/`, `.wize/implementation/` and reply with a phase-aware "what to do next" answer. Four modes: default, `next`, `status`, `personas`.
- **Interactive prompts in the installer.** Profile and IDE-target selection now use arrow-keys + space (checkbox) via the `prompts` dependency. Non-TTY environments fall back to the previous number-based prompt automatically (preserves CI scriptability).
- Adapter test suite (`test/adapter-claude-code.test.js`) covering: per-agent SKILL.md emission, overlay-gate behavior (core-only vs full), `wize-help` content checks, dry-run safety.

### Changed

- Profile gating now lives inside the Claude Code adapter: overlay workflows (`wize-web-*`, `wize-app-*`) are only emitted when the corresponding overlay is in the selected profiles.

### Dependencies

- Added `prompts@^2.4.2` (1 sub-dependency, ~5 KB). Only used by the interactive installer; not bundled into the kit's runtime artifacts.

## [0.1.1] — 2026-05-31

### Changed

- `README.md`: `Install` section now appears right after the badges (was buried in the middle).
- `ROSTER.md`: rewritten entirely in English; Wizer's motto no longer references a personal name — now reads "I know the qwize methodology, I know the project — I activate the right agent."
- Installer: now asks **two** language questions separately (BMAD parity):
  - **Communication language** — how agents talk to you in chat.
  - **Document output language** — language used in generated files (`brief.md`, `prd.md`, `architecture.md`, gates, etc.).
  - Both stored under `[language]` in `.wize/config/project.toml`.
  - Includes a curated catalog of common BCP-47 codes (en, pt-BR, pt-PT, es, fr, de, it, zh-CN, ja, vi) with free-text fallback for any other locale.
- `package.json`: corrected `repository`, `homepage`, `bugs` to point at `qwize-br/wize-development-kit` (was `qwize/wize-dev-kit`).
- `package.json`: added `prepublishOnly` running tests + structural validators.

### Added

- `.github/workflows/publish.yml`: GitHub Actions workflow that publishes to npm on tag push (`v*`) using **Trusted Publishing** (OIDC). No long-lived `NPM_TOKEN` secret. Emits `--provenance` attestation.

## [0.1.0] — 2026-05-31

### Added

- Initial skeleton (v0.1.0 scaffold).
- 9-persona Marvel roster: Wizer, Pepper Potts, Peggy Carter, Maria Hill, Mantis, Nick Fury, Tony Stark, Hawkeye, Shuri.
- Three profile structure: Wize Dev Core + Wize Web Dev overlay + Wize App Development overlay.
- Test Architect (Hawkeye) with 6 canonical gates: risk, design, trace, nfr, review, gate.
- Whiteport Design Studio embedded: Pepper absorbs Saga (Analyst), Mantis absorbs Freya (Designer).
- Agent Builder skill set: `wize-create-agent`, `wize-create-skill`, `wize-create-workflow`.
- Multi-IDE adapters: Claude Code, Cursor, Windsurf, Codex, Continue, Kimi Code, OpenCode, Antigravity, generic fallback.
- Installer CLI skeleton with greenfield/brownfield detection.

### References

- Inspired by [BMAD Method v6.8.0](https://github.com/bmad-code-org/BMAD-METHOD).
- WDS module inspired by [bmad-method-wds-expansion](https://github.com/bmad-code-org/bmad-method-wds-expansion).

[Unreleased]: https://github.com/qwize-br/wize-development-kit/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/qwize-br/wize-development-kit/compare/v0.2.5...v0.3.0
[0.2.5]: https://github.com/qwize-br/wize-development-kit/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/qwize-br/wize-development-kit/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/qwize-br/wize-development-kit/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/qwize-br/wize-development-kit/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/qwize-br/wize-development-kit/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.5...v0.2.0
[0.1.5]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/qwize-br/wize-development-kit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/qwize-br/wize-development-kit/releases/tag/v0.1.0
