---
code: wize-pre-pr-check
name: wize-pre-pr-check
module: core
description: "Quando for abrir um Pull Request ou PR leia"
---

# Pre-PR Check

**Goal.** Rodar os checks obrigatórios localmente antes de abrir um PR, falhando cedo e rápido. Evita ciclagem cara de CI no Actions — principalmente lint, format, build e testes rápidos. O objetivo é ser um portão (gate) antes de submeter código.

**Agnóstica de tecnologia.** Não prescreve ferramentas específicas; lê os comandos disponíveis no repositório e executa o que for aplicável.

## When to run

- Imediatamente antes de `git push` para uma branch de PR.
- Antes de abrir o PR no GitHub/GitLab.
- Após `git commit` na branch de feature, como sanity check.
- A qualquer momento durante o desenvolvimento — fail fast.

## When NOT to run

- Quando o CI já está verde e o PR está em revisão (o gate já passou).
- Quando o repositório não tem scripts/ferramentas de lint/test configurados.

## Operating contract

- **Leia o projeto antes de rodar.** Procura por `package.json`, `composer.json`, `Makefile`, `justfile`, `pyproject.toml`, `Cargo.toml`, etc. para descobrir os comandos de check existentes.
- **Só execute o que existir.** Se não houver `eslint`, pule o passo de lint. Se não houver `phpstan`, pule o passo de análise estática. Nunca exija uma ferramenta que não esteja configurada no repo.
- **Pare no primeiro erro.** A menos que o usuário peça `--continue`, um check que falha interrompe a cadeia — corrija antes de continuar.
- **Não seja um substituto completo do CI.** O CI continua sendo a fonte da verdade para testes de integração, e2e, banco de dados, Docker, etc. Este gate é para checks rápidos e baratos.
- **Custo zero no Actions.** Tudo roda localmente.

## Inputs

- Estado atual do working tree (staged + unstaged).
- Arquivos de config do projeto para descobrir comandos.

## Outputs

- Relatório compacto de quais checks passaram/falharam.
- Se falhou: mensagem de erro + arquivo(s) sugerido(s) para corrigir.
- Se passou: confirmação pronta para PR.

## Steps

### 1. Detectar stack

Procurar nos arquivos de config do projeto quais ferramentas estão disponíveis:

| Fonte | O que extrair |
|-------|---------------|
| `package.json` → `scripts` | `lint`, `format`, `format:check`, `type-check`, `build`, `test`, `test:unit` |
| `composer.json` → `scripts` | `test`, `phpstan`, `pint`, `phpcs` |
| `Makefile` / `justfile` | targets `lint`, `format`, `check`, `test` |
| `pyproject.toml` / `setup.cfg` | `flake8`, `black`, `mypy`, `pytest` |
| `Cargo.toml` | `cargo check`, `cargo test`, `cargo clippy`, `cargo fmt` |
| `.github/workflows/*.yml` | steps de `lint`, `format`, `build`, `test` (como referência, não para rodar) |

Heurística de prioridade: scripts do gerenciador de pacote local (`npm run`, `composer run`) > binários diretos (`vendor/bin/pint`) > comandos genéricos (`cargo clippy`).

### 2. Selecionar checks por velocidade

Separar em **rápido** (executa em segundos) e **lento** (minutos):

**Rápido (executar sempre):**
- Lint (ESLint, PHPStan, Clippy, Ruff, etc.)
- Format check (Prettier, Pint, Black, rustfmt)
- Type check (tsc, mypy)
- Análise estática (PHPStan, Psalm)

**Lento (executar quando houver mudanças relevantes):**
- Build (Vite, Webpack, Cargo build)
- Testes unitários (Vitest, Jest, Pest, pytest, `cargo test`)
- Guard-rails custom (scripts próprios do projeto, ex: `check:orphans`)

**Muito lento (opcional / em dia de merge):**
- Testes de integração
- E2E (Playwright, Cypress)
- Build de Docker

### 3. Rodar o gate

Na ordem: format → lint → type-check → build → testes unitários → guard-rails.

Comandos típicos por stack (detectados em tempo real, não hardcoded):

| Stack | Comandos comuns |
|-------|-----------------|
| Node/JS/TS | `npm run format:check`, `npm run lint`, `npm run check:type` (ou `tsc --noEmit`), `npm run build`, `npm run test` |
| PHP/Laravel | `vendor/bin/pint --test`, `vendor/bin/phpstan analyse`, `php artisan test` |
| Python | `black --check`, `ruff check`, `mypy`, `pytest` |
| Rust | `cargo fmt -- --check`, `cargo clippy`, `cargo check`, `cargo test` |
| Go | `gofmt -l`, `golangci-lint run`, `go test ./...` |

Se um check falhar, pare e reporte. Não prossiga para o próximo.

### 4. Reportar

Formato compacto, uma linha por check:

```
✓ format:check   (npm run format:check)     — 0.8s
✓ lint           (vendor/bin/pint --test)   — 2.1s
✗ phpstan        (vendor/bin/phpstan)       — 4.5s → FAIL
  app/Http/Controllers/LegalController.php:11 — FQCN não importado
→ Corrija antes de abrir o PR.
```

Se tudo passar:

```
✓ format:check   — PASS  (0.8s)
✓ lint           — PASS  (2.1s)
✓ phpstan        — PASS  (4.5s)
✓ build          — PASS  (32s)
✓ test:unit      — PASS  (30s)
─────────────────────────────
Gate limpo. Pode abrir o PR.
```

## Anti-patterns

- **Rodar checks que não existem no repo.** Se não há `composer.json`, não tente `vendor/bin/pint`.
- **Ignorar falhas de lint.** Lint fail = PR fail. Corrija antes.
- **Executar E2E localmente toda vez.** E2E é caro; deixe para o CI ou rode antes de merge.
- **Substituir o CI.** Este gate é complementar, não substituto.

## Hand-off

> Gate `wize-pre-pr-check` concluído. `{passados}/{total}` checks passaram. `{tempo_total}s`. Pronto para PR.

Se houve falha:
> Gate `wize-pre-pr-check` interrompido em `{check_falho}`. Corrija e re-execute antes de abrir o PR.
