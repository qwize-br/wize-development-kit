---
code: wize-create-story
name: Create Story
phase: 4-implementation
owner: wize-agent-architect   # Tony writes; Shuri may refine
status: ready
---

# Create Story

**Goal.** Author one Pull-Request-sized story with crisp acceptance criteria, named touch-points, and a contract for Hawkeye's `tea-design.md`. This is the single most-edited artifact in the lifecycle; make it useful.

Tony drives. Shuri reads and proposes refinements before pulling the story.

## When to use

- New story splits from an epic (most common — done in `wize-create-epics-and-stories`).
- A story that comes in mid-sprint and needs a quick scaffold.
- A `tea-gate` waived rationale created a follow-up story.

## Inputs

- `.wize/solutioning/architecture.md`
- `.wize/solutioning/epics/{epic}.md`
- `.wize/planning/prd.md` (the AC list)
- (optional) `.wize/planning/ux/ux-design/{screen}.md`

## Output

- `.wize/solutioning/stories/{epic}/{story-id}.md`

## Steps

### 1. Name it by outcome

Verb-led, user-visible. *"Onboarding: invite first teammate"* not *"Build invite form."*

### 2. Frontmatter

```yaml
---
story_id: E01-S03
epic: 01-onboarding
status: ready-for-dev
priority: 2          # 1=now, 2=next, 3=later
estimate: M          # S | M | L  (XL → slice further before merging here)
linked_screens: [onboarding-step-1, invite-modal]
linked_acs: [AC-02-1, AC-02-2]
---
```

### 3. Context (3–5 lines)

What place this story occupies in the user journey, why it matters here, what it depends on.

### 4. ACs (lifted from PRD; not reworded)

Don't reword PRD ACs in a story — copy them verbatim. If they're not crisp enough, fix in the PRD first.

### 5. Out of scope

Explicit. Other ACs the user might think this story touches, with a one-line reason it's not here.

### 6. Notes for Shuri

- Touch points: files Shuri will likely edit.
- Reuse: components from `design-system` already named.
- `testid` map: names Hawkeye expects.
- Edge cases worth flagging (only ones not derivable from ACs).

### 7. Notes for Hawkeye

A one-paragraph hint: suggested split, fixtures, mocks, environment. Hawkeye writes the real `tea-design.md` but reads this hint.

## INVEST rules

Every story passes:

- **I**ndependent.
- **N**egotiable.
- **V**aluable.
- **E**stimable (Tony sizes).
- **S**mall (≤ 1 PR).
- **T**estable.

If any letter fails, fix before queueing.

## Estimation rough guide

- **S** ≤ 4h.
- **M** 4h–1d.
- **L** 1–2d.
- **XL** > 2d → split.

These are intervals, not commitments. Hill plans capacity against M-median.

## Full story template

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
After sign-up the admin lands on `/onboarding`. This story implements the first
moment-of-truth from scenario S1: inviting the first teammate.

## Acceptance criteria
- **AC-02-1:** Given a new admin on `/onboarding`, When they enter a valid email and click "Send invite", Then a `teammate_invited` event fires and the screen advances to "Invite sent" within 1s.
- **AC-02-2:** Given an invalid email, When the user blurs the field, Then error text appears (200ms) identifying which rule failed.

## Out of scope
- Bulk invite (multiple emails) — separate story E01-S07.
- Custom invite message — defer to E02-S03.
- "Skip for now" button — not a moment-of-truth path; out.

## Notes for Shuri (Dev)
- Touch points: `app/(onboarding)/invite/page.tsx`, `lib/email/send-invite.ts`, new server action `inviteTeammate`.
- Reuse: `Button` (primary), `Input`, `Banner` (success/error) from design-system.
- testid: `invite-form`, `invite-email`, `invite-cta`, `invite-sent-banner`.
- Idempotency: use `(team_id, email)` composite key.

## Notes for Hawkeye (TEA)
Suggested split: 4 unit, 1 integration, 1 E2E.
- Unit: validateInviteEmail, mailer payload, server action error mapping, retry policy.
- Integration: server action calls mailer with right args (MSW on Resend).
- E2E: happy path on Playwright @chromium @ios.
- Risk: R-1 (mailer) — extra E2E asserts banner within 1s of click.
```

## Anti-patterns Tony rejects

- **ACs reworded from PRD.** Source-of-truth drift.
- **Stories with no touch points.** Shuri spends an hour finding the files.
- **No notes for Hawkeye.** TEA designs in the dark.
- **Stories named by feature** ("Add invite button") — name by **outcome**.

## Hand-off

> Story E01-S03 ready. Shuri, pull when sprint allows. Hawkeye, `tea-design.md` for this story whenever you're ready.
