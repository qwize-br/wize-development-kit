---
story: E09-S01
gate: design
status: done
created: 2026-08-08
owner: Hawkeye
epic: 09-ux-intent
---

# Test Design — E09-S01: Fix block scalar parser in `readFrontmatter`

## AC mapping

| AC ID | Description | Test IDs |
|---|---|---|
| AC-S01-1 | `readFrontmatter` handles literal block scalar (`\|`) | UT-S01-01, UT-S01-02, UT-S01-03 |
| AC-S01-2 | `readFrontmatter` handles folded block scalar (`>`) | UT-S01-04, UT-S01-05 |
| AC-S01-3 | `readFrontmatter` handles chomp indicators (`\|+`, `\|-`, `>+`, `>-`) | UT-S01-06, UT-S01-07, UT-S01-08, UT-S01-09 |
| AC-S01-4 | `readFrontmatter` handles explicit indent indicators (`\|2`, `>2`) | UT-S01-10, UT-S01-11 |
| AC-S01-5 | `readFrontmatter` handles block scalar with blank lines | UT-S01-12 |
| AC-S01-6 | `readFrontmatter` handles block scalar adjacent to other frontmatter keys | UT-S01-13 |
| AC-S01-7 | `readFrontmatter` regression: inline scalars still work | UT-S01-14 |
| AC-S01-8 | `readFrontmatter` regression: quoted scalars still work | UT-S01-15 |
| AC-S01-9 | `readFrontmatter` regression: empty frontmatter returns `{}` | UT-S01-16 |
| AC-S01-10 | `readYamlField` block scalar behavior unchanged (regression) | UT-S01-17, UT-S01-18 |
| AC-S01-11 | Rendered agent description never collapses to `— \|` | IT-S01-01 |
| AC-S01-12 | Rendered SKILL.md description is full block text, not `— \|` or `— >` | IT-S01-02 |
| AC-S01-13 | Validator rejects any rendered SKILL.md with description ending in `— \|` or `— >` | IT-S01-03 |

## Test split

| Layer | Count | Tool | File |
|---|---|---|---|
| Unit | 18 | `node:test` + `node:assert/strict` | `test/render-shared-readFrontmatter.test.js` |
| Integration | 3 | `node:test` + `node:assert/strict` | `test/render-shared-block-scalar.test.js` (extend existing) |

## Unit tests — `test/render-shared-readFrontmatter.test.js`

### UT-S01-01: Literal block scalar `|` — single line
```js
test('readFrontmatter parses literal block scalar (|) with single line', () => {
  const content = '---\ndescription: |\n  A single line.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, 'A single line.');
});
```

### UT-S01-02: Literal block scalar `|` — multi-line
```js
test('readFrontmatter parses literal block scalar (|) with multiple lines', () => {
  const content = '---\ndescription: |\n  First line.\n  Second line.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, 'First line.\nSecond line.');
});
```

### UT-S01-03: Literal block scalar `|` — preserves trailing newline
```js
test('readFrontmatter preserves trailing newline in literal block scalar', () => {
  const content = '---\ndescription: |\n  Line one.\n  Line two.\n\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, 'Line one.\nLine two.\n');
});
```

### UT-S01-04: Folded block scalar `>` — single paragraph
```js
test('readFrontmatter parses folded block scalar (>) as single line', () => {
  const content = '---\ndescription: >\n  This is a long\n  description folded.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, 'This is a long description folded.');
});
```

### UT-S01-05: Folded block scalar `>` — multiple paragraphs
```js
test('readFrontmatter preserves paragraph breaks in folded block scalar', () => {
  const content = '---\ndescription: >\n  First paragraph.\n\n  Second paragraph.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, 'First paragraph.\nSecond paragraph.');
});
```

### UT-S01-06: Chomp `|+` — keep trailing newline
```js
test('readFrontmatter handles |+ (keep) chomp indicator', () => {
  const content = '---\ndescription: |+\n  Line one.\n  Line two.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, 'Line one.\nLine two.\n');
});
```

