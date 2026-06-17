# Onboarding

> workflow: Onboarding

# Onboarding

**Goal.** First-contact triage after `npx wize-dev-kit install`. Decide greenfield vs brownfield, profile, objective, and route to the right persona. Always ask who the user is so the rest of the session feels personal.

Wizer drives. Each branch ends by handing off to a specific workflow with explicit handoff copy.

## Inputs

- `.wize/config/project.toml` (always present after install)
- `.wize/config/user.toml` (per-developer)
- `.wize/implementation/sprint-status.yaml` (when an active sprint exists)
- `.wize/planning/brief.md` (when Phase 1 started)
- `.wize/planning/prd.md` (when Phase 2 finished)
- Optional: chat message describing the user’s goal.

## Outputs

- A **single handoff message** naming the next workflow to run, with the user’s name.
- Optional: `.wize/knowledge/onboarding-summary.md` written when state is ambiguous.

## Steps

### 1. Greet the user

Read `name` from `.wize/config/user.toml`. Greet by name. Speak in `communication_language` from `project.toml`. If `name` is blank, ask once and persist it back to `user.toml` before continuing.

> "Welcome, {name}. You are at Wize onboarding for *{project_name}*."

### 2. Detect project state

Inspect, in order:

| Path | Meaning |
|---|---|
| `.wize/implementation/sprint-status.yaml` | Active sprint exists. |
| `.wize/planning/prd.md` | Phase 2 (PRD) is done. |
| `.wize/planning/brief.md` | Phase 1 (Brief) is done. |
| `.wize/knowledge/document-project/*.md` | Brownfield baseline exists. |
| `package.json`, `src/`, etc. | Brownfield signals (vs. greenfield). |

If multiple artifacts exist, treat the **latest** (PRD > brief > baseline) as the current phase.

### 3. State machine

- **S0 — No artifacts** → greenfield or no planning yet.
- **S1 — Baseline only** → brownfield, no brief.
- **S2 — Brief exists** → ready for PRD.
- **S3 — PRD exists** → ready for sprint planning.
- **S4 — Active sprint** → resume in-flight.

### 4. Branch by state

| State | Action | Hand-off |
|---|---|---|
| S0 | Ask: "What are we building?" Confirm: brownfield or greenfield. Offer `/wize-document-project` (brownfield) or `/wize-product-brief` (greenfield). | "Run `/wize-document-project` (Tony + Peggy) to baseline the repo, or `/wize-product-brief` (Pepper) to write a brief." |
| S1 | Read `document-project/overview.md`; summarize the project in 3 bullets. Offer brief. | "Repo baselined. Run `/wize-product-brief` (Pepper)." |
| S2 | Read `brief.md` (3 bullets). Offer PRD. | "Brief ready. Run `/wize-create-prd` (Maria Hill)." |
| S3 | Read `prd.md` summary + `architecture.md` (if present). Offer sprint planning. | "PRD ready. Run `/wize-sprint-planning` (Maria Hill)." |
| S4 | Read `sprint-status.yaml` and surface: which stories are in progress, last gate. | "Sprint active. Run `/wize-sprint-status` (Maria Hill) for the full picture." |

### 5. Confirm and exit

End every onboarding session with:

> "Onboarding complete. Next: `/wize-<next-workflow>` ({persona})."

Never auto-launch the next workflow. The user must confirm.

## When to skip

- When the user already knows what they want and explicitly invokes another workflow, route directly. Do not force onboarding.
- When `WIZE_SKIP_ONBOARDING=1` is set, print a 1-line state summary and exit.

## Anti-patterns Wizer rejects

- Launching the next workflow without confirmation.
- Re-asking the user’s name when it’s already in `user.toml`.
- Dumping the full project state to the user. Summarize in ≤ 5 bullets.
- Suggesting `wize-onboarding` from `/wize-help` once onboarding is complete. (Help should bypass onboarding for return users.)

## Hand-off

> "Onboarding done. You are at **{state}**. Next: `/wize-<next-workflow>` ({persona})."
