---
status: baseline
owner: Pepper Potts + Tony Stark
created: 2026-06-13
last_refreshed: 2026-06-13
---

# Architecture Snapshot

## Entry points

1. **npm / npx** → `bin` in `package.json` maps `wize-dev-kit` to `tools/installer/wize-cli.js`.
2. **GitHub Actions** → `.github/workflows/publish.yml` runs tests, structural validation, smoke E2E, npm publish, and GitHub Release creation.
3. **IDE slash commands** → after `wize-dev-kit install`, each selected IDE loads rendered skills/agents (e.g. `/wize-help`, `/wize-document-project`).

## Components

```
┌─────────────────────────────────────────────────────────────────────┐
│  wize-dev-kit source repo                                           │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ src/         │  │ adapters/    │  │ tools/       │               │
│  │ • method-    │  │ • 9 IDE      │  │ • installer  │               │
│  │   skills     │  │   renderers  │  │   CLI        │               │
│  │ • core-      │  │ • per-target │  │ • validators │               │
│  │   skills     │  │   adapter    │  │ • doctor     │               │
│  │ • tea-       │  │   .yaml      │  │ • update     │               │
│  │   skills     │  │              │  │ • sync       │               │
│  │ • orchestrator│  │              │  │ • agent      │               │
│  │ • builder    │  │              │  │   commands   │               │
│  │ • web/app    │  │              │  │              │               │
│  │   overlays   │  │              │  │              │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                   │               │                       │
│         └───────────────────┴───────────────┘                       │
│                             │                                       │
│                    schemas/ (JSON Schema)                           │
│                    test/    (node:test)                             │
│                    README/ARCH/ROSTER/DECISIONS                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ npm install / npx
┌─────────────────────────────────────────────────────────────────────┐
│  target repo                                                        │
│                                                                     │
│  .wize/config/*.toml       ← project, user, TEA policy              │
│  .wize/planning/           ← brief, PRD, UX artifacts               │
│  .wize/solutioning/        ← architecture, epics, stories           │
│  .wize/implementation/     ← sprint, retro, TEA gates               │
│  .wize/knowledge/          ← this baseline + decisions              │
│  .wize/custom/             ← Agent Builder output                   │
│                                                                     │
│  .claude/skills/ .cursor/rules/ .kimi/ ...  ← IDE adapters           │
│  AGENTS.md                 ← human-readable roster pointer            │
└─────────────────────────────────────────────────────────────────────┘
```

## Data flow — install + first use

```
user runs `npx wize-dev-kit install`
        │
        ▼
wize-cli.js (tools/installer/wize-cli.js)
        │
        ├── detectBrownfield() ──► looks for package.json, src/, etc.
        ├── prompt profile(s) (core, web-overlay, app-overlay)
        ├── prompt IDE targets
        ├── prompt languages
        └── create .wize/ skeleton + project.toml + user.toml + tea.toml
        │
        ▼
renderAdapters() ──► for each selected target, load adapters/{target}/render.js
        │
        ▼
collectAssets() ──► walk src/** for agent.yaml, workflow.md, skill.md
        │
        ▼
per-adapter render() ──► emit SKILL.md / .mdc / .prompt / .md into target repo
        │
        ▼
brownfield? ──► offer runHeadlessBaseline() via detected AI harness CLI
        │
        ▼
AGENTS.md written (generic pointer)
```

## Integration surface

- **npm registry:** publish via OIDC Trusted Publishing; version check queries registry for update nudges.
- **Local filesystem only:** no database, no queue, no external API besides npm registry version probe.
- **AI harness CLIs:** optional PATH detection for `claude`, `codex`, `opencode` to run headless baseline.

## Boundary notes

- The CLI itself is **not** an LLM runtime; it is an installer/syncer/validator. The actual agent reasoning runs inside the user's AI IDE reading the rendered skills.
- Schema validation (`npm run validate`) happens offline; it does not call the registry.
- `.wize/config/user.toml` is gitignored by default; `project.toml` is tracked.
