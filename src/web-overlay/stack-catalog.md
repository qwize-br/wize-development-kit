---
catalog: web-stack
owner: wize-agent-architect   # Tony (with Fury on strategy)
applies_when: web-overlay active
status: ready
---

# Web Stack Catalog — Tony's Reference

Tony reads this during the architecture interview. The catalog is opinionated but lists trade-offs honestly; the final pick depends on the PRD audience, Fury's NFR budget, and team comfort.

## 1. Decision dimensions

Pick by **dimension order**, not "which framework I like":

1. **Audience reach** — public marketing + SEO, or authenticated app?
2. **Latency budget** — sub-1s LCP on 3G, or richer-but-slower OK?
3. **Team familiarity** — favor the boring choice the team has shipped before.
4. **Backend coupling** — separate API, fullstack monolith, or BaaS?
5. **Deploy target** — edge platform, container, or self-managed?

## 2. Front-end frameworks

### Next.js (React)

| | |
|---|---|
| **Pick when** | SEO-critical pages + product app in one codebase. Strong ecosystem. |
| **Strengths** | App Router (RSC), edge runtime, ISR, large hiring pool. |
| **Costs** | RSC mental model still maturing; vendor lock-in toward Vercel optional but present. |
| **Bundle baseline** | React runtime ~45 KB gz + framework code. |
| **Best for** | Public products needing SEO + auth product behind same domain. |

### Nuxt 3 (Vue)

| | |
|---|---|
| **Pick when** | Vue-shop wanting Next-tier DX. |
| **Strengths** | Composition API ergonomics, auto-imports, modules ecosystem. |
| **Costs** | Smaller third-party SDK coverage than React. |
| **Bundle baseline** | Vue runtime ~30 KB gz. |
| **Best for** | Marketing + dashboard hybrid where Vue is the team's stack. |

### SvelteKit

| | |
|---|---|
| **Pick when** | Smallest runtime + fastest TTI. |
| **Strengths** | Compile-to-no-runtime, intuitive reactivity, edge-first. |
| **Costs** | Smaller hiring pool, fewer enterprise integrations. |
| **Bundle baseline** | ~0 KB framework runtime; only your code. |
| **Best for** | Latency-sensitive products, content-heavy + interactive. |

### Astro

| | |
|---|---|
| **Pick when** | Content-first (docs, marketing, blog) with islands of interactivity. |
| **Strengths** | Zero-JS by default; mix frameworks per island. |
| **Costs** | Not a SPA; not the right tool for heavy state apps. |
| **Bundle baseline** | ~0 KB unless you opt into an island. |
| **Best for** | Marketing sites, docs portals, mostly-static products. |

### Remix

| | |
|---|---|
| **Pick when** | Forms + nested routes + progressive enhancement matter. |
| **Strengths** | Web fundamentals first; great for "works without JS" requirements. |
| **Costs** | Smaller community than Next; some patterns ported back to Next. |
| **Bundle baseline** | React runtime + Remix glue. |
| **Best for** | Form-heavy apps (admin, e-commerce flows). |

### SPAs without SSR (CRA-style, Vite + React/Vue/Svelte)

| | |
|---|---|
| **Pick when** | Authenticated app behind login; SEO not required. |
| **Strengths** | Simplest mental model; fast iteration. |
| **Costs** | Slow LCP for first-time visitors; no SEO. |
| **Best for** | Internal tools, dashboards, B2B authenticated apps. |

### Laravel + Vue (Inertia)

| | |
|---|---|
| **Pick when** | PHP back-end exists + team is PHP-fluent. |
| **Strengths** | Server-rendered routing + SPA UX; great DX in monolith mode. |
| **Costs** | PHP hosting realities; smaller real-time ecosystem. |
| **Best for** | Brownfield Laravel apps modernizing the front-end. |

## 3. Back-end / data layer

### Supabase

| | |
|---|---|
| **Pick when** | Need Postgres + auth + storage + realtime with low setup. |
| **Strengths** | Full Postgres power, RLS, edge functions, GoTrue auth. |
| **Costs** | Lock-in to Supabase service surface (mitigated by being Postgres underneath). |

### PlanetScale / Neon (managed Postgres)

