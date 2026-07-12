---
status: baseline
owner: Pepper Potts + Peggy Carter
created: 2026-06-13
last_refreshed: 2026-07-11
---

# Open Questions

| Question | Why it matters | Owner to ask |
|---|---|---|
| What is the target production-readiness version and date? | Currently at v0.8.0 (beta); no date or milestone list is visible. | André Dantas |
| ~~Are web/app overlays actually implemented or still placeholders?~~ **Resolved (2026-07-11):** overlays are real — tested by `profiles-security-overlay`, `render-shared-security-overlay`, `smoke-install-security-overlay`, and `workflow-bodies` asserts non-stub overlay bodies. | — | — |
| What is the SLA / support policy for published versions? | No `SECURITY.md` or support matrix. | André Dantas |
| Should the CLI be split into smaller modules? | `wize-cli.js` is large and mixing concerns. | André Dantas |
| Is there a plan for a real workflow runtime (not IDE-executed)? | Would reduce lock-in to specific AI IDEs. | André Dantas |
| Who owns decisions about new IDE targets? | Antigravity/others may change format. | André Dantas |
| Should lint/format be introduced (eslint/prettier)? | Currently absent; consistency risk. | André Dantas |
