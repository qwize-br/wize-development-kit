# OpenBot — Wize Development Kit

🌐 **Languages:** **English** · [Português (pt-BR)](openbot.pt-BR.md)

← [Back to README](../../README.md)

OpenBot runs agents on your computer, each with its own workspace. The kit gives it the whole team: one agent per persona (Wizer, Pepper Potts, Maria Hill, Mantis, Nick Fury, Tony Stark, Hawkeye, Shuri, Peggy Carter, and Natasha Romanoff with the security overlay), each carrying its persona, its skills and the team's rules.

OpenBot is an agent app, not an IDE target. Nothing is written into your repository and `project.toml` has no `openbot` entry. The agents work on a target repository you name, and write the method artifacts to its `.wize/` folder.

## Export: first import

```bash
npx wize-dev-kit openbot export [--profiles a,b] [--lang pt-BR] [--out <dir>] [--json]
```

Writes `wize-dev-kit-openbot-<YYYY-MM-DD>.zip` to `~/Downloads` (or `--out`). The zip is built in a temporary folder, written as `.zip.part`, and renamed when complete (the part file has a unique name and is created exclusively, so a symlink or a second export on the same day cannot make it write elsewhere), so OpenBot never reads a half-written file. In OpenBot, open **Server settings → Import** and choose the file.

- **Profiles.** `--profiles`, else `.wize/config/project.toml` when you run it inside an installed project, else `core,method,tea`. An explicit flag wins over `project.toml`. The core, method, tea, orchestrator and builder modules are always on; name an overlay (`web-overlay`, `app-overlay`, `security-overlay`) to add its skills. Natasha is exported only with `security-overlay`.
- **Language.** `--lang`, else the project's communication language, else `pt-BR`. It sets the language of the work rules and the memories. Skills keep the language they are written in. `pt-BR` and `en` have their own text; any other code gets the English text with a rule to reply in that language.
- **Agent fields.** `key` is the persona code without `wize-agent-` (`dev`, `orchestrator`, `pm`), `name` is the persona's display name, `title` is the role. The description is a short persona summary plus the work rules, at most 2000 characters. The full persona is always in `agents/<key>/files/SOUL.md`, which OpenBot copies to `imported/SOUL.md` in the agent workspace.
- **Skills.** Per agent: its own persona skill, the skills in its `agent.yaml`, the skills it owns, and the shared set `wize-grill`, `wize-no-ai-slop`, `wize-subtract`, `wize-help`. Wizer gets `wize-help`, `wize-orchestrator`, `wize-party-mode`, `wize-check` and the skills the intent table routes to most. They are rendered by the same emitter as the other harnesses, companion files included, and each skill folder carries a `.wize-managed.json` marker so the first `sync` after the import recognizes it. If OpenBot drops dotfiles on import, the skills arrive unmarked and the first sync needs `--adopt`. OpenBot takes at most 32 per agent; when more are wanted, own skills stay and the rest is dropped and printed, never dropped silently.
- **Memories.** Team roster with keys, the handoff chain (Pepper Potts → Maria Hill → Mantis/Nick Fury → Tony Stark → Hawkeye risk → Shuri → Hawkeye trace, review and gate → Maria Hill status), the rule that artifacts live in the target repository's `.wize/` and that the agent asks for the target repository before writing, and how to delegate with `openbot-cli`.
- **Checks.** Before zipping, the manifest is checked against OpenBot's limits (name 80, title 120, description 2000, 32 skills, 64 memories of 500 characters, 200 files and 10 MB per skill, no `.env`, private keys or nested archives). A violation exits 1 and names it.

`--json` prints one object: `path`, `version`, `profiles`, `agents` (with `skills` and `dropped`), `dropped`, `skippedPersonas`, `import`.

## Sync: after every kit update

Imported agents keep the skills they were imported with. After each kit update, refresh them in place:

```bash
npx wize-dev-kit@latest openbot sync [--team <file>] [--agents-dir <dir>] [--dry-run] [--adopt] [--allow-outside] [--strict] [--json] [--profiles a,b] [--lang pt-BR]
```

