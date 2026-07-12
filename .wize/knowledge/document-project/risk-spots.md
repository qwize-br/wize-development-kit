---
status: baseline
owner: Pepper Potts + Tony Stark
created: 2026-06-13
last_refreshed: 2026-07-11
---

# Risk Spots

| Area | Symptom | Likely cause | Confidence |
|---|---|---|---|
| `wize-cli.js` | Single 671-line file mixes dispatcher, prompts, install, uninstall, sync, list, agent, workflow, validate logic. | Early scaffold grown incrementally without separation. | High |
| Workflow execution | Workflows live as markdown specs; no independent Node runner enforces steps or validates outputs. | The kit assumes the AI IDE reads and executes skills, but there is no fallback for unsupported IDEs. | High |
| Adapter drift | IDE adapters are rendered once at install/update; if skill files change upstream, a user must re-run `wize-dev-kit update`. | No background sync or watcher. | Medium |
| Brownfield baseline headless run | Spawns `claude`/`codex`/`opencode` from PATH; behavior depends on harness CLI versions and flags not controlled by the kit. | Integration point outside the package boundary. | Medium |
| No lint/format config | No eslint, prettier, biome, or editorconfig. Consistency relies on manual review. | Project is young; convention not formalized yet. | Medium |
| Generic adapter | `.wize/agents/*.md` fallback exists, but not all IDEs read markdown rules the same way. | Generic format is lowest-common-denominator. | Low |
| Test coverage | 246 tests cover CLI, validators, adapters, doctor, version check; no tests for markdown workflow behavior because there is no runtime. | Workflows are IDE-executed specs. | Medium |

## 2026-06-17 — security-overlay E02-S03

| Area | Symptom | Mitigation |
|---|---|---|
| tool-allowlist flags with arbitrary values | A flag like `--script <name>` on nmap can pull in any nmap script from the local scripts dir — a known escape vector. | `src/security-overlay/data/tool-allowlist.json` is opt-in per flag; flags that consume arbitrary user values are NOT included by default. Skills that need them must add the explicit literal to the allowlist. Confirmed by `filterArgs` test suite. |
