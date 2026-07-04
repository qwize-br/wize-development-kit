---
description: "2-plan: UX Scenarios"
agent: wize-agent-ux-designer
---

# UX Scenarios

# UX Scenarios

**Goal.** Produce a scenario map that anchors all UX work. Eight focused questions; one short answer each. Scenarios are pieces of behavior, not personas — they're how *this* user, in *this* state, tries to accomplish *that* JTBD.

Mantis drives. Output lands in `.wize/planning/ux/ux-scenarios.md`. It's the bridge from PM intent (PRD) to designer concreteness (next workflow: `wize-ux-design`).

## Inputs

- `.wize/planning/prd.md` (validated)
- `.wize/planning/ux/trigger-map.md` (Pepper)
- `.wize/planning/brief.md`

## Outputs

- `.wize/planning/ux/ux-scenarios.md`

## Steps

### 1. Identify the scenarios

A scenario = one (user, state, JTBD) tuple where the product earns or loses. Aim for **3–8 scenarios** that, taken together, cover all backbone stories in the PRD.

Rules:
- One sentence each at this stage.
- Verb-led. *"New manager onboards their first team."* Not *"Manager onboarding."*
- Distinct. If two scenarios share trigger + state, collapse them.

### 2. Run the 8-question dialog per scenario (WDS Freya)

For each scenario, answer the eight questions. One paragraph per answer. No filler. Cite trigger-map row when relevant.

1. **Who is the user, in one sentence?**
   Role + context. *"A 38-year-old engineering manager at a 25-person SaaS, primarily on desktop, sometimes phone."*

2. **What state are they in when they arrive?**
   Emotion + situational context. *"It's Monday morning. They just got CTO's request to onboard 3 hires this sprint. They're alt-tabbing between Slack and Linear."*

3. **What are they trying to accomplish?** (JTBD)
   *"Add three teammates and assign each to the right project before the team standup at 10am."* Concrete.

4. **What would they do without our product today?**
   *"Slack screenshots of the project list to each new hire; have them sign up individually; cross-check who landed where."*

5. **What's the moment of truth — when they decide it works?**
   *"The first time they see all three names in the team list with the right project tags, in under 5 minutes."*

6. **What's the failure mode — when do they walk away?**
   *"If they can't tell whether the invite arrived. If the invite email looks like spam. If they have to leave the page to find someone's email."*

7. **What does success look like to them, in their words?**
   *"It just worked. I sent the invites, they signed up, they were on the right project."* (Imagine the future quote.)

8. **What's the next thing we want them to do?**
   *"Open the project where the first teammate landed and verify the access works."*

### 3. Cross-link to the PRD

For each scenario, list the **backbone story IDs** + **AC IDs** it touches. Mantis won't write specs for a scenario the PRD doesn't cover (it'd be scope creep); Hill won't sign off on a story the scenarios don't surface (it'd be over-spec).

### 4. Hand off to UX Design

Mark `status: ready-for-design`. Wizer pings Mantis to start `wize-ux-design`, where each scenario becomes one or more page specs.

## Output template

```markdown
---
status: ready-for-design
owner: Mantis
created: YYYY-MM-DD
covers_prd_stories: [E01, E02, E04]
---

# UX Scenarios — {{project_name}}

## Scenario 1: New manager onboards their first team

- **Trigger-map row:** 1 (Sign up), 2 (Invite first teammate)
- **PRD stories:** E01, E02
- **AC IDs touched:** AC-01-1, AC-01-2, AC-02-1, AC-02-3

**Q1 — Who:** A 38-year-old engineering manager at a 25-person SaaS, primarily on desktop, sometimes phone.
**Q2 — State:** It's Monday morning. They just got CTO's request to onboard 3 hires this sprint. They're alt-tabbing between Slack and Linear.
**Q3 — JTBD:** Add three teammates and assign each to the right project before the team standup at 10am.
**Q4 — Today:** Slack screenshots of the project list to each new hire; have them sign up individually; cross-check who landed where.
**Q5 — Moment of truth:** The first time they see all three names in the team list with the right project tags, under 5 minutes.
**Q6 — Failure mode:** Can't tell whether the invite arrived; the email looks like spam; they have to leave the page to find someone's email.
**Q7 — Success in their words:** "It just worked. I sent the invites, they signed up, they were on the right project."
**Q8 — Next thing:** Open the project where the first teammate landed and verify access.

## Scenario 2: Returning admin adds a fourth member months later

(…)

## Coverage check

| PRD story | Scenarios |
|---|---|
| E01 (Sign up) | S1 |
| E02 (Invite) | S1, S2 |
| E03 (Switch project) | S2 |
| E04 (Dashboard) | S1 |
```

## Anti-patterns Mantis rejects

- **Personas instead of scenarios.** Mantis cares what people *do*, not who they are in the abstract.
- **Scenarios with no emotion or context.** "User wants to sign up." — that's a backbone story restated. The point is the *state*.
- **JTBD written as features.** "Wants the dashboard." Wrong layer. Reword to the goal: "Wants to know if the team is healthy at a glance."
- **Q5 ("moment of truth") that's actually a feature description.** It should be the user's perception, not the UI.
- **More than 8 scenarios.** Two of them are duplicates. Find which.

## Hand-off

> Scenarios are in `.wize/planning/ux/ux-scenarios.md`. They cover E01–E04. Next: page specs in `.wize/planning/ux/ux-design/` (one per screen). Tony, when you read these, the moment-of-truth lines tell you which interactions are load-bearing.
