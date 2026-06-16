---
code: wize-qa-generate-e2e-tests
name: Generate E2E Tests
owner: wize-agent-test-architect   # Hawkeye
status: ready
---

# Generate E2E Tests

**Goal.** Translate UX screens + PRD ACs into concrete E2E test cases. Hawkeye produces the cases (names, steps, selectors, expected outcome); the user (or Shuri) writes the actual test bodies in the chosen framework.

Hawkeye drives. Mantis confirms UX fidelity. Shuri confirms selectors match the design system.

## When to run

- After `wize-ux-design` and `wize-create-prd` are validated.
- Before a story enters `in-progress` if the ACs are E2E-heavy.
- When the team adopts a new E2E framework and needs a baseline.

## When NOT to run

- Before UX design is ready (no screens = no cases).
- For unit tests (covered by `wize-tea-design`).
- For visual / a11y (separate audit, out of scope here).

## Inputs

- `.wize/planning/ux/ux-design/{screen}.md` — page specs.
- `.wize/planning/prd.md` — ACs.
- `.wize/solutioning/design-system/` — component + testid names.
- The active profile (web-overlay → Playwright; app-overlay → Detox; core-only → propose and let user pick).

## Output

- `.wize/implementation/tea/e2e-cases/{screen}.md` — one file per screen with the test cases.

## Steps

### 1. Map (UX screen → ACs)

For each screen, list the ACs that touch it. Cross-reference the PRD. If a screen has no ACs, flag it (gap).

### 2. Cases (3-10 per screen)

For each screen, generate 3-10 cases. For each case:
- **Name:** verb-led, in 1 line.
- **Pre-conditions:** setup (logged in, on screen X, etc.).
- **Steps:** numbered, observable actions.
- **Selectors:** `data-testid` values from the design system. If none exist, propose new ones.
- **Expected outcome:** what the test asserts.
- **Priority:** P0 (must pass before release) / P1 (should pass) / P2 (nice to have).

### 3. Selectors

Derive selectors from `design-system/` tokens + story notes. If a story has a `data-testid` map, prefer that. New selectors go into a "proposed testids" section; Mantis signs off in the next design-system sync.

### 4. Triage

Mark each case P0/P1/P2. P0 is the minimum viable E2E coverage. P1 expands happy paths. P2 covers edge cases.

### 5. Hand off

Notify the next workflow:
- Shuri → implement the P0 cases first.
- Mantis → sign off on the new testids.
- The user → confirm the framework choice if it is ambiguous.

## Output template

```markdown
---
screen: sign-in
generated: 2026-06-16
linked_acs: [AC-01-1, AC-01-2]
framework: playwright
---

# E2E cases — sign-in

## Map
- AC-01-1: user enters valid email + password
- AC-01-2: user enters invalid email → error message

## Cases

### P0 — happy path
- **Name:** Sign in with valid credentials
- **Pre-conditions:** not signed in; on /signin
- **Steps:** enter email; enter password; click "Sign in"
- **Selectors:** data-testid="email-input", data-testid="password-input", data-testid="signin-cta"
- **Expected outcome:** redirect to /dashboard; token in localStorage

### P0 — invalid email
- **Name:** Sign in with invalid email
- **Pre-conditions:** not signed in; on /signin
- **Steps:** enter "not-an-email"; enter password; click "Sign in"
- **Selectors:** data-testid="email-input", data-testid="email-error"
- **Expected outcome:** error text appears within 200ms; no redirect

## Proposed testids
- (none — using existing design system)

## Triage summary
- P0: 2
- P1: 0
- P2: 0
```

## Anti-patterns Hawkeye rejects

- Generating 50 cases per screen. (Cap at 10; surface the rest as out-of-scope.)
- Skipping the priority. (P0 is the contract; the rest is optional.)
- Inventing selectors not present in the design system. (Propose them, but flag for Mantis.)
- Auto-writing Playwright code. (Hawkeye proposes cases; the human writes the bodies.)
- Skipping the screen-to-AC mapping. (Coverage gap = bug.)

## Hand-off

> "E2E cases generated for {N} screens. {N0} P0, {N1} P1, {N2} P2. Files at `.wize/implementation/tea/e2e-cases/`. Next: implement P0 (Shuri), sign off new testids (Mantis)."
