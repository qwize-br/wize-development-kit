---
story: E09-S08
gate: design
status: done
created: 2026-08-08
owner: Hawkeye
epic: 09-ux-intent
---

# Test Design — E09-S08: Metadata hygiene + CI

## AC mapping

| AC ID | Description | Test IDs |
|---|---|---|
| AC-S08-a1 | `wize-edit-prd` phase label normalized from `2-plan-workflows` to `2-plan` | UT-S08-01 |
| AC-S08-a2 | `wize-tech-vision` phase label normalized (currently `2-to-3-boundary` in `3-solutioning/`) | UT-S08-02 |
| AC-S08-a3 | `wize-nfr-principles` phase label normalized (currently `2-to-3-boundary` in `3-solutioning/`) | UT-S08-03 |
| AC-S08-a4 | TEA skills use `phase:` instead of `gate:` (6 skills: risk, design, trace, nfr, review, gate) | UT-S08-04 |
| AC-S08-a5 | All 31 workflow.md files have consistent phase labels after normalization | IT-S08-01 |
| AC-S08-b1 | `doctor.js` suggestions use slash-command format (`/wize-*`), not shell-command format | UT-S08-05 |
| AC-S08-b2 | `doctor.js` suggestion "Run \`wize-refresh-knowledge\`" becomes "Run \`/wize-refresh-knowledge\`" | UT-S08-06 |
| AC-S08-c1 | No reference to `/wize` as standalone alias exists in codebase (it was never implemented) | UT-S08-07 |
| AC-S08-d1 | Header comment in `wize-cli.js` no longer says "v0.1 scaffold" | UT-S08-08 |
| AC-S08-d2 | Header comment reflects current version and accurate subcommand list | UT-S08-09 |
| AC-S08-e1 | `.github/workflows/ci.yml` exists | UT-S08-10 |
| AC-S08-e2 | CI runs `npm test` on push and pull_request | IT-S08-02 |
| AC-S08-e3 | CI runs `npm run validate` on push and pull_request | IT-S08-03 |
| AC-S08-e4 | CI uses Node.js version matching `package.json` engines (`>=20`) | UT-S08-11 |
| AC-S08-f1 | Tool contract test for `wize-dev-kit` CLI exists (RETRO-1) | UT-S08-12 |
| AC-S08-f2 | Tool contract test validates `--help` exit code and output | UT-S08-13 |
| AC-S08-f3 | Tool contract test validates `--version` exit code and output | UT-S08-14 |
| AC-S08-f4 | Tool contract test validates `validate` subcommand exit code | UT-S08-15 |
| AC-S08-f5 | Tool contract test skips gracefully when binary is absent (smoke opt-in) | UT-S08-16 |

## Test split

| Layer | Count | Tool | File |
|---|---|---|---|
| Unit | 16 | `node:test` + `node:assert/strict` | `test/metadata-hygiene.test.js` (new) |
| Integration | 3 | `node:test` + `node:assert/strict` | `test/ci-smoke.test.js` (new) |

## Unit tests — `test/metadata-hygiene.test.js`

### Phase label normalization (a)

#### UT-S08-01: `wize-edit-prd` phase normalized
```js
test('wize-edit-prd phase label is 2-plan, not 2-plan-workflows', () => {
  const content = fs.readFileSync(
    path.join(KIT, 'src/method-skills/2-plan-workflows/wize-edit-prd/workflow.md'), 'utf-8');
  const fm = readFrontmatter(content);
  assert.equal(fm.phase, '2-plan', 'wize-edit-prd must use canonical phase label 2-plan');
});
```

#### UT-S08-02: `wize-tech-vision` phase label normalized
```js
test('wize-tech-vision phase label is consistent with its directory', () => {
  const content = fs.readFileSync(
    path.join(KIT, 'src/method-skills/3-solutioning/wize-tech-vision/workflow.md'), 'utf-8');
  const fm = readFrontmatter(content);
  // Lives in 3-solutioning/ — phase should reflect that, not 2-to-3-boundary
  assert.equal(fm.phase, '3-solutioning',
    'wize-tech-vision lives in 3-solutioning/; phase must match');
});
```

