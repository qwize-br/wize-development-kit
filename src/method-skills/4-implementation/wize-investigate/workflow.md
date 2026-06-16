---
code: wize-investigate
name: Investigate
phase: 4-implementation
owner: wize-agent-dev   # Shuri (+ wize-agent-test-architect Hawkeye on call)
status: ready
---

# Investigate

**Goal.** Structured root-cause analysis for a failed test, regression, or unexpected behavior. Produces a written report so the team (and future-you) can retrace the steps.

Shuri drives. Hawkeye on call for test-specific analysis. Wizer is on call for cross-cutting impact.

## When to run

- A test fails and the cause is not obvious from the diff.
- A regression appears in production or CI.
- A user reports a bug with unclear repro steps.
- An incident triggers post-mortem.

## When NOT to run

- The cause is obvious from the diff → use `wize-quick-dev` to fix directly.
- A new feature is needed (use `wize-create-story`).
- A security finding is suspected (escalate immediately; do not investigate solo).

## Inputs

- The failing test, error log, or user report.
- The commit range since the last known-good state.
- The relevant story file (if any).
- A free-form description of the symptoms.

## Output

- `.wize/implementation/investigations/{YYYY-MM-DD}-{short-slug}.md` — a written report.

## Steps

### 1. Frame

One paragraph: what broke, when it was first noticed, who reported it, and how serious. If you cannot write this in 3 sentences, the report is too broad.

### 2. Reproduce

Step-by-step: how to reproduce locally. Include environment (OS, Node version, branch), commands, expected vs. actual output. If unreproducible, mark "not reproducible after N attempts" and stop.

### 3. Hypothesize

List 3 root causes, ranked by likelihood. For each:
- What would explain the symptoms.
- A 1-line test to confirm or refute.
- Confidence: low / medium / high.

### 4. Verify

For each hypothesis, run the 1-line test. Record: confirmed / refuted / inconclusive. If all refuted, return to step 3 and re-rank.

### 5. Conclude

Pick the surviving root cause. State:
- **Root cause:** {description}.
- **Fix path:** {one paragraph: what to change and why}.
- **Effort:** S / M / L.
- **Risk of fix:** low / medium / high.
- **Recommended next step:** open a quick-dev, open a story, or escalate.

### 6. Hand off

Notify the next workflow:
- S / low risk → `/wize-quick-dev` (Shuri fixes directly).
- M+ or higher risk → `/wize-create-story` (new story for the fix).
- Escalation → `/wize-correct-course` (involve PM + Wizer).

## Output template

```markdown
---
date: 2026-06-16
author: Shuri
severity: high
related_story: E04-S02
related_test: test/document-project-classify.test.js
status: concluded
---

# Investigation — {short-slug}

## Frame
{one paragraph}

## Reproduce
1. ...
2. ...
**Expected:** {x}
**Actual:** {y}

## Hypotheses
1. **{hypothesis}** — Confidence: high. Test: {1-liner}. Result: confirmed.
2. ...

## Conclude
- **Root cause:** {description}
- **Fix path:** {one paragraph}
- **Effort:** M
- **Risk of fix:** low
- **Next:** /wize-create-story (E04-S05)
```

## Anti-patterns Shuri rejects

- Skipping the hypothesis ranking. (Ranking forces you to consider alternatives.)
- Stopping at "I think it's X" without the verification test. (Confirmation bias.)
- Mixing the investigation with the fix. (Investigate, then propose; do not edit code yet.)
- One-paragraph reports. (If it's a real investigation, it's at least 5 sections.)
- Sharing the report only in chat. (Always write to disk for archival.)

## Hand-off

> "Investigation concluded. Root cause: {summary}. Next: `/wize-create-story` (M+ fix) or `/wize-quick-dev` (S fix)."
