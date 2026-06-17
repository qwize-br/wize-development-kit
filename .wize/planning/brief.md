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
2. O pipeline produz um artefato de relatório versionado em `.wize/security/report.md` com findings classificados por severidade (CVSS ou OWASP) e PoC/evidência por finding.
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
- **Compliance / legal:** ferramenta dual-use. Exige guardrail de autorização explícito (arquivo de escopo) + disclaimer de uso autorizado. LGPD/GDPR: relatórios podem conter dados sensíveis → ficam locais, nunca enviados a serviço externo.
- **Integrations:** ferramentas de pentest locais via Bash (nmap, nuclei, ffuf, sqlmap, gitleaks/trufflehog, osv-scanner/grype…); deve compor com `web-overlay`/`app-overlay` (alvo do DAST) e com TEA.
- **Arquitetura:** seguir o trilho de overlay existente — `PROFILES` em `tools/installer/wize-cli.js`, frontmatter `overlay:` filtrado em `render-shared.js`, hints em `onboarding.js`. Skills com `scripts/` empacotados executados pelo agente.

## Open questions
- [ ] **(blocker)** Modelo de autorização/escopo: confirmar `.wize/security/scope.md` assinado pelo usuário como gate único; formato (lista de hosts/URLs/paths) e como o agente verifica antes de cada disparo ofensivo. — *owner: André (usuário) + Hawkeye (TEA)*
- [ ] **(blocker)** Conjunto mínimo de ferramentas locais assumidas na v1 e comportamento quando ausentes (degradar vs abortar a fase). — *owner: André*
- [ ] **(important)** Fronteira SAST vs DAST: o DAST exige app rodando + URL; como o usuário declara o alvo vivo (compor com `web/app-overlay`?). — *owner: Tony (arch) + André*
- [ ] **(important)** Mapa de fases do pipeline → skills: 1 skill por fase (recon/enumerate/exploit/report) ou 1 skill-orquestradora chamando sub-agentes? — *owner: Tony + Pepper*
- [ ] **(important)** Há persona/agente novo de segurança (ex.: um "red-teamer") ou Hawkeye/TEA absorve o papel? — *owner: Wizer*
- [ ] **(nice-to-know)** Esquema de severidade no relatório: CVSS v3.1 vs OWASP Risk Rating vs ambos. — *owner: André*
- [ ] **(nice-to-know)** Disclaimer/aceite de uso autorizado exibido no install do overlay? — *owner: mantenedores*
