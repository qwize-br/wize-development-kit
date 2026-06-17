---
code: wize-sec-recon
name: wize-sec-recon
overlay: security
module: security-overlay
owner: red-teamer
status: ready
---

# wize-sec-recon — Recon (nmap)

Runs nmap against the targets in the `scope.md` allowlist and writes `recon.md`. **Default passive** (ping scan only); `--active` enables `-sV` service detection.

## Usage

```bash
/wize-sec-recon
/wize-sec-recon --active
/wize-sec-recon --target=staging.example.internal
```

## Behavior

- Loads `.wize/security/scope.md` first; aborts loudly on invalid scope (HASH_MISMATCH / MISSING_FIELDS).
- Detects nmap via `command -v`. If absent, writes a `partial_status: incomplete` recon.md with a `degraded_checks` section and exits 0 — the pipeline continues.
- Calls `assertTargetInScope` for the target. Out-of-scope targets produce an `incomplete` partial and a refusal entry in `.refusals.log`; nmap is **not** invoked.
- Active vs passive flag set is recorded in the partial's `mode:` frontmatter.
- The SAST portion of recon (gitleaks, osv/grype) is implemented in a sibling script `scripts/run-sast.js` and is invoked separately or by the orchestrator — see E05.

## Output

- `.wize/security/recon.md` — partial with `## open_ports` (or `## degraded_checks` on missing tool / out-of-scope target).
- `.wize/security/.refusals.log` — appended on out-of-scope targets.

Exits 0 on success or graceful degradation; 1 when the gate refused the target; 2 on scope error.