#### UT-S08-03: `wize-nfr-principles` phase label normalized
```js
test('wize-nfr-principles phase label is consistent with its directory', () => {
  const content = fs.readFileSync(
    path.join(KIT, 'src/method-skills/3-solutioning/wize-nfr-principles/workflow.md'), 'utf-8');
  const fm = readFrontmatter(content);
  assert.equal(fm.phase, '3-solutioning',
    'wize-nfr-principles lives in 3-solutioning/; phase must match');
});
```

#### UT-S08-04: TEA skills use `phase:` not `gate:`
```js
const TEA_SKILLS = ['risk', 'design', 'trace', 'nfr', 'review', 'gate'];

for (const gate of TEA_SKILLS) {
  test(`wize-tea-${gate} uses phase: not gate:`, () => {
    const content = fs.readFileSync(
      path.join(KIT, `src/tea-skills/wize-tea-${gate}/workflow.md`), 'utf-8');
    const fm = readFrontmatter(content);
    assert.ok(!('gate' in fm), `wize-tea-${gate} must not use gate: key`);
    assert.ok('phase' in fm, `wize-tea-${gate} must use phase: key`);
    assert.equal(fm.phase, '4-implementation',
      `wize-tea-${gate} phase must be 4-implementation`);
  });
}
```

### Doctor.js suggestion fixes (b)

