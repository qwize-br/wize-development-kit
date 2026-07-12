# Wize Dev Kit — IDE Adapters

Each adapter renders the kit's agents/skills/workflows into the file layout that a particular IDE or AI runtime expects.

## Targets shipped in v0.1

| Code | Target path in repo | File format | Notes |
|---|---|---|---|
| `claude-code` | `.claude/skills/wize-*/` | `SKILL.md` per agent/workflow | Default. Uses Claude Code skill folder pattern. |
| `cursor` | `.cursor/rules/wize-*.mdc` | MDC | Each agent/skill becomes a rule file. |
| `windsurf` | `.windsurf/rules/wize-*.md` | Markdown | Cascade-friendly. |
| `codex` | `.agents/skills/wize-*/` | `SKILL.md` per agent/workflow | OpenAI Codex. |
| `continue` | `.continue/prompts/wize-*.prompt` | `.prompt` | Continue prompt slot. |
| `kimi-code` | `.kimi/skills/wize-*/` | `SKILL.md` per agent/workflow | Moonshot Kimi Code. |
| `opencode` | `.opencode/agents/wize-*.md` + `.opencode/commands/wize-*.md` | Markdown | OpenCode CLI. Native agents + commands. |
| `antigravity` | `.agent/skills/wize-*/` | `SKILL.md` per agent/workflow | Antigravity CLI + IDE. |
| `generic` | `.wize/agents/wize-*.md` | Markdown | Fallback for any agent that can read a folder of markdown. |

## Adapter shape

Every adapter is a folder under `adapters/{code}/` with:
- `adapter.yaml` — descriptor (target path, file pattern, post-install hooks).
- `render.js` — function `(kitRoot, projectRoot, opts) => void` that emits files.
- `README.md` — adapter-specific notes.

The shipped adapters emit real files through `render.js`.
