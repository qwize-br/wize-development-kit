---
code: wize-research
name: Research
phase: 1-analysis
owner: wize-agent-analyst   # Pepper Potts
status: ready
description: "Use quando precisar pesquisar algo mas não souber qual tipo de pesquisa se aplica."
---

# Research (Dispatcher)

**Goal.** Classify the user's research question and delegate to the correct variant. This skill does NOT execute research directly — it routes to one of the specialized research skills.

## Classification guide

Analyze the user's question for these signals. Score each category by keyword hits; delegate to the highest-scoring category.

| Category | Keywords (pt-BR) | Keywords (EN) | Delegate to |
|---|---|---|---|
| **Market** | concorrência, concorrentes, mercado, competidor, pricing, preço, posicionamento, cliente, segmento, TAM, SAM, market share, G2, Capterra | competitor, market, pricing, positioning, customer, segment | `wize-market-research` |
| **Domain** | domínio, indústria, setor, regulatório, regulação, compliance, legislação, lei, normativo, PESTLE, tendências do setor | domain, industry, sector, regulatory, compliance, legislation | `wize-domain-research` |
| **Technical** | técnico, tecnologia, stack, biblioteca, framework, arquitetura, ferramenta, linguagem, banco de dados, API, protocolo, desempenho, escalabilidade | technical, technology, stack, library, framework, architecture, tool, language, database, API, protocol, performance, scalability | `wize-technical-research` |

## Steps

### 1. Read the question

Extract the user's research topic or question. If the user provided a long message, identify the core research intent.

### 2. Classify

Match keywords against the classification guide above. Score each category by keyword hits. Pick the highest-scoring category.

### 3. Delegate or ask

- **Clear match (one category dominates):** Delegate to the corresponding variant. Load that skill and hand off the user's question intact — do not rephrase or summarize.
- **Ambiguous (multiple categories tie or no clear signal):** Ask one clarifying question:

> Isso é pesquisa de mercado, domínio ou técnica?

Wait for the user's answer, then delegate to the chosen variant.

## Anti-patterns

- Executing research directly instead of delegating.
- Asking more than one clarifying question.
- Guessing when the signal is ambiguous — ask, don't assume.

## Hand-off

> Pesquisa classificada como {{category}}. Delegando para {{variant}}.
