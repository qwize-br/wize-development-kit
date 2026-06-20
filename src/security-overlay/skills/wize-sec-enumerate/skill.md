---
code: wize-sec-enumerate
name: wize-sec-enumerate
overlay: security
module: security-overlay
owner: red-teamer
status: ready
---

# wize-sec-enumerate — Surface enumeration

Reads `recon.md`, probes HTTP/S ports via `curl -sI`, infers tech from `Server` and `X-Powered-By` headers. Writes `enumerate.md` with `## surface` and `## tech` sections, plus `depends_on: [recon]` in the frontmatter so the renderer orders parciais.

## Usage

```bash
/wize-sec-enumerate
/wize-sec-enumerate --active  # currently a no-op for this phase; reserved for future
```

## Behavior

- Loads `.wize/security/scope.md` first; aborts on invalid scope.
- Reads `recon.md` partial; if missing, marks `partial_status: incomplete` and writes a degraded partial so the audit trail is complete.
- Probes **only the scope's allowlisted hosts**, not the recon's listed services. Out-of-scope hosts are never probed.
- curl and nuclei are detected via `command -v`; missing tools degrade the check rather than aborting.
- Calls `assertTargetInScope` for every probed target. Refusals are appended to `.refusals.log`.

## Output

- `.wize/security/enumerate.md` — partial with `## surface` (probed endpoints) and `## tech` (deduplicated `server`/`x-powered-by` hits).
- `.wize/security/.refusals.log` — appended on out-of-scope targets.
