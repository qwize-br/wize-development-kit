# Worktrees and automatic updates

🌐 **Languages:** **English** · [Português (pt-BR)](WORKTREES.pt-BR.md)

← [Back to README](../README.md)

A fresh `git worktree` has only the files git tracks. The kit's generated skills are not tracked, so a new worktree starts without `/wize` and friends. This guide covers how the kit fixes that on its own, and what each command does to your repo while it happens.

## What lives where

| Kind | Files | In git? | Who writes it |
|---|---|---|---|
| Tracked, shared | `.wize/config/project.toml` (holds the `kit_version` pin), `.wize/config/tea.toml`, `.wize/custom/`, planning, solutioning, implementation and knowledge artifacts, `AGENTS.md`, the managed `.gitignore` block, `.wize/hooks/hydrate.sh` and the hook configs from `hooks install` | yes | `install`, `update`, and you |
| Generated | `wize-*` entries per target (`.claude/skills/`, `.cursor/rules/`, `.github/skills/`, `.agents/skills/`, `.opencode/`, `.wize/agents/`, and the rest), plus the `wize` alias beside them | no, gitignored | `hydrate`, `sync` |
| Per developer | `.wize/config/user.toml`, `.wize/scratch/`, `.wize/.local/` (the `hydrated.json` marker), `.wize/implementation/quick-dev-log.md` | no, gitignored | `hydrate` (user.toml), you |

`.claude/worktrees/` is gitignored too, so worktrees that Claude Code creates inside the repo never show up in `git status`.

## The pin

`kit_version` in `.wize/config/project.toml` is the single source of truth for which kit renders this repo. Everyone on the team renders exactly that version, whichever `npx` they happened to run.

- `hydrate` renders the pin. For a pin of 0.27.0 or later it re-runs itself as `npx wize-dev-kit@<pin> hydrate` when the binary differs, with a guard (`WIZE_HYDRATE_DELEGATED`) against recursion. If that fails (offline, registry down; an attempt is capped at 45 s and a timed-out attempt is not retried) it renders with the binary it has and prints a warning. That fallback render counts as current for an hour, then the next `hydrate --if-needed` tries the exact pin again.
- Pins older than 0.27.0 have no `hydrate`. For those, `version-check` names `sync` as the command and never loops.
- A pin newer than the binary means your `npx` cache is stale. `update` refuses to downgrade the pin unless you pass `--allow-downgrade`.

## New worktree checklist

```bash
npx wize-dev-kit hydrate
```

That is the whole checklist. `hydrate`:

- finds the project root from any subdirectory or linked worktree (`--root <dir>` or `WIZE_PROJECT_ROOT` override it);
- copies `.wize/config/user.toml` from the primary checkout, or derives one from `git config user.name`, and never overwrites an existing one;
- renders the adapters for the configured targets, skipping files whose content is unchanged;
- writes the marker `.wize/.local/hydrated.json`;
- never prompts, never reads stdin, never runs the document-project baseline, and never writes a tracked file.

Before rendering it records `git ls-files`; a render that would overwrite a tracked file is blocked, including one that would reach it through a symlinked directory. If git cannot list tracked files (git missing, or a repository git refuses as unsafe), hydrate leaves every existing file alone and warns. After rendering it compares `git status` and warns if new entries appeared, which usually means the repo's `.gitignore` predates 0.27.0.

To make it automatic, install a hook (next section).

## The automatic loop

1. **Session start.** An agent skill (`/wize`, `/wize-help`) runs `version-check --json` and follows its `action`: `hydrate` and `update` run without asking; the only confirmation is before `update --pr`, because that pushes. The `AGENTS.md` bootstrap block carries the same instruction for harnesses that do not load skills first.
2. **Worktree creation.** Orca, Cursor and Claude Code can run `.wize/hooks/hydrate.sh` when a worktree or session starts (see the harness matrix).
3. **Weekly.** A GitHub Action opens a PR that bumps the pin (`hooks install --github-action`).
4. **After merge.** Each worktree pulls the new pin, sees that its marker is stale, and hydrates itself to the new version.

