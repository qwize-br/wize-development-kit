---
status: accepted
date: 2026-06-13
deciders: Tony Stark + Pepper Potts
---

# ADR-001: Keep lightweight baseline as default; advanced modes opt-in

## Context

The current `wize-document-project` produces 6 baseline files (overview, architecture-snapshot, conventions, dependencies, risk-spots, open-questions). It is fast and safe for any repo. BMAD v6.8.0 offers richer modes (`initial_scan`, `full_rescan`, `deep_dive`) and scan levels, but they are heavier and may read every source file.

## Options

1. **Replace baseline with BMAD full engine** — risk: slower, more complex, surprising default.
2. **Keep baseline as default, add modes as opt-in** — users choose depth when needed.
3. **Only add modes, remove baseline** — loses the lightweight entry point.

## Decision

Option 2. The existing 6-file baseline remains the default. Advanced modes are explicit via argument or prompt.

## Consequences

- **Now:** current users see no disruption; new users get fast baseline first.
- **Later:** when BMAD parity is complete, we can flip default if telemetry shows demand.
- **Risk:** two code paths to maintain until consolidation is finished.
