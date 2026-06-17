---
story_id: E07-S03
epic: 07-report
status: done
priority: 1
estimate: L
linked_acs: [AC-E07-2, AC-E07-3, AC-E07-4, AC-E07-5]
---

# Story: render-report.js — output HTML self-contained

## Context
Brief: HTML single-file self-contained (CSS inline, sem CDN/build). NFR Accessibility: WCAG 2.2 AA + axe. ADR-003: zero-dep Node, template inline.

## Acceptance criteria
- **AC-E07-2 (parte):** Gera `.wize/security/report.html`.
- **AC-E07-3:** HTML abre sem rede (sem `<link>`, `<script src>` para CDN, sem `@import`). Verificável com `grep -E 'src=\"http|href=\"http|@import' report.html` retornando vazio.
- **AC-E07-4 (HTML):** Cada finding exibe badge colorido por severidade (Critical/High/Medium/Low/Info) + tag OWASP.
- **AC-E07-5:** HTML respeita semantic-html + wcag-aa. axe em CI (E07-S04) passa.

## Out of scope
- axe em CI — E07-S04.
- Geração do MD — E07-S02.

## Notes for Shuri
- Estender `scripts/render-report.js` (E07-S02) para gerar também `report.html`.
- Template HTML (string inline no script):
  - `<!DOCTYPE html><html lang="pt-BR">`
  - `<head>` com `<meta charset>`, `<title>`, `<style>` inline (CSS).
  - `<body>` com `<header>`, `<main>`, `<footer>` semântico.
  - CSS inline: definir cores dos badges (do architecture: Critical `#7f1d1d`, High `#b91c1c`, Medium `#b45309`, Low `#1d4ed8`, Info `#475569`), tipografia (`system-ui`), responsivo (mobile-first).
  - Findings como `<article>` com `<h2>` (título), `<dl>` (definições: severity, cvss, owasp, poc), `<pre><code>` para evidence.
  - Sumário executivo: `<table>` com `<th scope>` apropriados.
  - Skip link `<a href="#main">` para acessibilidade.
- Função de substituição: `replace(template, vars)` (simples, ~20 linhas). Sem libs.
- Reusar playbooks `semantic-html.md` e `wcag-aa.md` como checklist durante a implementação.

## Notes for Hawkeye
- Testes em `test/security-overlay/render-report-html.test.js`:
  - `report.html` é gerado em `.wize/security/`.
  - Grep por `src="http` / `href="http` / `@import` retorna 0 matches.
  - Tem `<!DOCTYPE html>`, `<html lang="...">`, `<main>`, `<footer>`.
  - Cada finding tem um badge com classe `severity-{nivel}`.
  - Pelo menos 1 finding tem tag OWASP.
  - Idempotente: rerun gera HTML byte-equivalente (timestamps normalizados no MD; no HTML, usar `<meta name="generated_at">` com `Date.now()` da seed em testes).