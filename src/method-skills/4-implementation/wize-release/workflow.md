---
code: wize-release
description: "Use quando todas as stories do sprint estiverem gated e você precisar gerar release: bump de versão, changelog e tag git."
name: Release
phase: 4-implementation
owner: wize-agent-dev   # Shuri + Maria Hill
status: ready
---

# Release

**Goal.** Bump de versão, changelog a partir das stories gated e tag git. O release é o passo entre "todas as stories passaram no gate" e a retrospectiva.

Shuri executa. Maria Hill confirma o escopo (quais epics entram).

## Pré-requisitos

Antes de iniciar, verificar:

1. **Sprint ativo** — `sprint-status.yaml` deve ter `development_status` com stories.
2. **Todas as stories gated** — cada story no sprint ativo deve estar `done` no `sprint-status.yaml`. Stories com gate `FAIL` bloqueiam o release. Stories com `CONCERNS` precisam de waiver documentado.
3. **Git limpo** — `git status --porcelain` deve estar vazio (ou conter apenas arquivos não rastreados que não fazem parte do release).
4. **Branch main** — releases saem da `main`. Se estiver em feature branch, abortar e orientar merge via PR.

Se qualquer pré-requisito falhar, reportar o bloqueio e parar. Não fazer release parcial.

## Inputs

- `.wize/implementation/sprint-status.yaml` — stories concluídas
- `.wize/solutioning/stories/{epic}/*.md` — detalhes das stories
- `package.json` — versão atual
- `CHANGELOG.md` — changelog existente (se houver)
- `git tag --list 'v*'` — tags existentes

## Outputs

- `package.json` com versão atualizada
- `CHANGELOG.md` atualizado com a nova versão
- Tag git `v{semver}`
- `sprint-status.yaml` atualizado (sprint marcado como concluído)
- Resumo do release no terminal

## Steps

### 1. Verificar pré-requisitos

```bash
git status --porcelain  # deve estar vazio
git branch --show-current  # deve ser main
```

Ler `sprint-status.yaml` e validar que todas as stories do sprint ativo estão `done`. Se houver stories `backlog`, `ready-for-dev`, `in-progress` ou `review`, listar cada uma e abortar.

### 2. Coletar stories concluídas

Varrer `development_status` no `sprint-status.yaml`. Para cada story com status `done`:

1. Localizar o arquivo da story em `.wize/solutioning/stories/{epic}/{story}.md`
2. Extrair do frontmatter: `story_id`, `epic`, `status`
3. Extrair do corpo: título (linha `# Story:`), acceptance criteria

Agrupar por epic. Se o epic tiver `epic_id` no `sprint-status.yaml`, usar o nome do arquivo do epic em `.wize/solutioning/epics/` para obter o título legível.

### 3. Determinar o bump de versão

Ler a versão atual de `package.json`:

```
Versão atual: 0.11.0
Qual o bump?
  1. patch (0.11.1) — correções, hotfix, docs
  2. minor (0.12.0) — novas features compatíveis
  3. major (1.0.0) — breaking changes
```

Em modo interativo, perguntar ao usuário. Em modo não-interativo, usar o primeiro argumento (`patch`, `minor` ou `major`). Se nenhum argumento for passado, default `patch`.

Calcular a nova versão com `semver.inc(current, bump)` — usar Node built-in (regex parse + increment, sem dependência externa).

### 4. Gerar changelog

Delegar a geração do changelog ao `wize-changelog`:

1. Invocar o fluxo do `wize-changelog` com a nova versão e a lista de stories coletadas no passo 2.
2. O changelog é gerado no formato Keep a Changelog e pré-pendido ao `CHANGELOG.md`.

Se `CHANGELOG.md` não existir, criar com o cabeçalho padrão.

### 5. Bump de versão

Atualizar o campo `version` em `package.json` com a nova versão. Preservar a formatação existente (indentação, aspas duplas).

### 6. Commit e tag

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v{version}"
git tag v{version} -m "Release v{version}"
```

A mensagem de commit deve listar os epics incluídos no release.

### 7. Atualizar sprint-status.yaml

Adicionar ao `sprint-status.yaml`:

```yaml
release:
  version: "{version}"
  date: "{YYYY-MM-DD}"
  sprint: "{active_cycle}"
  stories_released: {count}
```

Marcar o sprint como concluído e adicionar entrada de retrospectiva pendente.

### 8. Resumo

Emitir no terminal:

```
✓ Release v{version} criado

Epics incluídos:
  - {epic_name} ({story_count} stories)

Changelog: CHANGELOG.md
Tag: v{version}
Commit: {commit_hash}

Próximos passos:
  - git push origin main --tags
  - /wize-retrospective
```

**Não executar `git push` automaticamente.** O push é sempre manual — o desenvolvedor revisa antes de publicar.

## Bump semver (built-in, zero-dep)

```js
function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: throw new Error(`Tipo de bump inválido: ${type}. Use patch, minor ou major.`);
  }
}
```

## Anti-patterns

- Fazer release com stories não gated — o gate existe para proteger a main.
- Fazer release de feature branch — releases saem da main.
- Push automático — o desenvolvedor revisa antes de publicar.
- Pular o changelog — "depois eu escrevo" = nunca escreve.
- Bump manual de versão — usar o bump semver para evitar off-by-one.

## Hand-off

> Release v{version} criado. Changelog atualizado, tag aplicada. Execute `git push origin main --tags` quando revisar. Depois: `/wize-retrospective`.
