---
code: wize-ux-design
name: UX Design
phase: 2-plan
owner: wize-agent-ux-designer   # Mantis
absorbs: "WDS Freya — Phase 4 (Page Specs)"
status: ready
---

# UX Design

**Goal.** Turn scenarios into page-by-page specifications Tony can architect against and Shuri can implement. One spec per screen. Every spec answers: purpose, primary action, layout, content, interactions, states (loading/empty/error/success/disabled), accessibility, and metrics.

Mantis drives. Output lands in `.wize/planning/ux/ux-design/{screen-name}.md`.

## Inputs

- `.wize/planning/ux/ux-scenarios.md` (every screen traces back to ≥ 1 scenario)
- `.wize/planning/prd.md` (every screen advances at least one AC)
- `.wize/solutioning/design-system/` (when Mantis already wrote tokens; otherwise this runs in parallel with `wize-design-system`)
- Overlay playbooks if active:
  - `web-overlay/playbooks/wcag-aa.md`, `responsive-breakpoints.md`, `semantic-html.md`
  - `app-overlay/playbooks/apple-hig.md`, `material-design-3.md`, `touch-targets-and-gestures.md`, `permissions-ux.md`

## Outputs

- `.wize/planning/ux/ux-design/{screen-name}.md` (one per screen)
- `.wize/planning/ux/ux-design/index.md` (map of screens → scenarios → PRD ACs)

## Steps

### 1. Enumerate the screens

From the scenarios, list every screen needed to deliver the moment-of-truth. Name them by role + state: `signup-empty.md`, `signup-error.md`, `team-list-with-members.md`, `team-list-empty.md`. Empty/error/loading states are screens.

### 2. Per screen: fill the spec template

For each screen, write the spec below. Stay disciplined; if a section is empty, ask why.

### 3. Write the index

`index.md` is a single table mapping screen → scenarios touched → PRD ACs advanced. Tony reads this first; Hawkeye references it in `tea-design.md`.

### 4. Hand off

Mark `status: ready-for-architecture` on each spec. Notify Wizer; Tony reads next.

## Spec template (one file per screen)

```markdown
---
screen: signup-empty
status: ready-for-architecture
owner: Mantis
linked_scenarios: [S1]
linked_acs: [AC-01-1, AC-01-2]
---

# Sign up (empty state)

## Purpose
First contact: a manager wants to create an account. The goal of *this* screen is to collect work email + password with minimum friction, in service of scenario S1 moment-of-truth (3 invites within 5 minutes).

## Primary user action
Submit the form (CTA: "Create account").

## Layout (ASCII or Mermaid)

(web overlay)
```
┌─────────────────────────────────────────────────┐
│ Wize logo                          [Sign in →]  │
├─────────────────────────────────────────────────┤
│                                                 │
│           Create your team's account            │
│           ──────────────────────────            │
│           [ Work email           ]              │
│           [ Password (12+)       ]              │
│                                                 │
│           [    Create account    ]              │
│                                                 │
│           Already a member? Sign in              │
│                                                 │
└─────────────────────────────────────────────────┘
```

(app overlay note: stacked, top-aligned, system back disabled.)

## Content (copy)

- Headline: "Create your team's account"
- Sub: (none — keep the screen empty for focus)
- Field 1 label: "Work email"
- Field 1 placeholder: "name@yourcompany.com"
- Field 2 label: "Password"
- Field 2 helper text: "At least 12 characters."
- CTA: "Create account"
- Secondary: "Already a member? Sign in" → routes to /signin

## Interactions

- Click CTA with valid form → submit; show loading state; redirect on success.
- Click CTA with invalid form → set focus to first invalid field; show error region.
- Tab order: email → password → CTA → "Sign in" link.
- Enter on either field submits if both are valid.

## States

- **Loading:** CTA shows spinner; button is disabled; inputs remain editable.
- **Empty (this state):** placeholders visible; CTA disabled until both fields non-empty.
- **Error (inline per field):** error region appears under each field, `role="alert"`, identifies the rule and the fix.
- **Error (global):** Banner above headline if the back-end fails with a non-field error; provides a "retry" action.
- **Success:** redirect; no flash. The next screen owns acknowledgement.
- **Disabled:** CTA opacity 0.4; aria-disabled="true"; tooltip *"Fill both fields to continue"*.

## Accessibility notes

(web overlay)
- Both inputs have visible persistent labels (no placeholder-only).
- `lang="en"` on `<html>`.
- Error region: per-field `aria-describedby`, ALL `role="alert"` after first submit only.
- Contrast pairs all ≥ 4.5:1 in light mode, ≥ 4.5:1 in dark mode.
- 200% zoom: no horizontal scroll on 360px viewport.
- Skip link absent (no main nav before).

(app overlay)
- Apple HIG / Material 3 systemic input components.
- Dynamic Type / font scale: layout reflows at largest accessibility size; CTA pinned to bottom-safe-area.
- Touch targets ≥ 44pt (iOS) / 48dp (Android).
- VoiceOver order: headline → email → password → CTA → secondary link.

## Metrics

- Event `signup_completed` (Q7 success quote): fires after redirect.
- Event `signup_error_shown {rule}`: fires on inline error.
- Event `signup_abandoned`: fires on `beforeunload` if form had focus and CTA never fired.

## Open questions for Tony

- Should we use Auth0 hosted UI or our own form? (UX-decision is to keep our own; Tony decides feasibility.)
- Magic-link as an alternative path? Out of scope per PRD; Mantis recommends putting in *Out*.
```

## Index template

```markdown
# UX Design — index

| Screen | Scenarios | PRD ACs |
|---|---|---|
| signup-empty | S1 | AC-01-1, AC-01-2 |
| signup-error | S1 | AC-01-2 |
| onboarding-step-1 | S1 | AC-02-1 |
| team-list-empty | S1, S2 | AC-03-1 |
| team-list-with-members | S1, S2 | AC-03-2, AC-03-3 |
| invite-modal | S1, S2 | AC-02-2, AC-02-3 |
```

## Anti-patterns Mantis rejects

- **Specs without states.** A screen with no empty/error spec is half a spec.
- **Copy as marketing tone.** Use the user's voice. Cut "world-class," "delightful," "seamless."
- **Mystery icons.** Icons need accessible labels; if you can't name it, draw a word next to it.
- **Hover-only affordances on touch.** Spec the non-hover equivalent.
- **Touch targets < platform minimum.** 24×24 CSS px on web (WCAG 2.5.8), 44pt iOS, 48dp Android — non-negotiable.
- **Screens that don't trace to scenarios + PRD ACs.** If you can't fill the index row, the screen isn't justified.

## Hand-off

> UX specs are at `.wize/planning/ux/ux-design/`. Index points screen → scenario → AC. Tony, you can start `wize-create-architecture` now; the moment-of-truth lines in scenarios tell you which interactions are load-bearing. Hawkeye, `tea-design.md` should index by screen to keep test design and UI aligned.
