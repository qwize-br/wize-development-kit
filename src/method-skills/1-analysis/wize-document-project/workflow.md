---
code: wize-document-project
name: Document Project (brownfield baseline)
phase: 1-analysis
owner: wize-agent-analyst   # Pepper Potts (paired with Peggy Carter and Tony Stark)
status: ready
---

# Document Project — Brownfield Baseline

**Goal.** When the kit is installed in an existing repo, baseline the **as-is** state so the rest of the lifecycle isn't blind. Produces a structured snapshot Tony can read before designing the *to-be*, and a knowledge base Wizer can answer questions from.

Pepper drives discovery. Peggy edits prose. Tony validates architecture interpretation. Output lands in `.wize/knowledge/document-project/`.

## When to run

- The installer detected brownfield signals (`package.json`, `src/`, history) and offered to run this. ✓
- The team is onboarding to a codebase nobody fully owns. ✓
- A previous re-platforming decision left the docs stale. ✓

Skip:
- Greenfield (nothing to document yet).
- Repos < 200 LOC.

## Inputs

- The target repo (root).
- `git log --since="1 year ago" --oneline | wc -l` to scope.
- Any prior README / ARCHITECTURE / docs that exist.

## Outputs

- `.wize/knowledge/document-project/overview.md` — what the project is, who uses it, how big it is.
- `.wize/knowledge/document-project/architecture-snapshot.md` — current components, integrations, data flow.
- `.wize/knowledge/document-project/conventions.md` — coding/test/folder conventions actually used.
- `.wize/knowledge/document-project/dependencies.md` — runtime deps + dev deps + their roles.
- `.wize/knowledge/document-project/risk-spots.md` — areas of concentrated complexity, undocumented behavior, or known fragility.
- `.wize/knowledge/document-project/open-questions.md` — things the code doesn't answer; route to humans.

## Steps

### 1. Inventory (Pepper, mechanical)

A first pass that requires no judgment, just listing.

```
ls -la                                  # top-level layout
cat package.json | jq '.dependencies, .devDependencies, .scripts'
git log --since="3 months ago" --oneline | wc -l
git log --pretty=format:"%an" | sort | uniq -c | sort -rn | head
find . -name "*.test.*" -o -name "*.spec.*" | wc -l
find . -type f -name "*.md" | head
```

Write what you found in `overview.md` (no opinions yet).

### 2. Architecture snapshot (Pepper + Tony)

Walk the repo top-down. Identify:
- **Entry points** (CLI, server, worker, build).
- **Components** (where the boundaries are — by folder, by package, by feature).
- **Integrations** (databases, queues, external APIs, third-party SDKs).
- **Data flow** for at least one end-to-end critical path (e.g., a typical user request).

Draw or describe. Diagrams in ASCII or Mermaid are fine — the point is shared mental model.

Tony validates. If the snapshot misnames a pattern, fix it.

### 3. Conventions (Peggy)

Sample 5–10 files across the repo. Note:
- Naming (camelCase / snake_case / kebab-case).
- Folder structure (feature-first / layer-first).
- Test placement (co-located / `__tests__` / `test/`).
- Comment style (JSDoc / TSDoc / inline).
- Import ordering (alphabetical / by source).
- Logging / error handling patterns.
- Linter / formatter config (eslint, prettier, etc.).

Write the convention found, not the convention you'd prefer.

### 4. Dependencies (Pepper)

For each runtime dep, write one line:
- Name, version, what it does in this repo, whether it's load-bearing.

Flag:
- Deps without a clear role.
- Deps with known CVEs (run `npm audit --omit=dev` and capture).
- Multiple deps doing the same job (`lodash` + `ramda`, both date libs, etc.).
- Deps not maintained in > 2 years (link to last release).

### 5. Risk spots (Pepper + Tony)

For each, name the area + the symptom + the likely cause + how confident you are:

| Area | Symptom | Likely cause | Confidence |
|---|---|---|---|
| `src/legacy/billing/` | 2k-line file with no tests | rushed migration in 2024 | high |
| Webhooks handler | Silent retries | no idempotency layer | medium |
| Auth middleware | Custom JWT parsing | predates the library that handles it | high |

This is *not* a refactor backlog. It's a map. Tony decides what to fix; this just makes the choices visible.

### 6. Open questions (everyone)

Things the code does NOT answer:
- Why was this choice made?
- What's the SLA?
- Who's the owner of feature X?
- Are there secret configs we're missing?

Each question gets an owner (a human Pepper will ask). Route back via Wizer.

### 7. Hand-off

- Mark all docs `status: baseline`.
- Tell Wizer: *"Baseline complete. Tony can read it before architecture work; Hill can read it before scoping."*

## Conventions doc — template

```markdown
---
status: baseline
owner: Pepper Potts + Peggy Carter
created: YYYY-MM-DD
sampled: 8 files across src/, tests/, scripts/
---

# Conventions (observed, not prescribed)

## Naming
- Files: kebab-case (e.g., `user-profile.ts`).
- Classes: PascalCase.
- Functions: camelCase, verb-led.
- Constants: UPPER_SNAKE_CASE.

## Folder structure
Feature-first: `src/features/<feature>/{index.ts, api.ts, ui.tsx, *.spec.ts}`.
Shared utilities in `src/shared/`.

## Tests
Co-located with the file under test. `.spec.ts` for unit; `.e2e.ts` for end-to-end (separate runner).

## Lint/format
`eslint.config.mjs` with `airbnb-base` + custom rules in `eslint.local.cjs`. Prettier with 2-space indent.

## Observed deviations
- `src/legacy/billing/` doesn't follow feature-first; it predates the convention.
- Some files use `_test.ts` suffix instead of `.spec.ts` — older code.
```

## Anti-patterns Pepper rejects

- "TODO: document later." The baseline IS the documentation pass; later doesn't come.
- Romanticizing the code ("clean, modular"). Describe what you see; let Tony judge.
- Architecture diagrams that show what the team *wishes* exists. Diagram the real state.
- Risk-spot table with no confidence label. Without confidence, readers can't act.
- Open questions with no owner. They never get answered.

## Hand-off

> Baseline is in `.wize/knowledge/document-project/`. Three risk spots flagged. Five open questions routed to the humans named per question. Tony can read this before drawing `architecture.md`; Hill can scope the PRD knowing what's already there.