`version-check` reads the registry through a stale-while-revalidate cache in `$XDG_CACHE_HOME` (or `~/.cache`): the cached answer is returned at any age, and a stale entry starts one detached refresh, at most every 10 minutes. No refresh starts in CI, with `WIZE_DISABLE_UPDATE_CHECK=1` or with `WIZE_NO_BG_REFRESH=1`; the one-line hint after a command also stays silent without a TTY. Command hints and `hydrate` never wait on the network; an explicit `version-check` waits at most about 1.5 s for the registry when the cache is stale.

### Opt out

`WIZE_DISABLE_UPDATE_CHECK=1` turns off the registry lookup and downgrades an `update` action to `none`. Hydration still happens. There is no team-level switch in `project.toml` yet.

## Updating the kit

```bash
npx wize-dev-kit@latest update          # prepare the bump branch locally
npx wize-dev-kit@latest update --pr     # also push it and open the PR
```

In a git repo `update` works in a throwaway worktree:

1. It fetches and branches off `origin/<default>` (or the local default branch if the fetch fails, and says so).
2. In that worktree it bumps `kit_version`, refreshes the managed `.gitignore` block and the `AGENTS.md` bootstrap block (only in a kit-generated `AGENTS.md`), refreshes `hydrate.sh` when it is installed and managed, and untracks any tracked files under the 12 generated alias paths.
3. It commits on `chore/wize-kit-<version>` and removes the worktree.

Your checkout, branch, index and uncommitted files are never touched, and `update` never commits on the default branch, so you can run it from a dirty tree or a detached HEAD. `--pr` pushes without force (a rejected push exits 1 and tells you the remote branch diverged) and opens the PR with `gh`, or prints the GitHub compare URL when `gh` is missing.

| Flag | Effect |
|---|---|
| `--pr` | Push the branch and open a PR. Counts as consent to push. |
| `--in-place` | Edit the current checkout instead, re-render, never commit. Always the mode outside a git repo. |
| `--no-render` | With `--in-place`: skip the adapter re-render. |
| `--check` | Report only. Exit 0 converged, 11 changes pending, 12 pin ahead of the binary. |
| `--dry-run` | Print the plan, write nothing, exit 0. |
| `--base <ref>` | Branch off this ref instead of the default branch. |
| `--allow-downgrade` | Let the pin move to an older version. |
| `--json` | One JSON object on stdout. |

### Migrating an existing repo

Run `npx wize-dev-kit@latest update --pr` once per repo and merge the PR. One gotcha: the PR untracks the old alias files (for example `.cursor/rules/wize.mdc`) that earlier versions committed by accident. When another worktree pulls the merge, git deletes those files there. Run `hydrate` in that worktree, or let the session loop do it, and they come back as untracked, gitignored files.

## Harness matrix

`npx wize-dev-kit hooks print <target>` prints the Orca, Claude Code, Cursor, Codex and weekly-Action snippets below without writing anything (the Copilot cloud agent has no print target). `hooks install` writes the managed `.wize/hooks/hydrate.sh` (POSIX sh, always exits 0, prints to stderr) plus the config you ask for with `--claude`, `--cursor` or `--github-action`; it needs at least one of those flags.

| Harness | Setup |
|---|---|
| Orca | In `orca.yaml`: `scripts.setup: sh .wize/hooks/hydrate.sh` and `setupAgentStartupPolicy: wait-for-setup`. List `.wize/config/user.toml` in `.worktreeinclude`. A non-empty setup hook saved locally in Orca overrides `orca.yaml`, so clear it in the repo settings. |
| Claude Code | `hooks install --claude` adds a `SessionStart` entry (matcher `startup`) to `.claude/settings.json`, merged with your existing hooks. Add `.wize/config/user.toml` to `.worktreeinclude` to copy it into worktrees. |
| Cursor | `hooks install --cursor` writes `.cursor/worktrees.json` with `setup-worktree: ["sh .wize/hooks/hydrate.sh"]`. |
| Codex | Set the local environment's setup script to `sh .wize/hooks/hydrate.sh`. Codex keeps this in its own config, so the kit only prints it. |
| GitHub Copilot cloud agent | Add `npx --yes wize-dev-kit hydrate` as a step in `.github/workflows/copilot-setup-steps.yml`. |
| Weekly bump PR | `hooks install --github-action` writes `.github/workflows/wize-kit-update.yml`. Enable "Allow GitHub Actions to create and approve pull requests" in the repo settings. PRs opened with `GITHUB_TOKEN` do not trigger other workflows, so required checks wait until someone pushes to the branch. |

