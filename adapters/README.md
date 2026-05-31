# Wize Dev Kit — IDE Adapters

Each adapter renders the kit's agents/skills/workflows into the file layout that a particular IDE or AI runtime expects.

## Targets shipped in v0.1

| Code | Target path in repo | File format | Notes |
|---|---|---|---|
| `claude-code` | `.claude/skills/wize-*/` | `SKILL.md` per agent/workflow | Default. Uses Claude Code skill folder pattern. |
| `cursor` | `.cursor/rules/wize-*.mdc` | MDC | Each agent/skill becomes a rule file. |
| `windsurf` | `.windsurf/agents/wize-*.md` | Markdown | Cascade-friendly. |
| `codex` | `.codex/wize-*.md` | Markdown | OpenAI Codex CLI. |
| `continue` | `.continue/agents/wize-*.md` | Markdown | Continue agent slot. |
| `kimi-code` | `.kimi/agents/wize-*.md` | Markdown | Moonshot Kimi Code. |
| `opencode` | `.opencode/agents/wize-*.md` | Markdown | OpenCode CLI. |
| `antigravity` | `.antigravity/agents/wize-*.md` | Markdown | Antigravity CLI + IDE. |
| `generic` | `.wize/agents/wize-*.md` | Markdown | Fallback for any agent that can read a folder of markdown. |

## Adapter shape

Every adapter is a folder under `adapters/{code}/` with:
- `adapter.yaml` — descriptor (target path, file pattern, post-install hooks).
- `render.js` — function `(kitRoot, projectRoot, opts) => void` that emits files.
- `README.md` — adapter-specific notes.

In v0.1 only the descriptors and READMEs are present; `render.js` is a stub printing what it would emit. Wiring is on the v0.2 roadmap.
