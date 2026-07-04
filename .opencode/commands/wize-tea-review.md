---
description: "review: TEA Story Review"
agent: wize-agent-test-architect
---

# TEA Story Review

# TEA — Story Review

**Goal.** A structured review of one story before its gate decision. Distinct from Shuri's `wize-code-review` (which audits code health). This one audits **AC fulfillment, test discipline, and risk-spot coverage**.

Hawkeye drives. Runs at story end, right before `tea-gate`.

## Inputs

- Story file (the AC list, out-of-scope, notes).
- `tea-design.md` + `tea-trace.md`.
- Test run results (PR CI).
- Code diff (the PR).

## Output

- `.wize/implementation/tea/{epic}/{story}/review.md`

## Steps

### 1. AC check (per AC)

For each AC, observe the actual behavior on a staging or local build and decide: `met` / `partial` / `not-met`. Use the recorded video/screenshot when CI captured one (Playwright `screenshot: only-on-failure` or always for review tag).

### 2. Test discipline

Walk:
- Are `tea-design.md`'s declared tests present in code?
- Is every assertion meaningful (not just `expect(true).toBe(true)`)?
- Are selectors stable (role/label/testid) rather than brittle (CSS classes)?
- Are mocks at the network boundary (MSW) rather than in the unit under test?
- Are there `test.skip` or `test.only` left in?

### 3. Risk-spot coverage

If the story touches any `R-x` from the risk profile, walk the mitigation contract and confirm it's met.

### 4. Story scope discipline

Did the story stay within its declared scope? Any out-of-scope item that crept in is flagged in the review (and either moved to a new story or backed out).

### 5. Knowledge update check

Did this story touch any of the 5 `document-project` axes (architecture / conventions / risk-spots / dependencies / overview)? If yes, walk the PR diff and confirm the corresponding `.wize/knowledge/document-project/*.md` got 1–3 new lines this commit.

Decision:
- **Touched + updated** → record as PASS, no finding.
- **Touched + NOT updated** → record finding `KN-NN` (severity `medium`); recommendation: `gate CONCERNS` (advisory mode) or `gate FAIL` (enforcing).
- **Not touched** → write `knowledge: n/a` in the body, move on.

This is what keeps the brownfield baseline alive instead of stale. Without it, `document-project` is honest in week 1 and obsolete in week 24.

### 6. Findings

For each issue, write: severity (`low / medium / high`), what, why it matters, what to do.

### 7. Recommend gate outcome

Review doesn't *make* the gate decision (that's `tea-gate`); it recommends. Possible recommendations:
- `gate PASS`
- `gate CONCERNS` with N findings
- `gate FAIL` (only if a non-negotiable AC is `not-met`)
- `gate WAIVED` (only with documented reason + senior signoff)

## YAML frontmatter (canonical)

```yaml
---
gate: review
story_id: E01-S03
status: PASS
ac_check:
  - id: AC-02-1
    met: true
    evidence: "e2e/onboarding/invite.spec.ts::happy path passed on PR-#412; recording in CI artifact #412-1"
  - id: AC-02-2
    met: true
    evidence: "InviteForm.spec.tsx::error region announces"
knowledge_axes_touched: [conventions, risk-spots]
knowledge_axes_updated: [conventions, risk-spots]   # leave empty array if axes touched but no update happened
findings:
  - id: REV-01
    severity: low
    summary: "Empty-state copy slightly differs from Mantis' spec."
    recommendation: "Update `<EmptyTeamPanel>` heading to 'Invite your first teammate'."
    owner: shuri
    blocking: false
risk_links: [R-1]
recommendation: gate-PASS
created_at: 2026-06-11T20:00:00Z
---
```

## Body of `review.md`

```markdown
## Per-AC

### AC-02-1 — met
Evidence: E2E `e2e/onboarding/invite.spec.ts::happy path` passed locally + CI run #412. Banner appears 720ms after click (well within 1s NFR).

### AC-02-2 — met
Evidence: Unit + component test both pass. Manually walked screen-reader output — VoiceOver announces "Email — error — Enter a valid email." correctly.

## Test discipline
- All declared tests present.
- `data-testid` discipline solid (invite-form, invite-email, invite-cta, invite-sent-banner).
- No `test.skip` / `.only`.
- One snapshot test — small enough to be useful; not a tree snapshot.

## Risk coverage
- R-1 (mailer): integration test covers the right path; happy path E2E confirms end-to-end. PASS.

## Scope discipline
- Two minor copy tweaks crept in (out-of-spec; logged as REV-01).

## Findings
- REV-01 (low): empty-state copy.

## Recommendation
Recommend `gate PASS` with one low-severity finding to fix in a follow-up.
```

## Anti-patterns Hawkeye rejects

- **Review without walking the code.** Reading the test names isn't review.
- **AC marked "met" without observed evidence.** Tests passing + screenshot/recording, please.
- **Findings without owners.** Same as everywhere else in the kit.
- **Recommending PASS when an AC is `partial`.** No.
- **Recommending PASS when a non-negotiable NFR slipped.** That's a gate FAIL.

## Hand-off

> Review for E01-S03 at `.wize/implementation/tea/E01-S03/review.md`. All ACs `met`, one low-severity copy finding. Recommending `gate PASS`. Final at `wize-tea-gate`.