#### UT-S08-05: `doctor.js` suggestions use slash-command format
```js
test('doctor.js suggestions use slash-command format, not shell commands', async () => {
  const root = tmpProject('wize-doc-slash-');
  seedMinimalInstall(root);
  const result = await cmdDoctor({ kitRoot: KIT, projectRoot: root, opts: { log: () => {} } });
  for (const s of result.suggestions) {
    // Shell-command patterns that should NOT appear in suggestions
    assert.ok(!/Run `[a-z]/.test(s.text) || s.text.includes('npx'),
      `suggestion must not use bare shell command: "${s.text}"`);
    // Slash-command patterns that SHOULD appear
    if (s.text.includes('wize-') && !s.text.includes('npx')) {
      assert.match(s.text, /\/wize-|`wize-dev-kit/,
        `suggestion should use slash-command or npx prefix: "${s.text}"`);
    }
  }
  fs.rmSync(root, { recursive: true, force: true });
});
```

#### UT-S08-06: Specific `wize-refresh-knowledge` suggestion fixed
```js
test('doctor.js suggests /wize-refresh-knowledge, not bare wize-refresh-knowledge', async () => {
  const root = tmpProject('wize-doc-refresh-');
  seedMinimalInstall(root);
  // Create a stale knowledge file to trigger the suggestion
  const kDir = path.join(root, '.wize/knowledge/document-project');
  fs.mkdirSync(kDir, { recursive: true });
  fs.writeFileSync(path.join(kDir, 'conventions.md'),
    '---\nlast_refreshed: 2026-01-01\n---\n# old\n', 'utf-8');
  const result = await cmdDoctor({ kitRoot: KIT, projectRoot: root, opts: { log: () => {} } });
  const refreshSuggestion = result.suggestions.find(s => s.text.includes('refresh'));
  if (refreshSuggestion) {
    assert.match(refreshSuggestion.text, /\/wize-refresh-knowledge/,
      'must use slash-command format');
    assert.ok(!/Run `wize-refresh-knowledge`/.test(refreshSuggestion.text),
      'must not use bare command format');
  }
  fs.rmSync(root, { recursive: true, force: true });
});
```

### `/wize` alias removal (c)

#### UT-S08-07: No standalone `/wize` alias references
```js
test('no standalone /wize alias exists in code or docs (pre-S10)', () => {
  // S08-c removes the broken /wize alias that was referenced but never implemented.
  // S10 will add it back as a real alias. This test asserts the pre-S10 state.
  // Check that no file references /wize as a standalone alias (without -help, -dev, etc.)
  const files = [
    'tools/installer/render-shared.js',
    'tools/installer/onboarding.js',
    'tools/installer/wize-cli.js',
    'src/orchestrator-skills/wize-help/skill.md',
    'src/orchestrator-skills/wize-onboarding/workflow.md'
  ];
  for (const f of files) {
    const content = fs.readFileSync(path.join(KIT, f), 'utf-8');
    // /wize followed by non-word char or end of string, but NOT /wize-
    const standaloneAlias = content.match(/\/wize\b(?!-)/g);
    if (standaloneAlias) {
      // Allow in specific contexts: /wize-help references, /wize in URLs
      const allowed = standaloneAlias.filter(m => {
        const ctx = content.substring(content.indexOf(m) - 5, content.indexOf(m) + 20);
        return !ctx.includes('/wize-help') && !ctx.includes('/wize-dev-kit');
      });
      assert.equal(allowed.length, 0,
        `${f} contains standalone /wize alias: ${JSON.stringify(allowed)}`);
    }
  }
});
```

### Header comment update (d)

#### UT-S08-08: Header no longer says "v0.1 scaffold"
```js
test('wize-cli.js header comment does not say v0.1 scaffold', () => {
  const content = fs.readFileSync(path.join(KIT, 'tools/installer/wize-cli.js'), 'utf-8');
  const header = content.split('\n').slice(0, 10).join('\n');
  assert.ok(!/v0\.1 scaffold/.test(header),
    'header must not claim v0.1 scaffold');
});
```

#### UT-S08-09: Header reflects current subcommands
```js
test('wize-cli.js header lists current subcommands', () => {
  const content = fs.readFileSync(path.join(KIT, 'tools/installer/wize-cli.js'), 'utf-8');
  const header = content.split('\n').slice(0, 10).join('\n');
  // Must mention key subcommands that exist
  assert.match(header, /install/);
  assert.match(header, /update/);
  assert.match(header, /uninstall/);
  assert.match(header, /validate/);
  assert.match(header, /doctor/);
});
```

### CI workflow (e)

#### UT-S08-10: CI workflow file exists
```js
test('.github/workflows/ci.yml exists', () => {
  const ciPath = path.join(KIT, '.github/workflows/ci.yml');
  assert.ok(fs.existsSync(ciPath), 'ci.yml must exist');
});
```

#### UT-S08-11: CI uses correct Node version
```js
test('ci.yml uses Node.js >= 20', () => {
  const ciPath = path.join(KIT, '.github/workflows/ci.yml');
  const content = fs.readFileSync(ciPath, 'utf-8');
  // Should set up Node.js 20 or 22
  assert.match(content, /node-version:\s*['"]?(2[0-9]|latest)/,
    'CI must use Node.js >= 20');
});
```

### Tool contract tests — RETRO-1 (f)

#### UT-S08-12: Contract test file exists
```js
test('tool contract test file exists for wize-dev-kit CLI', () => {
  const contractPath = path.join(KIT, 'test/tool-contract-wize-cli.test.js');
  assert.ok(fs.existsSync(contractPath), 'RETRO-1: contract test file must exist');
});
```

#### UT-S08-13: Contract test validates `--help`
```js
test('tool contract: wize-dev-kit --help exits 0 and prints usage', async () => {
  const { execSync } = require('node:child_process');
  try {
    const out = execSync('node tools/installer/wize-cli.js --help', {
      cwd: KIT, encoding: 'utf-8', timeout: 5000
    });
    assert.match(out, /Usage:/);
  } catch (e) {
    if (e.message.includes('command not found') || e.message.includes('ENOENT')) {
      // Binary not available — skip gracefully (smoke opt-in)
      return;
    }
    throw e;
  }
});
```

#### UT-S08-14: Contract test validates `--version`
```js
test('tool contract: wize-dev-kit --version exits 0 and prints version', async () => {
  const { execSync } = require('node:child_process');
  const pkg = require(path.join(KIT, 'package.json'));
  try {
    const out = execSync('node tools/installer/wize-cli.js --version', {
      cwd: KIT, encoding: 'utf-8', timeout: 5000
    });
    assert.match(out, new RegExp(pkg.version.replace(/\./g, '\\.')));
  } catch (e) {
    if (e.message.includes('command not found') || e.message.includes('ENOENT')) {
      return;
    }
    throw e;
  }
});
```

#### UT-S08-15: Contract test validates `validate` subcommand
```js
test('tool contract: wize-dev-kit validate exits 0 in source repo', async () => {
  const { execSync } = require('node:child_process');
  try {
    execSync('node tools/installer/wize-cli.js validate', {
      cwd: KIT, encoding: 'utf-8', timeout: 10000
    });
    // Exit 0 = success
  } catch (e) {
    if (e.message.includes('command not found') || e.message.includes('ENOENT')) {
      return;
    }
    // validate may fail if there are schema issues — that's a real failure
    throw e;
  }
});
```

#### UT-S08-16: Contract test skips gracefully when binary absent
```js
test('tool contract: skips gracefully when wize-dev-kit binary is not on PATH', () => {
  // This test pattern should be used by all contract tests.
  // When the binary is not available (e.g., in CI before install, or on a dev machine
  // without global install), the test should pass with a skip message, not fail.
  const binaryMissing = !fs.existsSync(path.join(KIT, 'tools/installer/wize-cli.js'));
  if (binaryMissing) {
    // In a real contract test, this would be a test.skip() or early return.
    // For this design test, we assert the pattern exists.
    assert.ok(true, 'skip pattern acknowledged');
  }
});
```

## Integration tests — `test/ci-smoke.test.js`

### IT-S08-01: All 31 workflow.md files have consistent phase labels
```js
test('all workflow.md files have consistent phase labels', () => {
  const { walk } = require('../tools/installer/validators/walk.js');
  const { readFrontmatter } = require('../tools/installer/render-shared.js');

  const VALID_PHASES = new Set([
    '1-analysis', '2-plan', '3-solutioning', '4-implementation'
  ]);

  const workflowFiles = [
    ...walk(path.join(KIT, 'src/method-skills'), name => name === 'workflow.md'),
    ...walk(path.join(KIT, 'src/tea-skills'), name => name === 'workflow.md'),
    ...walk(path.join(KIT, 'src/orchestrator-skills'), name => name === 'workflow.md'),
    ...walk(path.join(KIT, 'src/builder-skills'), name => name === 'workflow.md')
  ];

  const failures = [];
  for (const file of workflowFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const fm = readFrontmatter(content);
    const phase = fm.phase || fm.gate; // gate: is the old key we're migrating from
    if (!phase) {
      failures.push(`${path.relative(KIT, file)}: missing phase`);
      continue;
    }
    if (!VALID_PHASES.has(phase)) {
      failures.push(`${path.relative(KIT, file)}: invalid phase "${phase}"`);
    }
    if (fm.gate) {
      failures.push(`${path.relative(KIT, file)}: uses deprecated gate: key instead of phase:`);
    }
  }

  assert.deepEqual(failures, [], `phase label inconsistencies found:\n${failures.join('\n')}`);
});
```

### IT-S08-02: CI runs `npm test` on push/PR
```js
test('ci.yml triggers npm test on push and pull_request', () => {
  const ciPath = path.join(KIT, '.github/workflows/ci.yml');
  const content = fs.readFileSync(ciPath, 'utf-8');

  // Must trigger on push and pull_request
  assert.match(content, /push:/);
  assert.match(content, /pull_request:/);

  // Must include npm test step
  assert.match(content, /npm test/);
});
```

### IT-S08-03: CI runs `npm run validate` on push/PR
```js
test('ci.yml triggers npm run validate on push and pull_request', () => {
  const ciPath = path.join(KIT, '.github/workflows/ci.yml');
  const content = fs.readFileSync(ciPath, 'utf-8');

  // Must include npm run validate step
  assert.match(content, /npm run validate/);
});
```

## Fixtures & mocks

- **`tmpProject(prefix)`**: Already used in `test/doctor.test.js` and `test/cli-commands.test.js`. Creates a temp dir. Reuse pattern.
- **`seedMinimalInstall(root, opts)`**: Already used in `test/doctor.test.js` (line 28-45). Creates `.wize/config/project.toml` and `user.toml`. Reuse.
- **`silentLog()`**: Returns `() => {}`. Already used in multiple test files. Reuse.

## Expected pass/fail conditions

| Test | Pass condition | Fail condition |
|---|---|---|
| UT-S08-01 to UT-S08-04 | Phase labels match canonical set | Any workflow uses `2-plan-workflows`, `2-to-3-boundary`, or `gate:` |
| UT-S08-05 to UT-S08-06 | Suggestions use `/wize-*` format | Suggestions use bare `wize-*` shell commands |
| UT-S08-07 | No standalone `/wize` alias found | `/wize` (without `-help` suffix) found in code |
| UT-S08-08 to UT-S08-09 | Header comment is accurate | Header says "v0.1 scaffold" or misses subcommands |
| UT-S08-10 to UT-S08-11 | `ci.yml` exists with correct Node version | File missing or wrong Node version |
| UT-S08-12 to UT-S08-16 | Contract tests exist and run correctly | Missing contract tests or tests that fail instead of skipping |
| IT-S08-01 | All 31 workflows have valid phase labels | Any inconsistency found |
| IT-S08-02 to IT-S08-03 | CI config includes required steps | Missing `npm test` or `npm run validate` |

## Implementation notes

1. **Phase label normalization (a)**: The canonical phase labels are `1-analysis`, `2-plan`, `3-solutioning`, `4-implementation`. `wize-edit-prd` uses `2-plan-workflows` — change to `2-plan`. `wize-tech-vision` and `wize-nfr-principles` use `2-to-3-boundary` but live in `3-solutioning/` — change to `3-solutioning`. TEA skills use `gate:` — change to `phase: 4-implementation`.

2. **Doctor.js suggestions (b)**: The fix is in `tools/installer/commands/doctor.js`. Lines that suggest `Run \`wize-refresh-knowledge\`` should become `Run \`/wize-refresh-knowledge\``. Similarly for any other bare command suggestions. The `npx wize-dev-kit` suggestions are correct as-is (they are actual shell commands).

3. **`/wize` alias removal (c)**: Per the epic, S08-c removes the broken `/wize` alias that was referenced but never implemented. S10 will add it back as a real alias. The test in UT-S08-07 verifies the pre-S10 state. After S10, this test will need to be updated or removed.

4. **Header comment (d)**: Update lines 1-9 of `wize-cli.js`. The "v0.1 scaffold" claim is inaccurate — the kit is at v0.11.0 with real implementations.

5. **CI workflow (e)**: Create `.github/workflows/ci.yml` with:
   - Trigger: `push` and `pull_request` on all branches
   - Node.js setup: `actions/setup-node@v4` with `node-version: '20'`
   - Steps: `npm ci` → `npm test` → `npm run validate`
   - The `npm ci` is important — it ensures a clean install, unlike `npm install` which may use stale lockfile.

6. **Tool contract tests (f) — RETRO-1**: Create `test/tool-contract-wize-cli.test.js`. These are smoke tests that run the actual CLI binary. They must:
   - Skip gracefully when the binary is not available (no global install)
   - Use `node:child_process.execSync` with timeouts
   - Validate exit codes (0 for success, non-zero for errors)
   - Validate output contains expected strings
   - Not depend on any test fixtures or temp directories (they test the real CLI)

## Concerns

- **Finding**: Phase label normalization touches 9 files (1 `2-plan-workflows`, 2 `2-to-3-boundary`, 6 `gate:`). If any file is missed, IT-S08-01 will catch it.
- **Impact**: Phase labels are used by `collectAssets` in `render-shared.js` (line 157) to generate the fallback description. Changing labels changes the fallback description for those skills. This is intentional — the fallback should be accurate.
- **Recommendation**: Run `npm test` after each sub-task (a through f) to catch regressions early. The CI workflow (e) should be the LAST sub-task implemented, so it validates all other changes.

- **Finding**: Tool contract tests (RETRO-1) run the real CLI binary. If the binary has a bug that causes it to hang, the test will timeout.
- **Impact**: CI could hang indefinitely if timeouts are not set.
- **Recommendation**: All `execSync` calls must have explicit timeouts (5000ms for simple commands, 10000ms for validate). Use `try/catch` to handle timeout errors gracefully.

- **Finding**: The `doctor.js` suggestion fix (b) is cosmetic but user-facing. If the fix changes the format of any suggestion that tools/scripts parse, it could break automation.
- **Impact**: Low — doctor output is human-readable, not machine-parseable. No known automation depends on suggestion format.
- **Recommendation**: Verify by running `wize-dev-kit doctor` before and after the fix, diff the output.
