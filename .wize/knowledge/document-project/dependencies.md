---
status: baseline
owner: Pepper Potts
created: 2026-06-13
last_refreshed: 2026-06-13
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
- The only external network call is a version check to the npm registry (1.5 s timeout, cached 1 hour, disabled by `WIZE_DISABLE_UPDATE_CHECK=1`).
