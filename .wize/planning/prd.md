---
status: validated
owner: Maria Hill
created: 2026-06-17
feature: security-overlay
brief: .wize/planning/brief.md
---

# PRD — wize-dev-kit · `security-overlay` (AI Pentester)

> **Nota:** Este PRD captura o snapshot de planejamento do security-overlay 0.6.0 (2026-06-17) e antecede o E08 (preflight) e a feature de post-scan/security-backlog — ambos adicionados após a validação.

> Sem trigger-map (decisão de Fase 1: overlay técnico, personas já claras no brief). As goals referenciam itens de escopo diretamente.

## Goals
1. **Pacote instalável.** `security-overlay` selecionável no instalador e renderizado para ≥3 harnesses (claude-code, cursor, codex) com `npm run validate` verde. (métrica: validators passam + smoke install; deadline: fim do epic E01)
2. **Pipeline file-first completo.** Usuário roda recon→enumerate→exploit→report no próprio harness e obtém findings acionáveis, sem runtime próprio. (métrica: pipeline produz `report.md`+`report.html` num projeto-alvo de teste; escopo: E03–E07)
3. **Cobertura v1.** SAST (secrets + deps vulneráveis) + DAST com ≥6 categorias OWASP Top 10 sobre um alvo web autorizado. (métrica: nº de categorias cobertas ≥6; escopo: E05–E06)
4. **Segurança por padrão.** Nenhuma ação ofensiva executa contra alvo fora do `scope.md`; exploit ativo só com flag explícita; default dry-run/passivo. (métrica: teste automatizado de recusa passa; escopo: E02)
5. **Relatório apresentável.** Final em `.md` + `.html` single-file self-contained (offline, CSS inline, badges CVSS/OWASP). (métrica: HTML abre sem rede e valida semantic-html/wcag-aa; escopo: E07)

## Scope

### In scope
- **Empacotamento como overlay** — entrada em `PROFILES` (`wize-cli.js`), frontmatter `overlay: security` filtrado em `render-shared.js`, hint em `onboarding.js`, disclaimer de uso autorizado no install.
- **Gate de escopo `.wize/security/scope.md`** — allowlist assinada de hosts/URLs/paths + URL do alvo DAST; verificação por fase antes de qualquer disparo; dry-run/passivo default; exploit ativo só com flag explícita (`--active`/equivalente).
- **Persona red-teamer** — novo agente dono do pipeline; Hawkeye/TEA colabora na validação de findings/gate.
- **Skills por fase + orquestradora** — `wize-sec-recon`, `wize-sec-enumerate`, `wize-sec-exploit`, `wize-sec-report` + `wize-sec-pentest` (encadeia todas). Cada uma roda sozinha.
- **SAST** — secrets (gitleaks) + deps vulneráveis (osv-scanner/grype).
- **DAST** — nmap (recon), nuclei + nikto (scan), ffuf (fuzz), sqlmap (injection) contra alvo autorizado.
- **Detecção de ferramentas** — checa presença; ausente → reporta no relatório e degrada só aquela checagem; pipeline continua. Nunca auto-instala.
- **Relatório** — `.md` parcial por fase + final consolidado `.md`+`.html` self-contained, findings com CVSS v3.1 + tag OWASP e PoC/evidência. Render via `wize-sec-report/scripts/render-report`, reusando playbooks `semantic-html`/`wcag-aa`.

### Out of scope
- Orquestrador multi-agente como runtime próprio (estilo Shannon) — *not us: decisão file-first.*
- Auto-instalação de ferramentas ofensivas — *not now: risco + fricção; usuário instala.*
- Pentest de infra de terceiros, cloud accounts, rede corporativa — *not now: escopo v1 é o próprio projeto.*
- Scanner contínuo em CI/agendado — *not yet: epic futuro.*
- Stack frontend instalado para o relatório (build/npm) — *not us: fere "zero runtime próprio".*
- Substituir `wize-code-review`/TEA — *not us: integra, não duplica.*
- Locales além de pt-BR/en no relatório — *not now.*

## Backbone (coarse stories)
- **E01:** Como mantenedor do kit, quero o `security-overlay` instalável e renderizável, para que o usuário o selecione no install.
- **E02:** Como usuário autorizado, quero declarar meu escopo num `scope.md` assinado, para que o pentester nunca ataque alvo não autorizado.
- **E03:** Como usuário, quero a persona red-teamer + orquestradora `wize-sec-pentest`, para rodar o pipeline ponta-a-ponta no meu harness.
- **E04:** Como usuário, quero recon+enumeração (nmap) do alvo autorizado, para mapear superfície antes de testar.
- **E05:** Como dev de AppSec, quero SAST de secrets e deps, para achar vulnerabilidades no código sem app rodando.
- **E06:** Como usuário, quero DAST (nuclei/nikto/sqlmap/ffuf) com exploit gated, para provar vulnerabilidades no app rodando.
- **E07:** Como usuário, quero relatório `.md`+`.html` consolidado por fase e final, para apresentar findings dentro e fora da máquina.

