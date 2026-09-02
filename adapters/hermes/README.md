# Hermes Agent — Wize Dev Kit Adapter

Emits the kit's agents/skills/workflows as Hermes project-local skills under
`.hermes/skills/wize-{code}/SKILL.md`, using the Anthropic `SKILL.md` format
that Hermes consumes verbatim (same as Claude Code / Codex / Kimi Code).

## How Hermes picks these up

- Hermes discovers project-local skills at `<git-root>/.hermes/skills/`
  (Hermes-native) and `<git-root>/.agents/skills/` (cross-tool convention).
- **Trust gate:** skills are only loaded when the repo root is trusted. Run
  `hermes skills trust` (or add the repo to `skills.trusted_project_dirs` in
  `~/.hermes/config.yaml`) once per checkout.
- Trusted project skills **override** same-named profile/bundled skills —
  vendored repo skills win inside their repo.
- Hermes also reads root-level `AGENTS.md` (and `CLAUDE.md`, `.cursorrules`)
  as project context, so installing the generic target alongside is a bonus,
  not a requirement.

## Files

- `render.js` — renders via the shared `renderAnthropicSkills` emitter.
- `adapter.yaml` — descriptor (target path, file pattern).