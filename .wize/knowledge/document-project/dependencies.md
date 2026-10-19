---
status: baseline
owner: Pepper Potts
created: 2026-06-13
last_refreshed: 2026-10-19
---

# Dependencies

## Runtime

| Name | Version | Role in this repo | Load-bearing? |
|---|---|---|---|
| `prompts` | `^2.4.2` | Interactive multi-select / select / text prompts in `wize-cli.js` when running in a TTY. | Yes — install UX depends on it. |

No other runtime dependencies.

## Dev / bundled

- None declared in `package.json`.
- Node.js built-ins only: `fs`, `path`, `os`, `readline`, `test`, `assert`.

## Audit

- `npm audit --omit=dev`: **0 vulnerabilities**.

## Notes

- The dependency surface is intentionally tiny; the kit is mostly static markdown/yaml assets rendered by the installer.
- No duplicate libraries, no unmaintained runtime deps.
- The only external network call is a version check to the npm registry (1.5 s timeout, disabled by `WIZE_DISABLE_UPDATE_CHECK=1`). It is stale-while-revalidate: the cache (`{version, fetched_at, attempted_at}`) is returned at any age, the 1 h TTL runs from `fetched_at`, and a stale entry starts one detached refresh at most every 10 minutes (`attempted_at` throttle). CI, `WIZE_DISABLE_UPDATE_CHECK=1` and `WIZE_NO_BG_REFRESH=1` never spawn a refresh, and the hint line stays silent without a TTY, so command hints and `hydrate` never wait on the network (an explicit `version-check` waits at most about 1.5 s when the cache is stale).
