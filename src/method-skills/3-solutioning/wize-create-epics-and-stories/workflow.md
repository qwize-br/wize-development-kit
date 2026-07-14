---
code: wize-create-epics-and-stories
name: Create Epics and Stories
phase: 3-solutioning
owner: wize-agent-architect   # Tony Stark
status: ready
---

# Create Epics and Stories

**Goal.** Slice the PRD + architecture into **epics** (each ships value end-to-end) and **stories** (each is one focused PR-sized unit Shuri can implement and Hawkeye can test).

Tony drives. Output lands in `.wize/solutioning/epics/` and `.wize/solutioning/stories/`.

## Inputs

Read central docs first, then expand by dependency — don't load unrelated files for padding:

- `AGENTS.md` + `.wize/config/project.toml` — active profiles, languages, conventions.
- `.wize/planning/prd.md` — the AC source (never reword ACs downstream).
- `.wize/solutioning/architecture.md`
- `.wize/planning/ux/ux-design/` (every story references one or more screens)
- `.wize/knowledge/document-project/` — brownfield baseline, if present.

## Outputs

- `.wize/solutioning/epics/{NN}-{slug}.md`
- `.wize/solutioning/stories/{epic-NN}/{story-id}.md`

## Epic shape

An epic:
- Ships **value** on its own (a user can do the thing after this epic, even if the next one improves it).
- Lasts 1–3 sprints when in flight.
- Has 3–10 stories.
- Has a single trigger-map row as its anchor.

Epic file:

```markdown
---
epic_id: 01-onboarding
status: ready
owner: Tony Stark + Maria Hill
linked_prd: E01
trigger_map_row: 1
priority: 1
estimate: M
---

# Epic 01: Sign-up + first invite

## Outcome
A first-time team admin signs up, lands in onboarding, and invites at least one teammate within 5 minutes (trigger-map row 1 + 2).

## Stories
- E01-S01: Sign-up empty + happy path (AC-01-1, AC-01-2)
- E01-S02: Sign-up error states (AC-01-3, AC-01-4)
- E01-S03: Onboarding step 1 — invite first teammate (AC-02-1, AC-02-2)
- E01-S04: Email delivery + retry (AC-02-3)
- E01-S05: Team list empty + with first member (AC-03-1, AC-03-2)

## Dependencies
- Design tokens by Mantis (S0 — already done)
- Resend account configured (Tony, before S04)

## Success
All ACs of all stories PASS gate. Telemetry shows `teammate_invited` ≥ 80% of `signup_completed` users within 24h in the beta cohort.
```

## Story shape — INVEST

Each story passes:
- **I**ndependent — can be implemented without waiting for another in-flight story.
- **N**egotiable — wording can move; intent stays.
- **V**aluable — a real outcome to a real user (or a clear test path that proves a slice).
- **E**stimable — Tony can size: S/M/L/XL.
- **S**mall — fits in one PR (≤ 1 day for an experienced dev, including tests).
- **T**estable — every AC is observable.

If a story is XL, slice it before merging it to `stories/`.

## Slicing patterns (Tony's defaults)

| Pattern | When |
|---|---|
| Walking skeleton | When you need the full user path to exist (even with stubs) before going deep on any single screen. |
| By user role | Admin vs member often slice naturally. |
| By acceptance criterion | One AC = one PR when ACs are independent. |
| By happy / error path | Ship happy path first; error states next story. |
| By back-end / front-end | Avoid unless the back-end can ship usable without UI; otherwise it bundles. |
| By feature flag | When a story partially ships, use a flag and write the flag retirement story now. |

## Story file template

