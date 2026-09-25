# GitHub Copilot — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](copilot.pt-BR.md)

← [Back to README](../../README.md)

GitHub Copilot reads two kinds of project customizations, and the kit fills both:

- **Agent skills** — `.github/skills/wize-{code}/SKILL.md`, following the open
  [Agent Skills](https://agentskills.io) standard (a folder per skill; YAML
  frontmatter with `name` + `description`).
- **Custom agents** — `.github/agents/wize-{code}.agent.md`, one per persona,
  with the persona as its prompt.

## Output

```
.github/
├── agents/     wize-orchestrator.agent.md, wize-agent-dev.agent.md, … (10 personas)
└── skills/     wize-grill/SKILL.md, wize-code-review/SKILL.md, … (workflows + skills)
```

Companion files (`steps/`, `templates/`, `data/`, `*.csv`) are copied next to
each `SKILL.md`, so micro-file workflows like `wize-create-architecture` resolve
their relative paths.

## Notable

- **Where it works.** Copilot cloud agent, Copilot code review, the GitHub
  Copilot CLI, the Copilot app, and agent mode in VS Code, JetBrains IDEs,
  Eclipse and Xcode. Copilot discovers project skills in `.github/skills/`,
  `.claude/skills/` or `.agents/skills/` — this adapter writes the canonical
  `.github/skills/` path.
- **Progressive disclosure.** Only `name` + `description` load at session start;
  the full `SKILL.md` activates when your request matches the description. The
  kit's descriptions are keyword-rich on purpose.
- **Always-on context comes from `AGENTS.md`.** Copilot treats `AGENTS.md` as
  agent instructions (the nearest file in the directory tree wins), and the
  installer already generates one — carrying the operating contract **and** the
  code ladder (YAGNI → reuse → stdlib → native → installed dependency →
  one-liner → minimum). No `.github/copilot-instructions.md` duplicate is
  written; keep your own there if you need repo-specific rules beyond the kit's.
- **The personas are pickable.** The agent dropdown (VS Code / JetBrains) and
  the agents tab on github.com list the 10 `wize-*` agents, each with its role
  as description. `tools` is omitted, so a persona keeps every available tool.
- **No prompt files.** `.github/prompts/*.prompt.md` is deprecated by VS Code
  (migrating to agent skills), so the kit ships skills instead — `/wize-{code}`
  invocations are covered by skill activation.

## Setup

Pick **GitHub Copilot** as an IDE target during `npx wize-dev-kit install` (or
add it and re-run `npx wize-dev-kit sync`). Restart Copilot, then start with
`/wize-orchestrator` in chat — or select a persona from the agent dropdown.

Generated `wize-*` files are gitignored (regenerate any time with
`npx wize-dev-kit sync`). Hand-written team skills added next to them should be
committed.

## Headless

`copilot -p "<prompt>"` runs a one-shot session without entering the interactive
UI, which is what the installer's brownfield baseline uses when the Copilot CLI
is the detected harness. For unattended automation, grant the minimum you need
(for example `--allow-tool=write`) rather than `--allow-all`.
