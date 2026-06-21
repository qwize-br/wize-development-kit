---
status: ready-for-prd
owner: Pepper Potts
created: 2026-06-21
feature: post-scan-planning
relates_to: security-overlay (v0.6.0)
---

# Brief — Post-Scan Planning (auto-sugestão de sprint de correção)

## Vision
Ao terminar um `wize-sec-pentest`, o desenvolvedor não fica com um relatório que só aponta problemas — ele recebe um **backlog de correção pronto** (epics + stories priorizadas por severidade/CVSS/OWASP) e o red-teamer o conduz, dentro do mesmo harness, a transformar esse backlog em uma sprint real via `wize-create-epics-and-stories`. O loop "achar → planejar a correção" fecha sem trabalho manual de tradução.

## Audience
- **Primary:** Desenvolvedor/AppSec que rodou o pentest — JTBD: "acabei de ver 100+ findings; quero sair daqui com um plano de correção priorizado e acionável, não com uma lista crua que eu tenho que traduzir em tarefas."
- **Secondary:**
  - Tech lead que precisa estimar/priorizar o esforço de remediação.
  - Vibecoder sem background de segurança que não sabe por onde começar a corrigir.
- **Stakeholders:** Mantenedores do wize-dev-kit (consistência overlay↔planejamento); time de produto Qwize (fecha o ciclo "AI OS de dev seguro"); usuários do security-overlay.

## Success criteria
1. Ao fim do `wize-sec-pentest`, é gravado `.wize/security/security-backlog.md` com epics/stories de correção derivados dos findings, cada story com severidade, CVSS, OWASP e referência ao finding de origem (rastreabilidade) — em ≤ 1 execução, sem edição manual.
2. O backlog agrupa findings por **tema de correção** (ex.: "rotacionar secrets", "atualizar deps vulneráveis", "hardening de headers") e ordena por prioridade P0/P1/P2 derivada da severidade — não 1 story por finding cru (97 secrets = 1 story de rotação, não 97).
3. O backlog é consumível por `wize-create-epics-and-stories` sem transformação: o red-teamer/agente aponta a skill para ele e gera as stories formais. Demonstrado end-to-end com os findings reais do sabia.
4. **Zero runtime próprio mantido + comando claro:** o overlay gera o artefato file-first e **imprime, ao fim do scan, um comando copiável e uma instrução de próximo passo** (ex.: `Próximo passo: rode /wize-create-epics-and-stories --from .wize/security/security-backlog.md`). O overlay não invoca skills; o usuário/agente executa o comando. O report HTML/MD também mostra esse call-to-action.
5. Rastreabilidade reversa: cada story gerada cita o(s) finding(s) que a originou, e fechar a story é verificável (re-rodar o scan e confirmar que o finding sumiu).

## Non-goals
- **Auto-corrigir** os findings (aplicar patches/rotacionar secrets sozinho) — fora do escopo; isto planeja a correção, não executa.
- Reimplementar `wize-create-epics-and-stories` — a feature **alimenta** essa skill, não a substitui.
- Priorização baseada em contexto de negócio (qual finding importa mais pro produto) — a v1 prioriza por severidade técnica; contexto de negócio é decisão humana na sprint planning.
- Integração com Jira/Linear/GitHub Issues — v1 é file-first (`.md`); exportadores ficam para epic futuro.
- Mudar o pipeline de scan em si (recon/SAST/DAST) — só o passo de planejamento pós-report.

## Constraints
- **Deadline:** sem data dura; sprint nova pós-v0.6.0.
- **Budget:** esforço normal de manutenção; sem custo de infra (roda local no harness).
- **Compliance/legal:** o backlog pode conter referências a findings sensíveis (caminhos, nomes de secrets redatados) → fica local em `.wize/security/`, nunca enviado a serviço externo (igual ao report).
- **Arquitetura:** seguir o trilho do security-overlay — Node built-ins, zero dep npm nova, file-first. O `security-backlog.md` deve ser um artefato de contrato estável (consumido por outra skill).
- **Integrations:** consome os parciais/report do scan (`recon.md`, `sast.md`, `dast.md`, findings classificados); produz para `wize-create-epics-and-stories`.

## Open questions
- [x] **(blocker — RESOLVIDO)** "Dispara automaticamente" = o report gera `security-backlog.md` **e imprime um comando claro + instrução de próximo passo** que o usuário/agente executa para rodar `wize-create-epics-and-stories` apontando para o backlog. O overlay Node NÃO invoca skills (preserva "zero runtime próprio"); a UX é "copie e cole / o agente roda este comando". — *decidido por André, 2026-06-21*
- [ ] **(important)** Agrupamento de findings → stories: por OWASP? por tema de correção? por arquivo/componente? Definir a taxonomia de agrupamento. — *owner: Tony + red-teamer*
- [ ] **(important)** O `security-backlog.md` é um formato novo ou reusa o template de epics/stories do kit? Definir o contrato que `wize-create-epics-and-stories` lê. — *owner: Tony*
- [ ] **(important)** Como mapear severidade → prioridade (P0/P1/P2) e → estimativa (S/M/L)? Regra determinística. — *owner: Hawkeye + Pepper*
- [ ] **(nice-to-know)** O backlog deve sugerir DoD por story (ex.: "re-rodar scan e confirmar finding ausente")? — *owner: Hawkeye*
- [ ] **(nice-to-know)** Reuso do `ai-insights.json` (o action plan P0/P1/P2 que o LLM já gera) como base do backlog? — *owner: red-teamer*
