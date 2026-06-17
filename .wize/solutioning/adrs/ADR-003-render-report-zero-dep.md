---
number: 003
title: render-report em Node 20 zero-dependency
status: accepted
date: 2026-06-17
deciders: Tony Stark, Nick Fury
---

# ADR-003 — render-report em Node 20 zero-dependency

## Contexto
O `wize-sec-report` precisa consolidar os parciais das fases em `report.md` + `report.html` single-file. O tech-vision fixou "Node 20, zero-dep, função pura de template". O NFR Cost #2 proíbe novas dependências npm no overlay. O NFR Accessibility exige WCAG 2.2 AA + axe-friendly.

## Decisão
- Linguagem: Node 20+, CommonJS (consistente com `tools/installer/*.js`).
- **Zero dependência npm** — apenas built-ins: `fs`, `path`, `crypto` (para SHA-256 do `scope.md` ao validar), `zlib` (se necessário para tamanho).
- Template HTML único embutido como string no script; placeholders substituídos por uma função pura de ~20 linhas (sem `nunjucks`/`handlebars`/`ejs`).
- CSS inline dentro do `<style>` no próprio HTML; sem link externo, sem `@import`.
- Cálculo de score CVSS v3.1: implementar a álgebra em `_shared/cvss.js` (determinística, ~80 linhas, testável).
- Mapeamento OWASP Top 10: tabela estática em `data/owasp-top10.json`, lida do disco.

## Consequências
- **Positivo:** honra "zero runtime próprio" e minimiza supply chain.
- **Positivo:** arquivo final abre offline, em qualquer browser moderno.
- **Positivo:** determinismo total — facilita o teste de reprodutibilidade (NFR Reliability #3).
- **Negativo:** sem macros/loops no template — campos repetidos (findings) são gerados por código, não por template. Aceito: separação código (gera) vs template (apresenta) é clara.
- **Negativo:** sem internacionalização além de pt-BR/en na v1 (já em Out of scope).
- **Trade-off aceito:** sem syntax highlighting no HTML (code blocks são `<pre><code>` plain). Adicionável depois via `<style>` se virar demanda.

## Alternativas consideradas
- **Template engine externa (nunjucks/handlebars):** rejeitada — viola zero-dep.
- **Markdown → HTML via `marked`:** rejeitada — mesma razão.
- **Build pipeline (webpack/vite):** rejeitada — viola "file-first".