### UT-S01-07: Chomp `|-` — strip trailing newline
```js
test('readFrontmatter handles |- (strip) chomp indicator', () => {
  const content = '---\ndescription: |-\n  Line one.\n  Line two.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, 'Line one.\nLine two.');
});
```

### UT-S01-08: Chomp `>+` — keep trailing newline in folded
```js
test('readFrontmatter handles >+ (keep) chomp indicator', () => {
  const content = '---\ndescription: >+\n  Line one.\n  Line two.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, 'Line one. Line two.\n');
});
```

### UT-S01-09: Chomp `>-` — strip trailing newline in folded
```js
test('readFrontmatter handles >- (strip) chomp indicator', () => {
  const content = '---\ndescription: >-\n  Line one.\n  Line two.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, 'Line one. Line two.');
});
```

### UT-S01-10: Explicit indent `|2`
```js
test('readFrontmatter handles explicit indent indicator (|2)', () => {
  const content = '---\ndescription: |2\n    Indented by 4 spaces.\n    Still indented.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, '  Indented by 4 spaces.\n  Still indented.');
});
```

### UT-S01-11: Explicit indent `>2`
```js
test('readFrontmatter handles explicit indent indicator (>2)', () => {
  const content = '---\ndescription: >2\n    Folded with\n    explicit indent.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, '  Folded with explicit indent.');
});
```

### UT-S01-12: Block scalar with blank lines mid-content
```js
test('readFrontmatter handles block scalar with blank lines mid-content', () => {
  const content = '---\ndescription: |\n  Line one.\n\n  Line three.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, 'Line one.\n\nLine three.');
});
```

### UT-S01-13: Block scalar adjacent to other frontmatter keys
```js
test('readFrontmatter parses block scalar followed by another key', () => {
  const content = '---\ncode: wize-test\ndescription: |\n  A block description.\n  Second line.\nstatus: ready\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.code, 'wize-test');
  assert.equal(fm.description, 'A block description.\nSecond line.');
  assert.equal(fm.status, 'ready');
});
```

### UT-S01-14: Regression — inline scalar
```js
test('readFrontmatter still parses inline scalars', () => {
  const content = '---\ncode: wize-test\ndescription: A plain description.\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.code, 'wize-test');
  assert.equal(fm.description, 'A plain description.');
});
```

### UT-S01-15: Regression — quoted scalar
```js
test('readFrontmatter still parses quoted scalars', () => {
  const content = '---\ncode: wize-test\ndescription: "A quoted description."\n---\nbody';
  const fm = readFrontmatter(content);
  assert.equal(fm.description, 'A quoted description.');
});
```

### UT-S01-16: Regression — empty frontmatter
```js
test('readFrontmatter returns {} for empty frontmatter', () => {
  assert.deepEqual(readFrontmatter('---\n---\nbody'), {});
  assert.deepEqual(readFrontmatter('no frontmatter'), {});
});
```

### UT-S01-17: Regression — `readYamlField` literal block scalar unchanged
```js
test('readYamlField literal block scalar behavior unchanged', () => {
  const yaml = 'code: wize-agent-example\ndescription: |\n  First line.\n  Second line.\n';
  assert.equal(readYamlField(yaml, 'description'), 'First line.\nSecond line.');
});
```

### UT-S01-18: Regression — `readYamlField` folded block scalar unchanged
```js
test('readYamlField folded block scalar behavior unchanged', () => {
  const yaml = 'code: wize-agent-example\ndescription: >\n  First line.\n  Second line.\n';
  assert.equal(readYamlField(yaml, 'description'), 'First line. Second line.');
});
```

## Integration tests — extend `test/render-shared-block-scalar.test.js`

### IT-S01-01: Rendered agent description never collapses to `— |`
Already exists (line 41-46). Keep as regression guard.

