---

code: wize-update
description: "Use quando o usuário pedir para atualizar o Wize Dev Kit, perguntar se há uma versão nova, notar que as skills ou os comandos /wize sumiram (worktree nova), ou quando o Wizer detectar `action` hydrate ou update no Step 2.5."
name: Update (Wizer)
module: orchestrator
owner: wize-orchestrator
status: ready
aliases: []
---

# Wizer · `/wize-update`

**Goal.** Keep the kit healthy in this checkout. Hydrate it when its skills are missing, and prepare a kit bump as a branch and a PR. Hydrate and the isolated update run without asking. The confirmations are the `git push` and any edit to tracked files in the user's own checkout.

## Step 1 — read the state

If you have Bash, run:

```
npx --yes --fetch-retries=0 wize-dev-kit version-check --json
```

Obey `action`. Never compare versions by hand. If npx fails (offline), stop and say so.

| `action` | Do |
|---|---|
| `hydrate` | Step 2. |
| `update` | Step 3. |
| `use-pin` | Show the exact command `npx wize-dev-kit@<pin>`, with `<pin>` from `project.pin`. Stop. |
| `install` | No `.wize/` here: show `commands.install` and route to `wize-onboarding`. Stop. |
| `none` | One line saying the kit is up to date. Stop. When `reason` is `kit-not-on-branch`, say instead: merge the kit into this branch, or install here with `install --here`; run nothing. |

## Step 2 — hydrate

Run `commands.hydrate`. It renders the skills and commands for this checkout from `project.toml` and writes only git-ignored files, so it needs no confirmation. This is the path for a new worktree whose `/wize-*` commands are missing.

Then run Step 1 once more. If `action` is now `update`, continue to Step 3; otherwise stop. Do not run it a third time.

## Step 3 — update

Run `npx --yes wize-dev-kit@latest update`, without asking. It is local: it commits on a `chore/wize-kit-<version>` branch inside a temporary worktree and never touches this checkout, its index, or the default branch. Relay the branch name and the CHANGELOG excerpt it prints. It is idempotent, and it never touches `.wize/config/user.toml`, `.wize/custom/`, or any artifact.

## Step 4 — open the PR

Ask once: *"Abrir PR do bump do kit? (git push)"*. On a yes, run `npx --yes wize-dev-kit@latest update --pr`. On a no, stop after the branch.

Fallbacks:

- No `origin` remote: `update --pr` exits 1 and keeps the branch. Show `git push -u origin chore/wize-kit-<version>` for when a remote exists.
- No `gh`: relay the compare URL that `update --pr` prints.
- Not a git repo: `update` already edits in place. Say so and skip this step.
- The commit fails (a hook rejects it, or changes files outside the update): relay the hook's error and stop. Switching branches and `update --in-place` write into the user's own checkout, next to their uncommitted work, so offer that path and run it only after a yes.

Rules: never commit on the default branch, never force-push, never merge.

## Step 5 — close the loop

- Relay the PR URL, or the branch name when no PR was opened.
- Other worktrees hydrate themselves after the merge, on their next session.
- Repeat in one line that the harness needs a restart to pick up refreshed slash commands.
- Flag any adapter the output reported as `skipped` or `error`; those need a manual look.

## When NOT to use

- The user only wants to know whether an update exists: Step 1 alone answers that. Do not push into Step 3 unasked.
- No `.wize/` folder at all: this is a fresh install, not an update. Route to `npx wize-dev-kit install` (see `wize-onboarding`).