> Nota (pós-validação): o E08 (preflight — detecção de OS/arch + package-manager + geração de install-script) e a saída de post-scan security-backlog foram adicionados após a validação deste PRD.

## Acceptance criteria

### E01 — Empacotamento do overlay
- **AC-E01-1:** Dado o instalador, Quando o usuário lista perfis, Então `security-overlay` aparece como opção não-obrigatória (`PROFILES` em `wize-cli.js`).
- **AC-E01-2:** Dado `security-overlay` selecionado, Quando o install renderiza, Então só skills com frontmatter `overlay: security` (e core) são emitidas; sem ele, nenhuma skill `sec-*` aparece (`render-shared.js`).
- **AC-E01-3:** Dado o overlay instalado, Quando roda `npm run validate`, Então passa sem erros para claude-code, cursor e codex.
- **AC-E01-4:** Dado o install do overlay, Quando conclui, Então exibe disclaimer de uso autorizado e grava `profiles=[…, "security-overlay"]` no `project.toml`.
- **AC-E01-5:** Dado `onboarding.js`, Quando o overlay está ativo, Então mostra hint `→ /wize-sec-pentest (overlay)`.

### E02 — Gate de escopo & autorização
- **AC-E02-1:** Dada ausência de `.wize/security/scope.md`, Quando qualquer skill `sec-*` inicia, Então aborta com instrução para criar/assinar o escopo.
- **AC-E02-2:** Dado um alvo (host/URL/path) fora da allowlist do `scope.md`, Quando uma fase tenta agir sobre ele, Então recusa e registra a recusa (sem executar a ferramenta).
- **AC-E02-3:** Dado `scope.md` sem aceite/assinatura, Quando o pipeline inicia, Então recusa até o aceite estar presente.
- **AC-E02-4:** Dado o default, Quando uma fase ofensiva roda, Então opera em modo dry-run/passivo; ações ativas/exploração só executam com a flag explícita.
- **AC-E02-5:** Dado um teste automatizado, Quando alvo fora de escopo é solicitado, Então o teste confirma a recusa (cobre criterion #4 do brief).

### E03 — Persona red-teamer & orquestradora
- **AC-E03-1:** Dado o overlay, Quando instalado, Então existe um agente red-teamer com persona/identidade próprios no roster do harness.
- **AC-E03-2:** Dado `wize-sec-pentest`, Quando invocada, Então encadeia recon→enumerate→exploit→report respeitando o gate de E02 em cada fase.
- **AC-E03-3:** Dada cada skill de fase, Quando invocada isoladamente, Então roda sozinha e produz seu `.md` parcial.
- **AC-E03-4:** Dado um finding gerado, Quando o pipeline finaliza, Então Hawkeye/TEA pode revisar/validar antes do gate (handoff definido).

### E04 — Recon & enumeração
- **AC-E04-1:** Dado um alvo na allowlist, Quando `wize-sec-recon` roda, Então executa nmap em modo permitido e grava `recon.md` com portas/serviços.
- **AC-E04-2:** Dado nmap ausente, Quando a fase roda, Então reporta a ausência no parcial e pula a checagem (não aborta o pipeline).
- **AC-E04-3:** Dado `wize-sec-enumerate`, Quando roda, Então enumera superfície (endpoints/tech) e grava `enumerate.md` referenciando o recon.

### E05 — SAST
- **AC-E05-1:** Dado o repo do projeto, Quando `wize-sec-recon`/SAST roda gitleaks, Então lista secrets com arquivo+linha (sem vazar o valor no HTML público).
- **AC-E05-2:** Dado o manifesto de deps, Quando roda osv-scanner/grype, Então lista deps vulneráveis com CVE + severidade.
- **AC-E05-3:** Dada ferramenta SAST ausente, Quando a fase roda, Então degrada só aquela checagem e segue.

### E06 — DAST
- **AC-E06-1:** Dado o alvo DAST do `scope.md`, Quando o DAST roda em dry-run, Então nuclei/nikto executam apenas checagens passivas/seguras e gravam findings.
- **AC-E06-2:** Dada a flag de exploit ativo, Quando o usuário a passa, Então sqlmap/ffuf rodam contra o alvo autorizado e anexam PoC.
- **AC-E06-3:** Dado o resultado DAST, Quando consolidado, Então cobre ≥6 categorias OWASP Top 10.
- **AC-E06-4:** Dada ferramenta DAST ausente, Quando a fase roda, Então degrada só aquela checagem e segue.

### E07 — Relatório
- **AC-E07-1:** Dada cada fase, Quando conclui, Então grava seu `.md` parcial em `.wize/security/`.
- **AC-E07-2:** Dado o fim do pipeline, Quando `wize-sec-report` roda, Então consolida `report.md` + `report.html` em `.wize/security/`.
- **AC-E07-3:** Dado `report.html`, Quando aberto sem rede, Então renderiza completo (CSS inline, sem CDN/build).
- **AC-E07-4:** Dado cada finding, Quando exibido, Então tem score CVSS v3.1 + tag OWASP (badge colorido no HTML) e PoC/evidência.
- **AC-E07-5:** Dado o `report.html`, Quando auditado, Então respeita os playbooks `semantic-html` e `wcag-aa` (sem violações bloqueantes).
- **AC-E07-6:** Dado o relatório, Quando gerado, Então fica 100% local — nada é enviado a serviço externo.

## Constraints
- **Deadline:** sem data dura; novo epic pós-0.4.1.
- **Budget:** esforço normal de manutenção; sem custo de infra (roda local).
- **Compliance/legal:** ferramenta dual-use → gate de escopo + disclaimer obrigatórios; relatórios locais (LGPD/GDPR), nunca externos.
- **Arquitetura:** trilho de overlay existente (`PROFILES`, frontmatter `overlay:`, `render-shared.js`, `onboarding.js`); skills com `scripts/`; zero runtime/framework próprio.
- **Idioma:** comunicação e artefatos em pt-BR; relatório pt-BR/en.

## Assumptions
- A estrutura de skill suporta `scripts/` empacotados executáveis pelo agente via Bash. — *verificar: inspecionar 1 skill existente com scripts antes do E03.*
- Usuário tem as ferramentas de pentest instaladas ou aceita instalá-las. — *verificar: detecção implementada em E04–E06.*
- Single-file HTML com CSS inline atende a apresentação sem framework. — *verificar: protótipo de template no E07.*
- Os harnesses-alvo (claude-code/cursor/codex) executam Bash com permissão do usuário. — *verificar: já é premissa do kit.*

## Dependencies
- Playbooks `semantic-html`/`wcag-aa` do web-overlay (já existem) — consumidos pelo E07.
- Decisão de arquitetura sobre 1 skill por fase vs sub-agentes da orquestradora — Tony, no `wize-create-architecture`.

## NFR pointer
Sem `nfr-principles.md` ainda (Fury não rodou). Tightening específico deste overlay a registrar lá quando existir: (a) **isolamento** — nenhuma chamada de rede de saída exceto contra alvos do `scope.md`; (b) **segurança de dados** — relatórios e evidências nunca saem da máquina; (c) **fail-safe** — default passivo, ofensivo opt-in.

## Gate strategy (TEA / Hawkeye)
Política atual `advisory` (`.wize/config/tea.toml`). Gates relevantes ao overlay: `risk` once-after-architecture, `review`/`gate` per-story. Findings de segurança gerados pelo pipeline são insumo do red-teamer; o gate TEA valida as **stories de implementação do overlay**, não o resultado do pentest do usuário.

## Open questions
- [ ] (important) Formato exato do aceite/assinatura no `scope.md` (checkbox + timestamp? hash?) — *owner: Tony, by: arquitetura.*
- [ ] (important) `scripts/render-report` em Node, Python ou shell? (qual runtime já é garantido nos harnesses) — *owner: Tony, by: arquitetura.*
- [ ] (nice-to-know) Granularidade do exploit ativo: flag única vs por-fase/por-ferramenta — *owner: red-teamer/Tony, by: epics.*

## Validation log — 2026-06-17

**Status:** validated

**Signatories**
- Maria Hill (PM) — concerns: none. 30 ACs observáveis, INVEST ok no nível backbone (Tony fatia E03/E06).
- Pepper Potts (Analyst) — concern (aceito): goals não ancoram em trigger-map porque não há um; overlay técnico, personas claras no brief. Desvio documentado.
- Mantis (UX) — concerns: none. Única UI implicada é o `report.html` (E07); endereçável via playbooks `semantic-html`/`wcag-aa`.
- Fury (Solution Strategy) — concern: NFR pointer cita tightenings (isolamento de rede, dados locais, fail-safe) que devem entrar no `nfr-principles.md` quando ele rodar `wize-tech-vision`/`wize-nfr-principles`.
- Hawkeye (TEA preview) — concern resolvido: gate strategy adicionada (advisory; valida stories do overlay, não o pentest do usuário).

**Notes**
- Sem blockers. 3 open questions remanescentes são técnicas (formato de assinatura do scope.md; runtime do render-report; granularidade da flag de exploit) → resolvidas por Tony/Fury em Fase 2→3.
- Assumption fundadora ("skill suporta scripts/ executáveis") tem plano de verificação antes do E03 — mitiga risco a >30% do escopo.
