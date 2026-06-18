---
story_id: E08-S01
epic: 08-preflight
status: done
priority: 1
estimate: M
linked_acs: []
---

# Story: Preflight detector (OS/arch, package manager, missing tools)

## Context
A vibecoder on Mac/Windows-WSL/Linux has `node` (because the kit requires it) but probably doesn't have nmap/nuclei/gitleaks/osv-scanner/etc. The preflight detects what's missing so the orchestrator can warn and generate an install script.

## Acceptance criteria
- `preflight({kitRoot, securityDir})` returns:
  - `os` ∈ `linux|darwin|win32|wsl`
  - `arch` ∈ `x64|arm64`
  - `packageManager` ∈ `apt|brew|chocolatey|scoop|none`
  - `tools`: `{ name: { present: bool, path?: string, version?: string } }` for every tool in `data/tool-allowlist.json`
  - `missing`: array of tool names that are not present

## Out of scope
- Installing anything (covered by E08-S02).
- Modifying the orchestrator (E08-S03).

## Notes for Shuri
- Create `src/security-overlay/_shared/preflight.js` exporting `runPreflight(opts)` and `formatReport(preflightResult)`.
- Use `node:os` for platform, `node:child_process.spawnSync('command -v', [name])` for path detection (or `where` on Windows).
- For version probing, run `<bin> --version` with a 2s timeout. Treat failure as `version: null` — never throw.
- The output of `formatReport()` is plain text suitable for printing to the harness.
- Test with mocked `spawnSync` so we can simulate Mac/Linux/Windows-WSL environments.

## Notes for Hawkeye
- 1 test per OS branch (linux, darwin, win32, wsl) using a mocked spawn.
- 1 test that missing tools are correctly reported.
- 1 test that `formatReport` produces a stable, human-readable summary.
