# GitHub Copilot — Wize Dev Kit Adapter

Emits the kit's assets into the two trees GitHub Copilot reads, mirroring how
Copilot itself separates **skills** from **agents**:

- `.github/skills/wize-{code}/SKILL.md` — workflows + skills, as **agent skills**
  (Agent Skills standard: one folder per skill, `SKILL.md` with `name` +
  `description` frontmatter, optional companion files).
- `.github/agents/wize-{code}.agent.md` — the 10 personas, as **custom agents**
  (frontmatter: `name`, `description`; body = the persona).

## How Copilot picks these up

- **Skills** work with the Copilot cloud agent, Copilot code review, the GitHub
  Copilot CLI, the Copilot app, and agent mode in VS Code, JetBrains IDEs,
  Eclipse and Xcode. Copilot discovers project skills in `.github/skills/`,
  `.claude/skills/` or `.agents/skills/` — this adapter writes the canonical
  `.github/skills/` path, so it also works without picking the Claude Code or
  Codex target.
- **Custom agents** surface in the agent dropdown (VS Code, JetBrains, and the
  agents tab on github.com). VS Code detects any `.md` under `.github/agents/`
  as a custom agent; GitHub's cloud agent uses the same folder. `tools` is
  intentionally omitted so each persona keeps every available tool — the persona
  body defines the role, and narrowing tools is a per-team decision.
- **Progressive disclosure:** only `name` + `description` load at session start;
  the full `SKILL.md` activates when your request matches the description (or is
  invoked explicitly). The kit's descriptions are written keyword-rich for
  exactly this match.
- **Always-on instructions are not duplicated.** Copilot reads the root
  `AGENTS.md` as agent instructions (nearest file in the tree wins), and the
  generic adapter already emits it — including the code ladder and the kit's
  operating contract. Writing a `.github/copilot-instructions.md` with the same
  content would only fork it.
- **No prompt files.** `.github/prompts/*.prompt.md` is deprecated by VS Code
  (the migration path is *prompt → agent skill*), so this adapter ships skills
  instead of prompts on purpose.
- Generated `wize-*` entries are gitignored (regenerate with
  `npx wize-dev-kit sync`); hand-written team skills you add next to them should
  be committed, per GitHub's own guidance.

## Files

- `render.js` — personas → `.github/agents/`; workflows + skills → `.github/skills/`
  via the shared `renderAnthropicSkills` emitter (`kinds` filter), which also
  copies companion files (`steps/`, `templates/`, `data/`, `*.csv`) so
  micro-file workflows resolve their relative paths.
- `adapter.yaml` — descriptor (target path, file pattern).

## Headless

`copilot -p "<prompt>"` runs a one-shot session (the installer's brownfield
baseline uses this when the Copilot CLI is the detected harness). For unattended
automation add the minimum permissions you need, e.g. `--allow-tool=write`
instead of `--allow-all`.
