---
epic_id: 08-preflight
status: done
owner: Tony Stark + Maria Hill
linked_prd: TBD
trigger_map_row: null
priority: 1
estimate: M
---

# Epic 08: Preflight & tool installation

## Outcome
`wize-sec-pentest` runs even when external tools are missing. Before invoking the orchestrator, a preflight detects which of the tools in `data/tool-allowlist.json` are present on the host, prints a clear summary, and (if anything is missing) writes a self-contained `install-pentest-tools.sh` to `.wize/security/` (gitignored) the user can run later. Pipeline always continues with degraded partials for missing tools — the user is never blocked.

## Stories
- **E08-S01** — Preflight detector (OS/arch, package manager, missing tools)
- **E08-S02** — Install script generator (idempotent, OS-aware)
- **E08-S03** — Orchestrator integration (preflight runs first; clear warning + script path in degraded paths)

## Dependencies
- E03-S02 (wize-sec-pentest orchestrator) — must call preflight before phase invocations.

## Success
- A user on a fresh Mac/Windows-WSL/Linux box, with no tools installed, runs `/wize-sec-pentest` and gets: a clear preflight summary, a generated `install-pentest-tools.sh`, and a (mostly degraded) report — without having to read any docs.
- After running the generated script, the same command runs without warnings and produces full-coverage findings.
