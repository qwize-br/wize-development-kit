---
code: wize-changelog
description: "Use quando precisar gerar ou atualizar o changelog no formato Keep a Changelog a partir das stories concluídas."
name: Changelog
phase: 4-implementation
owner: wize-agent-dev   # Shuri
status: ready
---

# Changelog

**Goal.** Gerar `CHANGELOG.md` no formato [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) a partir das stories concluídas no sprint, agrupadas por epic e categoria.

Shuri executa. O changelog é gerado em pt-BR (texto voltado ao usuário) e segue a convenção do projeto.

## Inputs

- `.wize/implementation/sprint-status.yaml` — stories concluídas
- `.wize/solutioning/stories/{epic}/*.md` — detalhes das stories
- `.wize/solutioning/epics/*.md` — nomes legíveis dos epics
- `CHANGELOG.md` — changelog existente (se houver)
- `git tag --list 'v*' --sort=-v:refname | head -1` — última tag

## Output

- `CHANGELOG.md` criado ou atualizado com a nova entrada pré-pendida

## Formato Keep a Changelog

Seguir estritamente o formato [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/):

```markdown
# Changelog

All notable changes to this project are documented here.
Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.12.0] — 2026-08-08

### Added
- **Epic 09 — UX / intent:** Release e changelog skills (`wize-release`, `wize-changelog`). #E09-S07

### Changed
- **Epic 09 — UX / intent:** Roteamento por intenção expandido com release/changelog. #E09-S03

### Fixed
- **Epic 09 — UX / intent:** Descrições de skill corrigidas (block scalars). #E09-S01

### Security
- (vazio se não houver stories de segurança)
```

### Regras de categoria

| Categoria | Quando usar |
|---|---|
| **Added** | Nova feature, nova skill, nova funcionalidade |
| **Changed** | Mudança em funcionalidade existente, alteração de comportamento |
| **Deprecated** | Funcionalidade que será removida em breve |
| **Removed** | Funcionalidade removida |
| **Fixed** | Correção de bug |
| **Security** | Correção de vulnerabilidade, melhoria de segurança |

### Regras de agrupamento

- Agrupar por **epic** dentro de cada categoria.
- Cada linha começa com `- **Epic NN — Nome:**` seguido da descrição e `#story_id`.
- Stories sem epic definido vão sob `- **Geral:**`.
- Se uma categoria não tiver stories, escrever `- (vazio)` ou omitir (consistente com o changelog existente).

## Steps

### 1. Coletar stories concluídas

Ler `sprint-status.yaml`. Para cada story com status `done`:

1. Localizar o arquivo em `.wize/solutioning/stories/{epic}/{story}.md`
2. Extrair do frontmatter: `story_id`, `epic`
3. Extrair do corpo: título (linha `# Story:`) e primeira frase da seção `## Context` como sumário

Se o arquivo da story não existir, usar apenas o `story_id` como referência.

### 2. Classificar por categoria

Para cada story, determinar a categoria com base no conteúdo:

| Padrão no título/contexto | Categoria |
|---|---|
| "Adicionar", "Criar", "Novo", "Added", "Add" | Added |
| "Corrigir", "Consertar", "Bug", "Fix", "Hotfix", "Correção" | Fixed |
| "Alterar", "Mudar", "Refatorar", "Change", "Update" | Changed |
| "Remover", "Deprecar" | Removed / Deprecated |
| "Segurança", "Vulnerabilidade", "Security", "CVE" | Security |

Se ambíguo, default `Added` para stories novas, `Changed` para alterações.

### 3. Agrupar por epic

Para cada story, resolver o nome do epic:

1. Se o frontmatter tem `epic: NN-nome`, usar `Epic NN — Nome`
2. Buscar em `.wize/solutioning/epics/{epic}.md` o título (`# Epic NN: Nome`)
3. Fallback: `Epic {epic_id}`

Agrupar stories por epic, depois por categoria.

### 4. Gerar entrada do changelog

Montar a entrada no formato:

```markdown
## [{version}] — {YYYY-MM-DD}

{descrição curta do release — 1-2 frases sobre o que esta versão entrega}

### Added
- **{epic_nome}:** {descrição}. #{story_id}

### Changed
- **{epic_nome}:** {descrição}. #{story_id}

### Fixed
- **{epic_nome}:** {descrição}. #{story_id}

### Security
- **{epic_nome}:** {descrição}. #{story_id}
```

### 5. Atualizar CHANGELOG.md

Se `CHANGELOG.md` não existir, criar com o cabeçalho padrão:

```markdown
# Changelog

All notable changes to this project are documented here.
Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> **Language:** entries are written in **Portuguese (pt-BR)**.

## [Unreleased]
```

Se existir:
1. Localizar a linha `## [Unreleased]`
2. Inserir a nova entrada entre `## [Unreleased]` e a primeira `## [versão]` existente
3. Se não houver `## [Unreleased]`, inserir após o cabeçalho

### 6. Verificar formatação

- A data está no formato `YYYY-MM-DD`
- A versão segue semver (`X.Y.Z`)
- Cada story tem referência ao `#story_id`
- Categorias vazias foram omitidas
- O link do Keep a Changelog está presente

## Exemplo de saída

```markdown
## [0.12.0] — 2026-08-08

Release do cluster de ship: skills de release e changelog para o perfil core, roteamento por intenção expandido.

### Added
- **Epic 09 — UX / intent:** Skill `wize-release` para bump de versão, changelog e tag git a partir das stories gated. #E09-S07
- **Epic 09 — UX / intent:** Skill `wize-changelog` para geração de changelog no formato Keep a Changelog. #E09-S07

### Changed
- **Epic 09 — UX / intent:** Tabela de roteamento por intenção expandida com release, changelog, lançar, publicar, notas de versão. #E09-S03
```

## Anti-patterns

- Changelog escrito à mão sem referência às stories — perde rastreabilidade.
- Categoria "Added" para correção de bug — usar "Fixed".
- Data fora do formato ISO — usar `YYYY-MM-DD`.
- Pular stories concluídas — toda story `done` no sprint entra no changelog.
- Escrever changelog em inglês quando o projeto usa pt-BR — seguir o idioma do changelog existente.

## Hand-off

> Changelog atualizado em `CHANGELOG.md`. {count} stories de {epic_count} epics registradas. Próximo: `/wize-release` para bump de versão e tag, ou revisão manual do changelog.
