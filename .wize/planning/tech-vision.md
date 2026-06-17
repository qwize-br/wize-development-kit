---
status: aligned
owner: Nick Fury
created: 2026-06-17
---

# Tech Vision — wize-dev-kit · `security-overlay` (AI Pentester)

> Adaptação do template canônico: este overlay é um **pacote file-first** (skills + agente + scripts) que roda no harness do usuário, sem deploy target. As decisões abaixo fixam o **envelope técnico** que Tony desenha dentro; o foco é o *shape* de runtime, não de aplicação web.

## Stack family
**File-first overlay sobre o harness do usuário.** Sem runtime próprio, sem framework, sem build pipeline do lado do overlay. A "execução" é o agente (no harness) despachando scripts Node embarcados na skill contra ferramentas de pentest externas via Bash. O artefato entregável ao usuário é `.md` + `.html` self-contained.

Inspiração: Shannon (orquestrador multi-agente dedicado) — **explicitamente rejeitada** em favor do trilho file-first do kit. Decisão já consolidada no brief.

## Runtime envelope
| Dimensão | Decisão |
|---|---|
| **Linguagem de record** | Node 20+ para scripts internos; Markdown frontmatter (YAML) para metadados de skill/agent; shell POSIX para o que não dá em Node |
| **Runtime garantido** | Node ≥20 (já exigido pelo `package.json` do kit) |
| **Runtime do render-report** | **Node 20, zero deps** (built-ins: `fs`, `path`, `string-template` via função pura). Resolve a open question #2. |
| **Persistência** | Arquivo: `.wize/security/scope.md` (gate) + `.wize/security/*.md` (parciais por fase) + `.wize/security/report.{md,html}` (final) |
| **Deploy target** | n/a — distribuído via `npm` como o kit atual |
| **Edge vs origin** | n/a — roda local na máquina do usuário |
| **Ferramentas de pentest** | nmap, gitleaks, osv-scanner/grype, nuclei, nikto, sqlmap, ffuf. **Detectadas via `which`/`command -v`; nunca auto-instaladas.** Ausência = degrada a fase, reporta no relatório, segue. |
| **Dependências npm** | **Nenhuma nova.** Os scripts rodam em Node puro (built-ins) — casa com o "zero runtime próprio" e elimina supply chain no overlay. |

## Build / buy / borrow
| Capacidade | Decisão |
|---|---|
| Gate de escopo (validação) | **Build** — script Node que parseia `scope.md` e expõe `assertTargetInScope(target)` para as skills. Sem lib externa. |
| Assinatura/aceite do `scope.md` | **Build** — frontmatter YAML com campo `accepted_by` + `accepted_at` (ISO-8601) + `sha256` do bloco de allowlist. Resolve open question #1. **Sem chave criptográfica externa** — hash é integridade local, não autenticação criptográfica (usuário assina; auditoria é por log/print). |
| Detecção de ferramentas | **Build** — script Node que checa `command -v` e expõe `{ name: present, version? }`. |
| Render `.md → .html` | **Build** — `wize-sec-report/scripts/render-report` (Node puro). Template HTML único com CSS inline. Sem `nunjucks`/`handlebars`/`ejs` — função de substituição mínima escrita à mão. |
| Geração de severidade CVSS | **Borrow (regra)** — implementar o cálculo do score a partir de vetor CVSS v3.1 (álgebra é determinística, ~20 linhas). Sem dependência externa. |
| Mapeamento OWASP Top 10 | **Borrow (tabela estática)** — arquivo `data/owasp-top10.json` embarcado na skill, sem rede. |
| Templates HTML/CSS | **Borrow** — reusar padrões do `web-overlay/playbooks/semantic-html.md` e `wcag-aa.md` como guia, não como lib. |
| Exploit ativo | **Build** — flag `--active` na invocação da skill (Fury decide abaixo sobre granularidade). |

## Non-negotiables
1. **Default passivo.** Nenhuma ferramenta ofensiva roda sem que (a) o alvo esteja no `scope.md` E (b) a flag explícita de ativo esteja presente. Sem exceção.
2. **Dados ficam na máquina.** Nenhuma chamada de rede de saída que não seja contra alvos do `scope.md`. Relatórios e evidências nunca saem do disco local. Sem telemetria.
3. **Auditoria de recusa.** Toda recusa (alvo fora do escopo, flag ausente, `scope.md` inválido) é registrada com timestamp + motivo no relatório e nunca falha em silêncio.
4. **Zero dependência npm nova no overlay.** Scripts em Node built-ins apenas. Qualquer dependência precisa ser re-justificada contra esse axioma.
5. **Não-negável herdado do kit:** `npm run validate` continua verde; o overlay não introduz falha de validação para os harnesses suportados.

> Se algum PRD goal conflitar com 1–3, Fury escala antes de Tony implementar.

## Decisões sobre as 3 open questions técnicas
1. **Assinatura do `scope.md`** — Frontmatter YAML: `accepted_by: <string>`, `accepted_at: <ISO-8601>`, `scope_sha256: <hex>`. Hash é **integridade**, não autenticação. Skill recusa iniciar sem esses três campos válidos.
2. **Runtime do `render-report`** — Node 20, zero dependência. Resolve a dor sem ampliar a base.
3. **Granularidade da flag de exploit ativo** — **Flag única `--active` no escopo da orquestradora `wize-sec-pentest` e/ou da skill de fase.** Skills individuais aceitam `--active` no input; a orquestradora propaga. Decisão deliberadamente simples: se a flag precisar ser per-ferramenta no futuro, refatora-se com a evidência (não agora).

## Deferred (com triggers)
- **Auth criptográfica do `scope.md` (chave/GPG).** Trigger: o overlay ganhar um modo "compartilhar relatório com terceiro" — antes disso, hash local basta.
- **Múltiplos `scope.md` por projeto** (um por ambiente). Trigger: aparecer a demanda de separar dev/staging/prod.
- **Suporte a webhooks de scan contínuo em CI.** Trigger: PRD goal explícito de "scanner agendado" (atualmente em Out of scope).
- **Plugins de ferramentas além do kit amplo da v1.** Trigger: relatório mostrar > 2 fases degradadas por ausência da mesma classe de ferramenta.

## Constraints que dirigiram isto
- PRD goal G2 (file-first) e G4 (segurança por padrão) → non-negotiable #1 + #2.
- PRD goal G5 (HTML self-contained) → decisão de zero-dep no `render-report`.
- Brief constraint (tooling dual-use) → gate de escopo obrigatório; non-negotiable #3.
- Princípio "zero runtime próprio" do kit → non-negotiable #4.
- Harnesstools (claude-code/cursor/codex) executam Bash com permissão do usuário → envelope de execução via Bash, com `command -v` para detecção.
- Open questions técnicas do PRD → resolvidas aqui em vez de empurrar pra arquitetura.

## Hand-off
> Tony: desenha a arquitetura dentro deste frame. Pontos críticos: (a) como `assertTargetInScope` é exposto/importado por todas as skills sem acoplamento; (b) formato exato do `scope.md` (frontmatter + body de allowlist) e como o agente o apresenta na primeira execução; (c) onde mora `data/owasp-top10.json` dentro da skill.
> Hill: nenhum PRD goal conflita com os non-negotiables.
> Hawkeye: gate `risk` once-after-architecture deve checar especialmente: zero-dep npm no overlay, e a presença do teste de recusa do gate de escopo.
