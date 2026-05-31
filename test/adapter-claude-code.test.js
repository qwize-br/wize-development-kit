// Adapter test: claude-code render emits a SKILL.md per kit asset and
// respects profile gating (overlay workflows skipped when overlay not active).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const { render } = require(path.join(KIT, 'adapters/claude-code/render.js'));

function tmpProject(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('emits SKILL.md for every agent', () => {
  const root = tmpProject('wize-cc-agents-');
  const r = render(KIT, root, { profiles: ['core'] });
  const expected = [
    'wize-orchestrator', 'wize-agent-analyst', 'wize-agent-tech-writer',
    'wize-agent-pm', 'wize-agent-ux-designer', 'wize-agent-solution-strategist',
    'wize-agent-architect', 'wize-agent-test-architect', 'wize-agent-dev'
  ];
  for (const code of expected) {
    const file = path.join(root, '.claude/skills', code, 'SKILL.md');
    assert.ok(fs.existsSync(file), `missing ${code}/SKILL.md`);
    const content = fs.readFileSync(file, 'utf-8');
    assert.match(content, /^---\nname: wize-/m, `${code} missing valid frontmatter`);
    assert.match(content, /^description: "/m, `${code} missing description`);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test('skips overlay workflows when overlay not selected (core-only)', () => {
  const root = tmpProject('wize-cc-core-');
  const r = render(KIT, root, { profiles: ['core'] });
  // 3 web overlay workflows + 3 app overlay workflows = 6 skipped
  assert.strictEqual(r.skipped.length, 6, 'expected 6 overlay workflows skipped');
  for (const code of ['wize-web-scaffold', 'wize-web-seo-audit', 'wize-web-deploy',
                      'wize-app-scaffold', 'wize-app-release-channels', 'wize-app-store-listing']) {
    assert.ok(!fs.existsSync(path.join(root, '.claude/skills', code, 'SKILL.md')),
              `${code} should not be emitted with core-only profile`);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test('emits overlay workflows when overlays are active', () => {
  const root = tmpProject('wize-cc-full-');
  const r = render(KIT, root, { profiles: ['core', 'web-overlay', 'app-overlay'] });
  assert.strictEqual(r.skipped.length, 0, 'no skips with all profiles');
  for (const code of ['wize-web-scaffold', 'wize-app-scaffold']) {
    assert.ok(fs.existsSync(path.join(root, '.claude/skills', code, 'SKILL.md')),
              `${code} should be emitted`);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test('emits wize-help skill (orchestrator-aware)', () => {
  const root = tmpProject('wize-cc-help-');
  render(KIT, root, { profiles: ['core'] });
  const help = path.join(root, '.claude/skills/wize-help/SKILL.md');
  assert.ok(fs.existsSync(help), 'wize-help skill missing');
  const content = fs.readFileSync(help, 'utf-8');
  assert.match(content, /name: wize-help/, 'wrong name in frontmatter');
  assert.match(content, /project state|next step|Wizer/i, 'wize-help body missing state/Wizer guidance');
  fs.rmSync(root, { recursive: true, force: true });
});

test('dry-run does not write files', () => {
  const root = tmpProject('wize-cc-dry-');
  render(KIT, root, { profiles: ['core'], dryRun: true });
  assert.ok(!fs.existsSync(path.join(root, '.claude')),
            'dry-run must not create .claude/ folder');
  fs.rmSync(root, { recursive: true, force: true });
});