```markdown
---
story_id: E01-S03
epic: 01-onboarding
status: ready-for-dev
priority: 2
estimate: M
linked_screens: [onboarding-step-1, invite-modal]
linked_acs: [AC-02-1, AC-02-2]
---

# Story: Onboarding step 1 — invite first teammate

## Context
Comes right after sign-up. The user lands here with no team yet. The screen is the moment-of-truth from S1: if the user invites a teammate here, the product earned its value moment.

## Sources of truth (Shuri reads before coding)
- `AGENTS.md` + `.wize/config/project.toml` · `.wize/knowledge/document-project/*`.
- `prd.md` (AC source) · `architecture.md` · `ux-design/onboarding-step-1.md` · parent epic `01-onboarding.md`.
- The TEA test contract for this story · related code + tests already on this path.

## Acceptance criteria
- **AC-02-1:** Given a new admin on `/onboarding`, When they enter a valid email and click "Send invite", Then a `teammate_invited` event fires and the screen advances to "Invite sent" within 1s.
- **AC-02-2:** Given an invalid email, When the user blurs the field, Then error text appears (200ms) identifying which rule failed.

## Restrictions
- **Out of scope:** bulk invite → E01-S07; custom invite message → E02-S03.
- **Protected behaviors:** existing sign-up + session flow must not change.
- **Compatibility:** `(team_id, email)` idempotency key — don't break existing invite rows.
- **Security:** validate email at the server boundary; auth context required on `inviteTeammate`.

## Notes for Shuri (Dev)
- Touch points: `app/(onboarding)/invite/page.tsx`, new server action `inviteTeammate`, `lib/email/send-invite.ts`.
- Reuse `Button`, `Input`, `Banner` from design system.
- Add `data-testid="invite-form"`, `"invite-email"`, `"invite-cta"` (Hawkeye depends on these).

## Validation contract
- **AC → test:** AC-02-1 → E2E `invite happy path` + unit `validateInviteEmail`; AC-02-2 → unit `invalid email` + component error-state.
- **Required checks:** the unit/integration/E2E split Hawkeye declares below, plus lint, format, type-check, build. Authz asserted on the server action.
- **States:** loading, empty, error rendered and asserted.

## Notes for Hawkeye (TEA)
- Tests required: 2 unit (validation), 1 integration (server action calls mailer with right args), 1 E2E (happy path on Playwright).
- Mocks: outbound email via MSW; auth context via fixture.
- NFR sample: response p95 ≤ 800ms locally (NFR 1.A allows up to 1s end-to-end).

## Done means
Every AC has a passing test (mapped above), gate PASS/CONCERNS, story `status: ready-for-review`, knowledge axes updated if touched.
```

## Steps

### 1. From PRD backbone → epics

Each backbone story in the PRD becomes one epic. Name epics by outcome, not by feature: "Sign-up + first invite," not "Auth screens."

### 2. From scenarios → stories

For each epic, walk the linked scenarios in `ux-scenarios.md`. Slice into stories by the patterns above. Aim for 3–7 stories per epic.

### 3. ACs map exactly

Every story declares the AC IDs it advances (from PRD). The union of stories per epic equals the AC set of that epic — no gaps, no overlap.

### 3.5 Fill the contract fields

Each story carries its own **sources of truth**, **restrictions** (out-of-scope + protected behaviors + compatibility + security), and a **validation contract** (AC → test map + required checks). These aren't optional prose — they are what makes AC → code → test → gate traceable. A story missing them is not ready for dev.

### 4. Estimates

Story estimates S/M/L/XL. XL gets sliced before merging. If everything is L, slicing pattern is too coarse; revisit.

### 5. Hand off

- Mark all epics + stories `status: ready-for-dev`.
- Trigger `wize-check-implementation-readiness` (Tony, with Hawkeye on risk profile).
- After ready, Hill runs sprint planning.

## Anti-patterns Tony rejects

- **Stories without AC links.** No traceability → no gate later.
- **Stories that "ship a back-end."** Bundle with the front-end consumer unless a different team uses it independently.
- **XL stories.** Slice further or split into two PRs.
- **"Epic" that is one story.** Then it's a story.
- **Stories that share `testid` namespace.** They'll collide.

## Hand-off

> Epics and stories at `.wize/solutioning/`. 5 epics, 28 stories. All have ACs from the PRD. Run `wize-check-implementation-readiness`; Hawkeye, `tea-risk.md` next.
