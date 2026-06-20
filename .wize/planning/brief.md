---
status: ready-for-prd
owner: Pepper Potts
created: 2026-06-16
feature: security-overlay
---

# Brief — wize-dev-kit · `security-overlay` (AI Pentester)

## Vision
Um desenvolvedor instala o `security-overlay` com `npx wize-dev-kit install`, escolhe o perfil, e passa a ter um pentester de IA file-first que roda **dentro do harness que ele já usa** (Claude Code, Cursor, Codex…) — sem binário ou runtime próprio. Ele entrega o pipeline de uma plataforma como o Shannon (recon → enumerate → exploit → report), cobrindo tanto o **código** (SAST) quanto a **aplicação rodando** (DAST), usando skills que empacotam `scripts/` que o agente executa via Bash sobre ferramentas locais.

## Audience
- **Primary:** Desenvolvedor/AppSec autorizado fazendo pentest do próprio projeto — JTBD: "encontrar e provar vulnerabilidades exploráveis no meu app/código antes do atacante, sem montar um stack de pentest do zero."
- **Secondary:**
  - Dev sem background de segurança que quer um security review guiado e acionável no PR.
  - Pentester profissional que quer acelerar recon/enumeração e gerar relatório padronizado.
- **Stakeholders:** Mantenedores do wize-dev-kit (consistência com `core`/`web`/`app` overlays); time de produto Qwize (posicionamento "AI OS de desenvolvimento seguro"); usuários dos overlays `web`/`app` (alvo natural do pentest).

## Success criteria
1. `security-overlay` é selecionável no instalador e renderiza skills+scripts+agente(s) para os ≥3 harnesses já suportados (claude-code, cursor, codex) — instalação verde no `npm run validate`.
2. O pipeline produz relatório versionado: cada **fase** emite seu `.md` parcial e a `wize-sec-report` consolida o final em `.wize/security/report.md` **+ `report.html`** — findings com severidade CVSS v3.1 + tag OWASP (badge colorido no HTML) e PoC/evidência por finding. O HTML é **single-file self-contained** (CSS inline, zero CDN/build, abre offline), renderizado por script bundled (`wize-sec-report/scripts/render-report`), reusando os playbooks `semantic-html` + `wcag-aa` do web-overlay como guia de qualidade/acessibilidade. **Sem `npm install` de framework frontend** — template estático + script de conversão, para honrar o "zero runtime próprio".
3. Cobertura mínima na v1: SAST de secrets + dependências vulneráveis + ≥6 categorias OWASP Top 10 no DAST de um alvo web.
4. **Zero runtime próprio:** todo o "cérebro" é o harness do usuário; as únicas dependências externas são ferramentas de pentest locais, detectadas e reportadas como ausentes (não instaladas silenciosamente).
5. Guardrail de escopo ativo: o pipeline recusa execução contra qualquer host/URL fora do arquivo de escopo assinado pelo usuário (teste automatizado cobre a recusa).

## Non-goals
- Não reimplementar o orquestrador multi-agente do Shannon como runtime próprio (decisão já tomada: file-first sobre o harness).
- Não instalar/baixar ferramentas ofensivas automaticamente (nmap, nuclei, sqlmap, ffuf…). O overlay assume/detecta; quem instala é o usuário.
- Não fazer pentest de infraestrutura de terceiros, cloud accounts ou rede corporativa na v1 — escopo é o app/código do próprio projeto.
- Não ser scanner contínuo em CI na v1 (pode virar epic futuro).
- Não substituir o `wize-code-review`/TEA existentes — integra, não duplica.

## Constraints
- **Deadline:** sem data dura; entra como novo epic no roadmap do kit (pós-0.4.1).
- **Budget:** dentro do esforço normal de manutenção do kit; sem custo de infra (roda local no harness do usuário).
- **Compliance / legal:** ferramenta dual-use. Guardrail de autorização **decidido**: gate de escopo em `.wize/security/scope.md` (allowlist de hosts/URLs/paths com aceite assinado) verificado por fase, **+ dry-run/passivo como default** — exploit ativo só com flag explícita. Disclaimer de uso autorizado no install. LGPD/GDPR: relatórios ficam locais, nunca enviados a serviço externo.
- **Integrations / ferramentas v1 (decidido — kit amplo):** recon `nmap`; secrets `gitleaks`; deps `osv-scanner`/`grype`; DAST `nuclei`, `nikto`, `sqlmap`; fuzz `ffuf`. Detectadas, nunca auto-instaladas. **Ferramenta ausente → degrada a fase: reporta no relatório e pula só aquela checagem; pipeline continua.** Deve compor com `web-overlay`/`app-overlay` (alvo do DAST) e com TEA.
- **Arquitetura:** seguir o trilho de overlay existente — `PROFILES` em `tools/installer/wize-cli.js`, frontmatter `overlay:` filtrado em `render-shared.js`, hints em `onboarding.js`. Skills com `scripts/` empacotados executados pelo agente.

## Open questions
- [x] **(blocker — RESOLVIDO)** Autorização/escopo: `.wize/security/scope.md` (allowlist assinada) verificado por fase + **dry-run default**, exploit ativo só com flag explícita. — *decidido por André, 2026-06-17*
- [x] **(blocker — RESOLVIDO)** Ferramentas v1: **kit amplo** (nmap, gitleaks, osv-scanner/grype, nuclei, nikto, sqlmap, ffuf); ausência **degrada a fase** (reporta e pula, pipeline continua). — *decidido por André, 2026-06-17*
- [x] **(important — RESOLVIDO)** Alvo vivo do DAST: declarado num campo do próprio `.wize/security/scope.md` (fonte única, mesmo gate de escopo). — *decidido por André, 2026-06-17*
- [x] **(important — RESOLVIDO)** Fases → skills: **1 skill por fase** (`wize-sec-recon`, `wize-sec-enumerate`, `wize-sec-exploit`, `wize-sec-report`) **+ orquestradora** `wize-sec-pentest` que encadeia. — *decidido por André, 2026-06-17*
- [x] **(important — RESOLVIDO)** Persona: **novo agente red-teamer** dono do pipeline; Hawkeye/TEA pode colaborar na validação de findings/gate (a confirmar na arquitetura). — *decidido por André, 2026-06-17*
- [x] **(nice-to-know — RESOLVIDO)** Severidade no relatório: **CVSS v3.1 + tag OWASP** por finding. — *decidido por André, 2026-06-17*
- [x] **(nice-to-know — RESOLVIDO)** Disclaimer de uso autorizado exibido no install do overlay: **sim**. — *default aceito, 2026-06-17*
