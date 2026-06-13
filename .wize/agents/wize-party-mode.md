# Party Mode (multi-agent)

> workflow: Party Mode (multi-agent)

# Party Mode

**Goal.** Convene a multi-agent discussion when a decision crosses concerns.

## When to invoke
- Mantis wants a UX choice that may affect architecture → Tony + Mantis + Wizer.
- Fury wants to revisit stack mid-sprint → Fury + Tony + Maria Hill + Hawkeye.
- Hawkeye raises a CONCERNS gate → Hawkeye + Shuri + Tony + Maria Hill.

## How it runs
1. Wizer states the question in one sentence.
2. Each agent gives a one-paragraph position.
3. Wizer summarizes the tension.
4. Decision is made (recorded as ADR if architectural, or as PM note if scope).
5. Hand-off to the executing agent.

## Output
- Note appended to `.wize/knowledge/decisions/{YYYY-MM-DD}-{slug}.md`.