For each mapped workspace it writes the agent's kit skills into both `.agents/skills/<name>/` and `.claude/skills/<name>/`, each folder with a `.wize-managed.json` marker (`{"managedBy":"wize-dev-kit","version":"<kit>"}`), and it maintains one block in `AGENTS.md` between `<!-- wize-dev-kit:begin -->` and `<!-- wize-dev-kit:end -->` (persona, work rules, kit pointers). It creates `AGENTS.md` when absent; when the file exists without a block it appends one. Text outside the block is never rewritten. It never calls OpenBot to change an agent; run `--dry-run` first to see what would change. The summary counts skill folders and, separately, the files written or unchanged inside them (`skills.folders`, `skills.written`, `skills.unchanged` in `--json`). One workspace that fails (permissions, a file where a folder should be) is reported as an error and the others still sync; the exit code is 1 only with `--strict` or when every agent failed.

Profiles and language resolve like in `export`, and nothing is remembered between runs: `--flag`, else `project.toml`, else the defaults (`core,method,tea`, `pt-BR`). Run outside a project, pass the same `--profiles` and `--lang` you used for `export` on every sync. Without an explicit profile list, sync never removes kit skills: folders outside the default set are kept as they are and a warning says so. Stale kit skills are pruned only when profiles come from `--profiles` or `project.toml`. The summary line prints where each value came from. Persona text keeps the language it is written in (the summary in `agent.yaml` is English); only the work rules and memories follow `--lang`. A mapped persona whose module is not active (Natasha without `security-overlay`) is skipped with a warning.

### team.json

The map from persona key to workspace lives in `~/OpenBot/Shared/wize-dev-kit/team.json` (`--team`):

```json
{ "version": 1, "agents": { "dev": "agent-e6eed6e5-ec65-47c2-9a2a-5244275667e9", "pm": "/home/me/OpenBot/Agents/agent-5bd7d7c0" } }
```

A value is an agent id (the workspace is `<agents-dir>/<id>`, default `~/OpenBot/Agents`), a path relative to the agents folder that stays inside it, or an absolute path. An absolute path outside the agents folder is refused unless you pass `--allow-outside` (and then it must hold an `AGENTS.md` or `.agents/`), so a typo in the file cannot point sync at an ordinary repository. A workspace that two keys resolve to is skipped for both, with a warning, until `team.json` names one persona per workspace. The home folder, `/`, `.`, `..` and any parent of the agents folder are refused with a warning. When the file is missing, sync builds it: it runs `openbot-cli list --json` (the path in `OPENBOT_CLI`, else `openbot-cli` on `PATH`) and matches agents by persona display name, then matches the remaining personas against the first heading of each workspace's `AGENTS.md` (`# Shuri — ...`). It writes only `team.json` and prints the matches. A persona with no match or with several is reported and skipped; the exit code stays 0 with warnings, and `--strict` makes it 1. An existing `team.json` is not re-discovered: agents imported after the first run stay unmapped ("not in team.json; skipped") until you add them to the file or delete it so the next run rebuilds it. Sync never edits an existing `team.json`; it writes the file only when it is missing, and not at all when no agent was found.

### What sync never touches

- Skill folders with `.openbot-managed.json`.
- Skill folders without the kit marker. A `wize-*` folder from a hand install is left alone with a warning; `--adopt` replaces it (and still never an OpenBot-managed one).
- Anything outside the skill folders and the `AGENTS.md` block. Kit-managed folders that are no longer in the agent's set are removed, but only when the name is a skill code the kit ships (in any profile) and equals the `name` in its `SKILL.md`, so a copy of a skill made with `cp -r` and renamed is kept (with a warning), even if its `name` was updated to match; files inside a kit-managed folder that left the source are pruned.
- Symlinks that leave the workspace: a skills folder or `AGENTS.md` that resolves outside the workspace is refused, and so is a workspace that is itself a symlink. A kit-managed skill folder that contains a symlink anywhere, or a stale kit skill that is itself a symlink, is skipped with a warning. An `AGENTS.md` that is a symlink inside the workspace is written through to its target.

## Delegation between agents

With **Local scripts** on for an agent, another agent (usually Wizer) can hand it work:

```bash
echo "<task>" | openbot-cli run <agent-id-or-name> - --wait
```

The message carries the target repository, the input artifact (a path in `.wize/`), what to deliver and the done criterion. Exit codes: 0 done, 1 failed, 3 waits for a person, 4 timed out, 5 OpenBot unreachable or agent not found.

## Limits

- 32 skills, 64 memories and 2000 description characters per agent (OpenBot's limits).
- `export` and `sync` read the kit installed with `npx`; run `npx wize-dev-kit@latest` to get the newest personas and skills.
- A zip holds at most 65535 files; the writer refuses anything larger and writes no zip64.
- Agent avatars and routines are not part of the export.
