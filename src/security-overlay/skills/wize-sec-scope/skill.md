---

code: wize-sec-scope
description: "Use para criar ou re-assinar o scope.md de segurança. Guia o usuário com perguntas e gera o arquivo com hash SHA-256."
name: wize-sec-scope
overlay: security
module: security-overlay
owner: wize-sec-red-teamer  # Natasha Romanoff
status: ready
---

# wize-sec-scope — Criação guiada de scope.md

Cria o arquivo `.wize/security/scope.md` a partir de perguntas interativas. Gera o frontmatter com `accepted_by`, `accepted_at`, e `scope_sha256` (SHA-256 do corpo). O arquivo gerado passa na validação do `loadScope()` sem intervenção manual.

## Uso

```bash
/wize-sec-scope
```

## Fluxo guiado

O agente faz uma pergunta por vez:

1. **URL base do alvo** — ex: `http://localhost:8080`
2. **Hosts adicionais no escopo** — um por linha, Enter para pular
3. **Paths no escopo** — ex: `/api/*`, Enter para todos (`/`)
4. **Nome para o aceite** — quem está autorizando o pentest

Ao final, gera `scope.md` com:

- Frontmatter: `accepted_by`, `accepted_at` (ISO-8601), `scope_sha256`
- Corpo: `## allowlist` com hosts, urls e paths
- `## dast_target` com a URL base
- `## notes` com o timestamp de criação

## Re-assinatura

Se o `scope.md` já existe e foi editado, use `--sign-scope` para recomputar o hash:

```bash
/wize-sec-pentest --sign-scope
```

## Script

`scripts/generate-scope.js` — gera o arquivo programaticamente (usado pelo agente ou chamado diretamente).

```bash
node scripts/generate-scope.js --url=http://localhost:8080 --hosts=localhost,127.0.0.1 --paths=/api,/admin --accepted-by="Seu Nome"
```
