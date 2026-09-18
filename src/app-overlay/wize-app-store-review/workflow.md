---

code: wize-app-store-review
description: "Use no momento da publicação do app (antes de submeter para a App Store): audita código e metadados como um reviewer da Apple, prioriza riscos de rejeição e redige as reviewer notes."
name: App Store Review Gate
overlay: app
owner: wize-agent-test-architect   # Hawkeye is the gatekeeper; Shuri owns the fix pass
status: ready
---

# App Store Review Gate

**Goal.** Audit the app's source code and metadata from an **App Store reviewer's** point of view and produce a prioritized rejection-risk report — so the submission passes fast approval with minimal re-review risk. Fits in the publication flow: run **after** `wize-app-store-listing` (listing drafted) and **before** going live in prod via `wize-app-release-channels`.

Adapted to the Wize method from the [awesome-copilot apple-appstore-reviewer skill](https://github.com/github/awesome-copilot/blob/main/skills/apple-appstore-reviewer/SKILL.md) (MIT) — credited in the README.

## Rules of the pass

- **Change no code in this pass.** Hawkeye reviews and reports; fixes land after, via Shuri.
- Never invent features or claim something exists without evidence in code/config.
- Distinguish **assumptions** from **Unverified** items that need the smallest specific evidence.
- The [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) change — verify current wording when network is available before quoting a guideline.

## Output

- `.wize/planning/app/app-store-review-report.md`

## Steps

### 1. Identify the app's core

- What is the app's primary purpose? Top 3 user flows?
- What's required to use it (account, permissions, purchase)?
- Build system: SwiftUI/UIKit, RN/Expo/Flutter, iOS min version, dependencies.

### 2. Flag top rejection risks first (P0/P1)

Scan for:

- Missing/wrong `NS*UsageDescription` strings for permissions actually requested; vague justifications ("need camera"); launch-time permission asks without context.
- Privacy: data collection without disclosure, tracking/fingerprinting, missing PrivacyInfo.xcprivacy, missing privacy policy link.
- Broken IAP flows: subscription without visible restore purchases, misleading pricing, digital features gated behind external payments.
- Login walls without justification; "Sign in with Apple" compliance when third-party social logins exist; account deletion accessible in-app where applicable.
- Metadata mismatch with `wize-app-store-listing` output (listing copy vs actual behavior — misaligned copy is a rejection magnet).
- Claims needing substantiation (health, medical, financial, safety) without proper framing.
- Minimum functionality: empty states, placeholder screens, dead ends, broken network flows.

### 3. Compliance checklist by area

Systematically check: **Privacy & tracking → Permissions & entitlements → Monetization (IAP/Subscriptions) → Account & authentication → Content/UGC/external links → Technical stability → UX & reviewability.**

Conditional checks, only when relevant: **UGC (Guideline 1.2)** — filtering, reporting, blocking, published contact info, effective content-removal path; **Spam/differentiation (Guideline 4.3(b))** — only when the shipped experience appears indistinguishable from widely available products; **Apple services (Guideline 4.5.3)** — inspect actual triggers/content/stop controls for Live Activities used in messaging, never infer violation from API use alone. Report only applicable findings.

### 4. Write the report (fixed structure)

1. **Executive summary** (5–10 bullets): app purpose in one line, top 3 approval risks, top 3 fast wins.
2. **Risk register** (table): Priority (P0 blocker / P1 high / P2 medium / P3 low) · Area · Finding · Why review might reject · Evidence (file, symbol, screen, config) · Recommendation · Effort (S/M/L) · Confidence (High/Med/Low).
3. **Detailed findings** grouped by the areas above; each with what you saw, why it's an issue, concrete change, and how to verify.
4. **Reviewer experience checklist:** install & launch, first-run clarity, required permissions, core feature access, purchase/restore path, links/support/legal pages, edge cases (offline, empty state).
5. **Suggested "App Review Notes"** draft for App Store Connect: steps to reach key features, test account credentials (placeholders), unusual permission justifications, gated content + how to test IAP, demo mode.

### 5. Fix pass (after the report, on request)

- Hawkeye hands the prioritized register to **Shuri** for concrete fixes: code changes, permission-prompt/paywall/privacy wording samples, and a pre-submission checklist before re-riding the gate.

## Severity definitions

- **P0 — blocker:** very likely rejection, or app is non-functional for review.
- **P1 — high:** common rejection reason or serious reviewer friction.
- **P2 — medium:** risky pattern, unclear compliance, or quality concern.
- **P3 — low:** polish and improvements.

## Gate rule

No submission to production channels (`wize-app-release-channels` prod) while any **P0 or P1** is open in the register. Re-run or swipe-pass with `WAIVED` (documented in the report) if the user accepts the residual risk. **Unverified** items are not violations — list the minimal evidence needed.
