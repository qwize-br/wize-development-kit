# GitHub Copilot — Wize Development Kit

🌐 **Idiomas:** [English](copilot.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

O GitHub Copilot lê dois tipos de customização de projeto, e o kit preenche os dois:

- **Agent skills** — `.github/skills/wize-{code}/SKILL.md`, seguindo o padrão aberto
  [Agent Skills](https://agentskills.io) (uma pasta por skill; frontmatter YAML com
  `name` + `description`).
- **Custom agents** — `.github/agents/wize-{code}.agent.md`, um por persona, com a
  persona como prompt.

## Saída

```
.github/
├── agents/     wize-orchestrator.agent.md, wize-agent-dev.agent.md, … (10 personas)
└── skills/     wize-grill/SKILL.md, wize-code-review/SKILL.md, … (workflows + skills)
```

Arquivos companheiros (`steps/`, `templates/`, `data/`, `*.csv`) são copiados ao
lado de cada `SKILL.md`, então workflows micro-file como `wize-create-architecture`
resolvem seus caminhos relativos.

## Destaques

- **Onde funciona.** Copilot cloud agent, Copilot code review, GitHub Copilot CLI,
  app do Copilot e agent mode no VS Code, JetBrains IDEs, Eclipse e Xcode. O Copilot
  descobre skills de projeto em `.github/skills/`, `.claude/skills/` ou
  `.agents/skills/` — este adapter escreve o caminho canônico `.github/skills/`.
- **Progressive disclosure.** No início da sessão só `name` + `description` são
  carregados; o `SKILL.md` completo ativa quando o pedido casa com a descrição. As
  descrições do kit são ricas em palavras-chave de propósito.
- **Contexto always-on vem do `AGENTS.md`.** O Copilot trata `AGENTS.md` como
  instruções de agente (o arquivo mais próximo na árvore vence), e o installer já
  gera um — carregando o contrato de operação **e** a ladder de código
  (YAGNI → reuso → stdlib → nativo → dependência instalada → uma linha → mínimo).
  Nenhum `.github/copilot-instructions.md` duplicado é escrito; mantenha o seu ali
  se precisar de regras específicas do repo além das do kit.
- **As personas são selecionáveis.** A dropdown de agentes (VS Code / JetBrains) e a
  aba de agentes no github.com listam os 10 agentes `wize-*`, cada um com seu papel
  na descrição. O campo `tools` é omitido, então cada persona mantém todas as
  ferramentas disponíveis.
- **Sem prompt files.** `.github/prompts/*.prompt.md` está deprecado pelo VS Code
  (migrando para agent skills), então o kit entrega skills — as invocações
  `/wize-{code}` ficam cobertas pela ativação por descrição.

## Instalação

Escolha **GitHub Copilot** como IDE target no `npx wize-dev-kit install` (ou
adicione e rode `npx wize-dev-kit sync`). Reinicie o Copilot e comece com
`/wize-orchestrator` no chat — ou selecione uma persona na dropdown de agentes.

Arquivos `wize-*` gerados ficam no `.gitignore` (regenere com
`npx wize-dev-kit sync`). Skills de time escritas à mão ao lado deles devem ser
commitadas.

## Headless

`copilot -p "<prompt>"` roda uma sessão one-shot sem entrar na UI interativa — é o
que o baseline brownfield do installer usa quando o Copilot CLI é o harness
detectado. Para automação não assistida, conceda o mínimo necessário (por exemplo
`--allow-tool=write`) em vez de `--allow-all`.
