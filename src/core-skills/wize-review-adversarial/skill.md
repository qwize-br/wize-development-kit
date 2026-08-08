---

code: wize-review-adversarial
description: "Use quando um artefato (story, arquitetura, PRD) precisar de revisão adversarial — testar a ideia sob quatro personas hostis."
name: Adversarial Review
module: core
status: stub
subtask: true
---

# Adversarial Review

Red-team review of an artifact. Used by Hawkeye on stories/architecture and by Peggy on prose.

## Method
1. **Pretend you hate this idea.** Find three reasons it fails.
2. **Pretend you'll have to maintain it for 3 years.** What hurts?
3. **Pretend you're an attacker.** What's the abuse vector?
4. **Pretend you're a new hire.** What's confusing?

## Output
Findings appended to the source artifact with `## Adversarial review` section.
