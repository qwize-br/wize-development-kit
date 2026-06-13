# TEA Traceability

> trace: TEA Traceability

# TEA — Traceability

**Goal.** Map every Acceptance Criterion to **one or more concrete tests in the repo**. Reports honest coverage: `covered`, `partial`, `missing`. A story with `missing` rows cannot pass gate.

Hawkeye drives. Runs while Shuri implements (or right after PR open).

## Inputs

- Story file (the AC list).
- `tea-design.md` (the test contract).
- Repo (the actual test files).

## Output

- `.wize/implementation/tea/{epic}/{story}/trace.md`

## Steps

### 1. Walk every AC

For each AC ID:
- Find the test(s) that exercise it.
- Reference the file + test name precisely.
- Decide status: `covered` (every assertion of the AC has a test) / `partial` (some assertions only) / `missing` (no test).

### 2. Compute coverage score

- `covered_count / total_acs`.
- Reported but doesn't drive gate alone; the **per-AC status** drives gate.

### 3. Flag holes

For every `partial` / `missing`, write what's needed in one line. Hawkeye proposes the test; Shuri writes it.

### 4. Hand off

If everything is `covered`, status `PASS`. Otherwise `CONCERNS` (advisory) or `FAIL` (enforcing) until holes are closed.

## YAML frontmatter (canonical)

```yaml
---
gate: trace
story_id: E01-S03
status: PASS
coverage:
  - ac_id: AC-02-1
    status: covered
    tests:
      - "src/onboarding/invite/__tests__/validateInviteEmail.spec.ts::valid email"
      - "src/onboarding/invite/__tests__/inviteTeammate.spec.ts::calls mailer with right args"
      - "e2e/onboarding/invite.spec.ts::happy path on Playwright @chromium"
  - ac_id: AC-02-2
    status: covered
    tests:
      - "src/onboarding/invite/__tests__/validateInviteEmail.spec.ts::invalid email rules"
      - "src/onboarding/invite/__tests__/InviteForm.spec.tsx::error region announces"
created_at: 2026-06-11T15:30:00Z
---
```

## Body of `trace.md`

```markdown
## Per-AC

### AC-02-1 — covered
Tests:
- `validateInviteEmail.spec.ts::valid email`
- `inviteTeammate.spec.ts::calls mailer with right args`
- `e2e/onboarding/invite.spec.ts::happy path`

### AC-02-2 — covered
Tests:
- `validateInviteEmail.spec.ts::invalid email rules`
- `InviteForm.spec.tsx::error region announces`

## Edges (from `design.md`)

- E1 (empty) — covered (validateInviteEmail.spec.ts::empty).
- E3 (idempotency) — **partial**. Integration test exists but doesn't assert second insert is no-op. Propose: assert `db.invites.count({ email, team_id })` = 1 after two calls.
- E4 (offline) — **missing**. Propose: Playwright `context.setOffline(true)` before click; assert offline banner.

## Action items
- Shuri: add the missing offline E2E (or split into next story; flag in `review.md` then).
- Hawkeye: re-run trace once PR has the new tests.
```

## Anti-patterns Hawkeye rejects

- **Trace by file count, not per-AC.** "We have 24 tests" tells you nothing. Per AC, please.
- **Counting passing CI as trace.** CI passes when a test exists; trace cares whether the test exercises the AC.
- **`partial` left unflagged.** Either close or list as a known-open with story link.
- **Re-naming tests after trace.** The trace breaks; Shuri renames in agreement with Hawkeye or doesn't rename.

## Hand-off

> Trace for E01-S03 at `.wize/implementation/tea/E01-S03/trace.md`. All ACs `covered`. Two edges still open (E3, E4); proposing follow-up. Ready for `tea-review`.