| | |
|---|---|
| **Pick when** | Need managed serverless Postgres without the rest of Supabase. |
| **Strengths** | Branching DBs, generous free tiers, edge-friendly. |
| **Costs** | You ship your own auth, storage, realtime. |

### Drizzle ORM

| | |
|---|---|
| **Pick when** | TypeScript-first ORM, edge-runtime compatibility matters. |
| **Strengths** | Tiny runtime, SQL-y; great for serverless. |
| **Costs** | Smaller ecosystem than Prisma. |

### Prisma

| | |
|---|---|
| **Pick when** | Larger team; tooling and migrations are paramount. |
| **Strengths** | Excellent migrations, generated client, mature ecosystem. |
| **Costs** | Heavier runtime; edge story improved but not as native as Drizzle. |

### tRPC

| | |
|---|---|
| **Pick when** | Single TS monorepo, server + client share types. |
| **Strengths** | Type-safe end-to-end; minimal overhead. |
| **Costs** | Not language-agnostic; OpenAPI shim needed for external consumers. |

### GraphQL (Apollo / urql / Relay)

| | |
|---|---|
| **Pick when** | Many client consumers, federated data sources. |
| **Strengths** | Per-client shape, schema-first design. |
| **Costs** | Server complexity; caching nuance; not always worth it for one client. |

## 4. Authentication

| Choice | Pick when |
|---|---|
| Supabase Auth (GoTrue) | Using Supabase already. |
| Clerk / Auth0 | Need polished UI + SSO out of the box; team avoids auth complexity. |
| WorkOS | Enterprise SSO + SCIM from day one. |
| Lucia | Self-hosted, TS, full control, smaller team. |
| Roll-your-own | Almost never. |

## 5. Hosting / deploy

| Choice | Pick when |
|---|---|
| **Vercel** | Next.js / Nuxt / SvelteKit, edge functions, generous DX. |
| **Cloudflare Pages + Workers** | Latency, global edge, low cost. |
| **Fly.io** | Need a real container with TCP, sticky regions. |
| **Coolify** (self-hosted PaaS) | Want Vercel-ish DX on own infra. |
| **Render / Railway** | Container apps + databases under one billing. |
| **Self-hosted Docker** | Heavy compliance constraints. |

## 6. Styling

| Choice | Pick when |
|---|---|
| **Tailwind CSS** | Token-first design system, utility-class team comfort. |
| **CSS Modules** | Component-scoped, no runtime, easy SSR. |
| **Vanilla Extract** | Type-safe styling at build time. |
| **shadcn-ui / Radix Primitives** | Need accessible primitives without ceding design. |
| **Linaria / Compiled** | CSS-in-JS without runtime cost. |

Mantis owns tokens (`.wize/solutioning/design-system/tokens.json`); Tony picks the system that maps those tokens cleanly.

## 7. State management

| Choice | Pick when |
|---|---|
| **React Server Components / Suspense** | Most data is server-derived. |
| **TanStack Query** | Heavy client-side data + caching. |
| **Zustand** | Small global state; no boilerplate. |
| **Jotai** | Atoms feel right for the domain. |
| **Pinia** (Vue) | Default Vue store. |
| **Redux Toolkit** | Time-travel, complex async pipelines, large team. |

## 8. Forms

| Choice | Pick when |
|---|---|
| **React Hook Form + Zod** | Type-safe schemas, low re-render count. |
| **Conform** | Server-progressive enhancement (Remix). |
| **TanStack Form** | TanStack ecosystem, schema-agnostic. |

## 9. Anti-patterns Tony flags fast

- Mixing **SSR + heavy client state** without a clear seam.
- Loading `lodash` for one function.
- Using **Redux for an app with 3 stores** of 5 keys each.
- Picking a tech because it's on a HackerNews front page.
- Defaulting to GraphQL for a one-client app.

## 10. Recording the choice

Tony writes the chosen stack into:

- `.wize/planning/tech-vision.md` (Fury): family + non-negotiables.
- `.wize/solutioning/architecture.md` (Tony): concrete picks + reasons.
- `.wize/solutioning/adrs/ADR-001-stack.md`: the trade-off log for future readers.
