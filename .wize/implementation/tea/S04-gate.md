---
story: E09-S04
gate: gate
status: done
created: 2026-08-08
owner: Hawkeye
epic: 09-ux-intent
decision: PASS
policy: advisory
---

# Gate Decision — E09-S04: Research family consolidation

## AC → Test Traceability

| AC ID | Description | Evidence | Status |
|---|---|---|---|
| AC-S04-1 | `wize-research` is a dispatcher (classify → delegate) | `wize-research/workflow.md:10-12` — "This skill does NOT execute research directly — it routes to one of the specialized research skills." | PASS |
| AC-S04-2 | Classification guide with keywords (pt-BR + EN) | `wize-research/workflow.md:18-22` — 3 categories (Market, Domain, Technical) with keywords in both languages | PASS |
| AC-S04-3 | Market keywords → wize-market-research | `wize-research/workflow.md:20` — "concorrência, concorrentes, mercado, competidor, pricing…" | PASS |
| AC-S04-4 | Domain keywords → wize-domain-research | `wize-research/workflow.md:21` — "domínio, indústria, setor, regulatório, compliance…" | PASS |
| AC-S04-5 | Technical keywords → wize-technical-research | `wize-research/workflow.md:22` — "técnico, tecnologia, stack, biblioteca, framework…" | PASS |
| AC-S04-6 | Ambiguous → ask one clarifying question | `wize-research/workflow.md:38-41` — "Isso é pesquisa de mercado, domínio ou técnica?" | PASS |
| AC-S04-7 | Clear match → delegate without rephrasing | `wize-research/workflow.md:36` — "Delegate to the corresponding variant. Load that skill and hand off the user's question intact" | PASS |
| AC-S04-8 | Intent table routes "pesquisar" (genérico) → wize-research | `intent-routing.test.js:117` — PASS | PASS |
| AC-S04-9 | Intent table routes specific research intents to variants | `intent-routing.test.js:88,177,181` — market, domain, tech research | PASS |
| AC-S04-10 | Anti-pattern: never execute research directly | `wize-research/workflow.md:45` — documented | PASS |

## Test Results

- **Suite**: `npm test` — 532 pass, 0 fail, 5 skipped
- **Intent routing tests**: All research-related routing tests pass
- **No dedicated dispatcher tests**: The dispatcher is AI-native (the AI reads the classification guide and decides). No programmatic code to unit-test.

## NFR Assessment

- **Maintainability**: Single dispatcher with clear delegation rules. Each variant remains independent. Adding a new research variant requires: (a) new skill file, (b) entry in dispatcher's classification guide, (c) entry in intent table.
- **Reliability**: The dispatcher's "ask one clarifying question" fallback prevents silent misrouting. The anti-pattern section prevents the AI from executing research directly.
- **Performance**: No runtime overhead. The dispatcher is a workflow the AI reads and follows.

## Findings

1. **Finding**: The dispatcher is AI-native — it relies on the AI model reading the classification guide and applying keyword matching. There is no programmatic `classify()` function.
   **Impact**: Low. This is consistent with the wize-dev-kit architecture (all skills are AI-native workflows). The classification guide is explicit and testable via the intent routing table.
   **Recommendation**: None. Accept the AI-native approach.

2. **Finding**: The dispatcher delegates to variants but does not enforce that the variant actually runs. If the AI skips the delegation step, research would be incomplete.
   **Impact**: Low. The hand-off copy is explicit ("Pesquisa classificada como {{category}}. Delegando para {{variant}}."). The AI is instructed to load the variant skill.
   **Recommendation**: None.

3. **Finding**: No regression risk. `wize-research` was previously a standalone research skill. It is now a dispatcher. Existing invocations of `/wize-research` will now go through the classification step before delegating.
   **Impact**: Low. The behavior change is intentional — users who previously invoked `wize-research` directly will now get classified and routed to the most specific variant. This is an improvement.
   **Recommendation**: None.

## Gate Decision: PASS

**Rationale**: The dispatcher pattern is correctly implemented with a clear classification guide, delegation rules, and an ambiguity fallback. Intent table routing covers both the generic dispatcher and all three specialized variants. No regressions — existing `wize-research` invocations now benefit from classification. All tests pass.
