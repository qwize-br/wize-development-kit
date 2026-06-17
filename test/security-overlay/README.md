# security-overlay tests

## Running locally

```bash
node --test test/security-overlay/
```

Most tests are pure-Node and run without any external tooling. They
cover scope parsing, gate enforcement, partial writer/reader, OWASP
tagger, CVSS calculator, tool detection, allowlist filtering, skill
script behavior, and the report renderer (MD + HTML).

## Tests that need external tools

Some tests are designed to be tolerant of missing toolchains:

- **`axe-smoke.test.js`** — generates `report.html` and runs
  `@axe-core/cli` against it. If axe is not installed, the test is
  skipped with a clear message. In CI, install via:
  ```bash
  npx --no-install @axe-core/cli --version   # uses the cached copy if present
  ```
  Or add `@axe-core/cli` to the CI workflow. The test fails ONLY on
  `critical` violations; `serious` are reported but do not fail the
  test (manual review).
- The DAST skill scripts (`run-nuclei.js`, `run-nikto.js`, etc.) are
  exercised via mocked `execFn` and do not require the actual tools.

## Tool policy

The security-overlay **does not** add any new npm dependencies. All
scripts use Node 20+ built-ins (`node:fs`, `node:path`,
`node:crypto`, `node:child_process`, `node:test`, `node:assert`).
External tools (nmap, nuclei, sqlmap, ffuf, etc.) are detected at
runtime via `command -v`; absence is reported in the partial, never
auto-installed.
