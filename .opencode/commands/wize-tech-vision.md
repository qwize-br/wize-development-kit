---
description: "2-to-3-boundary: Tech Vision"
agent: wize-agent-solution-strategist
---

# Tech Vision

# Tech Vision

**Goal.** State the technical north star in one page. Stack family, runtime envelope, build/buy/borrow calls, non-negotiables. Fury sets the **shape**, not the libraries — Tony fills in inside the frame.

Output lands in `.wize/planning/tech-vision.md`. Tony reads this before drawing architecture. Hill references it when scoping. Hawkeye uses it when picking gate granularity.

## Inputs

- `.wize/planning/prd.md` (validated)
- `.wize/planning/ux/ux-design/` (so the runtime envelope respects the UX)
- `.wize/knowledge/document-project/` (brownfield only)
- Stack catalogs (per active overlay):
  - `src/web-overlay/stack-catalog.md`
  - `src/app-overlay/stack-catalog.md`

## Outputs

- `.wize/planning/tech-vision.md`

## Steps

### 1. Pick the stack family

By order of constraint:

1. **Audience reach.** Public + SEO-critical? Authenticated app? Native mobile required?
2. **Latency budget.** Sub-1s LCP on 3G or richer-but-slower OK?
3. **Team familiarity.** Favor what the team has shipped before unless the project truly demands new.
4. **Backend coupling.** Separate API / fullstack monolith / BaaS?
5. **Deploy target.** Edge / container / self-managed.

Don't pick libraries here. Pick the *shape*: "Next.js-class SSR fullstack on edge" or "React Native + Expo with a Supabase backend" or "Compose Multiplatform with Kotlin services."

### 2. State the runtime envelope

| Dimension | Decision |
|---|---|
| Language(s) of record | TS, Kotlin, etc. |
| Runtime(s) | Browser / Node / Edge / Native iOS / Native Android / JVM |
| Persistence | Postgres / SQLite / KV / cloud-native |
| Deploy target | Vercel / Cloudflare / Fly / EKS / EAS / etc. |
| Edge vs origin | Edge-first / origin-first |

### 3. Build / buy / borrow

For each capability the PRD implies, declare:

| Capability | Build | Buy | Borrow (OSS) |
|---|---|---|---|
| Auth | — | Clerk / Auth0 | NextAuth / Lucia |
| Payments | — | Stripe | — |
| Search | — | Algolia / Typesense Cloud | Meilisearch self-hosted |
| Queues | — | SQS / Cloud Tasks | BullMQ |
| Analytics | — | Amplitude | PostHog OSS |
| Email | — | Resend / Postmark | — |
| Realtime | — | Pusher / Ably | Supabase Realtime |

One row per capability. Empty cells are explicit choices.

### 4. Non-negotiables

The 2–5 things the team will not compromise on.

Examples:
- *"All endpoint responses ≤ 200ms p95 from the user's region."*
- *"Single source of truth for user data — no shadow stores."*
- *"PII never leaves the EU."*
- *"On-call burden ≤ 0.5 pages per engineer per week."*

These outrank PRD goals. If they conflict, Fury escalates.

### 5. Deferred (with triggers)

What we won't decide yet, and what would trigger the decision. Don't list "could be revisited"; list the *signal* that forces the decision.

- *"Multi-region storage: revisit when EU+US daily active users > 5k."*
- *"WebSockets vs SSE: revisit when realtime updates < 500ms become a PRD goal."*

### 6. Hand off

Mark `status: aligned`. Tony reads it as the frame; he can argue specific decisions but not redraw the family without escalating.

## Output template

```markdown
---
status: aligned
owner: Nick Fury
created: YYYY-MM-DD
---

# Tech Vision — {{project_name}}

## Stack family
Next.js-class SSR fullstack on edge, with Supabase Postgres as the system of record.

## Runtime envelope
| Dimension | Decision |
|---|---|
| Language | TypeScript end-to-end |
| Runtime | Edge (Vercel Edge Functions) + Node (server actions) |
| Persistence | Supabase Postgres (RLS) + PgBouncer |
| Deploy target | Vercel for app; Supabase managed for data |
| Edge vs origin | Edge-first for reads; origin for writes |

## Build / buy / borrow
| Capability | Decision |
|---|---|
| Auth | Buy — Supabase Auth |
| Payments | Buy — Stripe |
| Search | Buy — Algolia (1st year), revisit |
| Queues | Borrow — pg_cron + outbox pattern |
| Analytics | Borrow — PostHog OSS |
| Email | Buy — Resend |

## Non-negotiables
1. PII (incl. emails) stored in the user's region only.
2. p95 server response ≤ 200ms in the user's region.
3. Single auth identity per human (no shadow accounts).
4. On-call rotation never exceeds 0.5 pages/eng/week.

## Deferred
- Multi-region writes: revisit when EU active users > 2k.
- Native mobile clients: revisit when web TTI > 4s on > 20% of sessions or PRD demands offline.

## Constraints that drove this
- Brief constraint #2 (LGPD/GDPR) ruled out global-replica DBs.
- PRD goal G1 ruled in edge-first reads.
- Hiring tail in TypeScript ruled out Compose Multiplatform.
```

## Anti-patterns Fury rejects

- **Picking a library here.** That's Tony. Pick the *family*.
- **Non-negotiables that are aspirations.** "Always 100% uptime." Wrong. "Error budget ≤ 0.1% in EU region."
- **Deferred items with no trigger.** That's procrastination.
- **A non-negotiable that contradicts a PRD constraint silently.** Surface it, escalate it, decide it.

## Hand-off

> Tech vision at `.wize/planning/tech-vision.md`. Tony, build the architecture inside this frame. Hill, scope the PRD against the non-negotiables (item 1 means the global launch is back on the table only after EU baseline holds). Hawkeye, pick gate granularity assuming `policy = advisory`.
