---
code: wize-web-scaffold
name: Web Scaffold
overlay: web
owner: wize-agent-architect   # Tony executes; Fury approves stack family
status: stub
---

# Web Scaffold

**Goal.** Scaffold an empty-but-runnable web app per chosen stack.

## Supported stacks (catalog)
- Next.js + React + Tailwind
- Vue / Nuxt + Tailwind
- SvelteKit
- Astro
- Remix
- Laravel + Vue (Inertia)
- Supabase backends
- Drizzle / Prisma ORMs

## Steps
1. Stack interview (Tony asks; Fury approves).
2. Run `npx create-{stack}` or the equivalent.
3. Wire up design tokens from `.wize/solutioning/design-system/tokens.json`.
4. Configure linter, formatter, and test runner.
5. Generate baseline routes from `.wize/planning/ux/ux-design/`.
6. Commit "initial scaffold (story E00-S01)".

## Output
- A bootable app + first commit.
