# Kiro (AWS) — Wize Dev Kit Adapter

Emits the kit's agents/skills/workflows as Kiro workspace skills under
`.kiro/skills/wize-{code}/SKILL.md`, using the open Agent Skills standard
(agentskills.io) — a folder with a `SKILL.md` (YAML frontmatter: `name`,
`description`), the same Anthropic-compatible format the kit already renders
for Claude Code / Codex / Kimi Code / Hermes.

## How Kiro picks these up

- The default agent automatically loads workspace skills from
  `<repo-root>/.kiro/skills/` and global skills from `~/.kiro/skills/`.
  **Workspace skills win** on name collisions.
- **Progressive disclosure:** at session start Kiro loads only `name` +
  `description`; the full SKILL.md activates when your request matches the
  description, or explicitly via `/wize-{code}` in chat.
- **Activation is description-driven** (no config needed): keep descriptions
  keyword-rich — the kit's descriptions already follow that guidance.
- Skills must be valid frontmatter (`name` matches the folder name, lowercase
  + hyphens, ≤ 64 chars; `description` ≤ 1024 chars) — the shared emitter
  already guarantees this shape.
- Kiro also reads `.kiro/steering/*.md` for always-on project context, so
  pairing with the **Generic fallback** target (root `AGENTS.md`) is a bonus.
- **Custom agents caveat:** Kiro custom agents don't load skills by default —
  add `"skill://.kiro/skills/*/SKILL.md"` to the agent's `resources` field.

## Files

- `render.js` — renders via the shared `renderAnthropicSkills` emitter.
- `adapter.yaml` — descriptor (target path, file pattern).