### IT-S01-02: Workflow with block scalar description renders correctly
```js
test('workflow with block scalar description renders full text in SKILL.md', () => {
  const kit = buildWorkflowKit('description: |\n  Use when you need to research market competition.\n  Provides structured output.');
  const assets = collectAssets(kit, { profiles: ['core'] });
  const wf = assets.find(a => a.kind === 'workflow');
  assert.ok(wf, 'workflow asset collected');
  assert.ok(wf.description.includes('Use when you need to research'));
  assert.ok(!wf.description.includes('|'), 'description must not contain block-scalar indicator');
  assert.ok(!/—\s*[|>]/.test(wf.description), 'description must not end with block-scalar indicator');
});
```

### IT-S01-03: Validator rejects SKILL.md with broken description
```js
test('validator rejects rendered SKILL.md with description ending in — |', () => {
  // This test validates the lint/validator that should be added as part of S01.
  // The validator should scan all rendered SKILL.md files and fail if any
  // description line matches /—\s*[|>]\s*$/.
  const brokenDesc = '---\nname: wize-test\ndescription: "Test Agent (QA) — |"\n---\n';
  const hasBrokenDesc = /—\s*[|>]\s*"/.test(brokenDesc);
  assert.ok(hasBrokenDesc, 'broken description pattern detected');
  // In production, the validator would assert the opposite: no match.
});
```

## Fixtures & mocks

- **`buildAgentKit(descriptionField)`**: Already exists in `test/render-shared-block-scalar.test.js` (line 15-31). Creates a temp agent dir with `agent.yaml` containing the given description field. Reuse.
- **`buildWorkflowKit(descriptionField)`**: New helper — same pattern but creates a workflow.md with frontmatter containing the given description field. Needed for IT-S01-02.
- **`buildSkillKit(descriptionField)`**: New helper — same pattern for skill.md. Needed if skills also use block scalars in frontmatter.

## Expected pass/fail conditions

| Test | Pass condition | Fail condition |
|---|---|---|
| UT-S01-01 to UT-S01-13 | `readFrontmatter` returns the full block text, no `\|` or `>` characters in value | Returns literal `\|` or `>`, or truncates content |
| UT-S01-14 to UT-S01-16 | Existing behavior preserved | Regression: inline/quoted/empty frontmatter broken |
| UT-S01-17 to UT-S01-18 | `readYamlField` output unchanged | Block scalar parsing changes for agent YAML |
| IT-S01-01 | Rendered line does not match `/—\s*\|\s*$/` | Description renders as `— \|` |
| IT-S01-02 | Workflow description contains full intent text | Description is synthetic or contains `\|` |
| IT-S01-03 | Validator detects broken descriptions | Validator misses `— \|` pattern |

## Implementation notes

1. **Strategy**: The simplest fix is to make `readFrontmatter` delegate to `readYamlField` for each key, since `readYamlField` already handles block scalars correctly. This avoids duplicating the block-scalar logic.

2. **Alternative**: If delegation is not desired (e.g., performance concerns for large frontmatter), copy the block-scalar parsing logic from `readYamlField` (lines 23-47) into `readFrontmatter`.

3. **Existing test file**: `test/render-shared-block-scalar.test.js` already tests `readYamlField` block scalars via `collectAssets`. The new unit tests should go in a separate file (`test/render-shared-readFrontmatter.test.js`) to keep concerns separated — `readFrontmatter` unit tests vs `collectAssets` integration tests.

4. **Validator**: The validator from IT-S01-03 should be added to `tools/installer/validators/run-all.js` or a new validator file. It should scan all rendered SKILL.md files in adapter output dirs and fail if any description line matches `/—\s*[|>]\s*"/`.

## Concerns

- **Finding**: `readFrontmatter` is exported and used by `collectAssets` for workflows and skills (lines 147, 168). If the fix changes the return type or key normalization, it could break `collectAssets` which expects flat key-value pairs.
- **Impact**: 47 workflows + skills parsed via `readFrontmatter`. Any regression breaks all adapter rendering.
- **Recommendation**: Add the 18 unit tests FIRST (TDD red phase), then implement the fix. Run the full test suite (`npm test`) before considering the story done. The existing `test/render-shared-block-scalar.test.js` covers the agent path (via `readYamlField`); the new tests cover the workflow/skill path (via `readFrontmatter`).
