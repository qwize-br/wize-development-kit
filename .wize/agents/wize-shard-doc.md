# Shard Doc

> core skill: Shard Doc

# Shard Doc

Splits large markdown (PRD, architecture, etc.) into addressable shards under `{doc-name}.shards/`.

## Why
Agents quote shards by id (`prd.shards/AC-5.md`) instead of pulling the whole document.

## Behavior
- Splits at headings (`##` by default; configurable).
- Each shard gets `id` from heading slug + frontmatter.
- Original doc becomes the index.