None of these has been verified end to end in each product; see the last section.

## What `git worktree remove` loses

Everything untracked in that worktree: `user.toml`, `.wize/scratch/`, `.wize/.local/`, `quick-dev-log.md`, and the generated adapters. All of it regenerates with `hydrate` except scratch notes and the quick-dev log, which exist only in that worktree. Commit or copy those first. `.wize/` artifacts (PRD, stories, knowledge) are tracked, so they travel with the branch.

## Concurrency

Several worktrees, or several agents in one worktree, can render at once. Every write goes through write-if-changed plus an atomic temp-file rename, so a reader never sees a half-written skill and a second run reports every file as unchanged. The tracked-file guard means `hydrate` cannot overwrite something you committed. `sync` and `update --in-place` write atomically but unguarded: they are the explicit regenerate commands.

## Environment variables

| Variable | Effect |
|---|---|
| `WIZE_PROJECT_ROOT` | Project root when you run a command outside it. `--root` wins over it. |
| `ORCA_WORKTREE_PATH`, `ORCA_ROOT_PATH` | Read by `hydrate` only: the worktree to render (used only when the current directory is not inside a project), and a source for `user.toml` (used only when it belongs to the same repository). |
| `WIZE_SKIP_BASELINE=1` | Skip the document-project baseline during `install`, and make `document-project quick` a no-op. |
| `WIZE_HYDRATE_DELEGATED` | Set by `hydrate` when it delegates to the pinned kit. Do not set it yourself. |
| `WIZE_DISABLE_UPDATE_CHECK=1` | No registry lookup; `update` action becomes `none`. |
| `WIZE_NO_BG_REFRESH=1` | Never start the background cache refresh. |
| `WIZE_VERBOSE=1` | Show the raw `npx` output of a failed delegated `hydrate` (normally one fallback line). |
| `CI` | Suppresses update hints and background refresh. |

## Exit codes

Defaults stay 0 so existing scripts keep working. The strict forms are opt-in.

| Command | Codes |
|---|---|
| `hydrate` | 0 always. `--strict` returns 1 when it could not hydrate. |
| `version-check --exit-code` | 0 nothing to do, 10 `hydrate`, 11 `update`, 12 `use-pin`, 13 `install`. |
| `update --check` | 0 converged, 11 changes pending, 12 pin ahead of the binary. |
| `doctor --strict` | 1 when any error-level suggestion exists. |

`doctor --json` and `version-check --json` print one JSON object, with no banner.

## Not in 0.27.0

- Shared `.wize` state across worktrees (symlink or state branch); sprint manifests, ID allocation for ADRs and stories, per-story document-project fragments, changelog fragments, a deterministic `index.md`, an epic NFR trigger, and `sprint-status.md` references outside `doctor`.
- Relative paths in `project-scan-report.json` (it still stores absolute paths).
- `wize-release` from a linked worktree, or release through a PR.
- A policy for `.wize/security/` (ignore or commit).
- Regenerating `AGENTS.md` beyond the bootstrap block; an `AGENTS.md` version marker.
- Pruning generated skills that a newer kit removed.
- `update` re-running itself as `@latest` from a stale pinned binary. The downgrade guard and `@latest` in the skills and the Action cover it.
- A team-level `[update] auto = false` knob. Only the environment variable exists.
- Writing `orca.yaml` or the Codex config. Both are print-only. No Windows variant of `hydrate.sh`.
- Renovate or Dependabot pinning, which would add a second source of truth for the pin.
- A hard refusal from `sync` on version skew, and a nonzero exit when an adapter fails.
- End-to-end checks in Orca (setup failure, trust prompt), Claude Code `SessionStart` timing against skill loading, and Cursor or Windsurf reading rules in worktrees.
