---

code: wize-update
description: "Use quando o usuário pedir para atualizar o Wize Dev Kit, perguntar se há uma versão nova, ou quando o Wizer notar version skew (Step 2.5) e ele confirmar o update."
name: Update (Wizer)
module: orchestrator
owner: wize-orchestrator
status: ready
aliases: []
---

# Wizer · `/wize-update`

**Goal.** Bring the installed kit up to date safely: check the real version skew, show what changes before anything runs, get a one-line confirmation, apply it, report the result. Never a surprise — this rewrites files under version control.

## Step 1 — check version skew

If you have Bash, run:

```
npx wize-dev-kit version-check --json
```

Cheap by design: it reads a local 1h cache before touching the network, caps any registry call at ~1.5s, and degrades to `{"latest":null}` silently if offline — it never blocks this step.

Read `kit_version` from `.wize/config/project.toml` — that is the version **this project's** rendered skills are on. `version-check`'s `installed` field is the kit version currently resolved by `npx` (it can already be newer than what is rendered here, if someone bumped the resolved package without running `update`).

| Condition | Meaning |
|---|---|
| `latest` (registry) > `installed` | A newer kit exists upstream. |
| `installed` > project's `kit_version` | This project is behind what npx already resolves. |
| everything matches, or `latest` is `null` | Nothing to do — say so in one line and stop. Do not continue to Step 2. |

## Step 2 — show the jump, then confirm

State the version jump plainly (`{from} → {to}`). If you have Bash, `sed -n`/`cat` the relevant excerpt of `CHANGELOG.md` between those versions for a one-line summary of what changed — or trust the excerpt `update` itself prints in Step 3 and summarize that instead.

Ask one line: *"Atualizar o kit de {from} para {to}? Isso vai re-renderizar os adapters instalados (claude-code, generic, …) e regravar `kit_version` em `project.toml`."*

Never run Step 3 without this confirmation — it rewrites rendered skill/command files that live under version control, and the resulting diff should land as the user's own reviewed commit, not an unreviewed surprise.

## Step 3 — run it

On confirmation:

```
npx wize-dev-kit@latest update
```

Relay its output — it already reports per-adapter results and a CHANGELOG excerpt. It is idempotent and additive: it never touches `.wize/config/user.toml`, never removes custom agents/skills under `.wize/custom/`, and only rewrites the `kit_version` line in `project.toml`.

## Step 4 — close the loop

- Flag any adapter the output reported as `skipped` or `error` — those need a manual look.
- Repeat, in one line, that the IDE/harness needs a restart to pick up refreshed slash commands.
- Suggest reviewing the diff (`git status` / `git diff`) before committing — this is a real file change, not a no-op.

## When NOT to use

- No `.wize/` folder at all → this is a fresh install, not an update. Route to `npx wize-dev-kit install` (see `wize-onboarding`).
- The user only wants to know whether an update exists, without applying it → Step 1 alone answers that; do not push into Step 2/3 unasked.
