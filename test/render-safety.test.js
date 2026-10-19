'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const KIT = path.resolve(__dirname, '..');
const shared = require(path.join(KIT, 'tools/installer/render-shared.js'));
const { renderTargets } = require(path.join(KIT, 'tools/installer/render-targets.js'));
const { readMarker, writeMarker, markerPath } = require(path.join(KIT, 'tools/installer/marker.js'));

function tmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const run = (root, extra = {}) => renderTargets({
  kitRoot: KIT, projectRoot: root, targets: ['claude-code', 'generic'], profiles: ['core'], ...extra
});

test('a second render is all-unchanged and leaves mtimes alone', async () => {
  const root = tmp('wize-rs-idem-');
  // AGENTS.md is create-once (never overwritten), so it is left out of the count.
  const first = run(root, { skipAgentsMd: true });
  assert.strictEqual(first.ok, true);
  const total = first.adapters.reduce((n, a) => n + a.written + a.unchanged, 0);
  assert.ok(total > 50, 'renders a real tree');
  assert.ok(first.adapters.every(a => a.written > 0 || a.skipped));

  const files = walk(root);
  const before = new Map(files.map(f => [f, fs.statSync(f).mtimeMs]));
  await new Promise(r => setTimeout(r, 30));

  const second = run(root, { skipAgentsMd: true });
  assert.strictEqual(second.adapters.reduce((n, a) => n + a.written, 0), 0, 'nothing rewritten');
  assert.strictEqual(second.adapters.reduce((n, a) => n + a.unchanged, 0), total, 'unchanged equals total');
  for (const f of walk(root)) assert.strictEqual(fs.statSync(f).mtimeMs, before.get(f), `mtime moved: ${f}`);
  assert.ok(!walk(root).some(f => f.endsWith('.tmp')), 'no tmp files left behind');
});

test('a changed file is rewritten in place', () => {
  const root = tmp('wize-rs-change-');
  run(root);
  const f = path.join(root, '.claude/skills/wize-orchestrator/SKILL.md');
  fs.writeFileSync(f, 'stale');
  const r = run(root);
  assert.strictEqual(r.adapters[0].written, 1);
  assert.notStrictEqual(fs.readFileSync(f, 'utf-8'), 'stale');
});

test('the write guard leaves vetoed paths untouched and lists them as skippedTracked', () => {
  const root = tmp('wize-rs-guard-');
  const f = path.join(root, '.claude/skills/wize-orchestrator/SKILL.md');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, 'tracked bytes');
  const r = run(root, { guard: (abs) => abs === f });
  const claude = r.adapters.find(a => a.code === 'claude-code');
  assert.strictEqual(fs.readFileSync(f, 'utf-8'), 'tracked bytes');
  assert.deepStrictEqual(claude.skippedTracked, [f]);
  assert.ok(claude.written > 0, 'other files still render');
  // The guard never leaks into later runs.
  const after = run(root);
  assert.deepStrictEqual(after.adapters.find(a => a.code === 'claude-code').skippedTracked, []);
});

test('guarded paths that do not exist yet are never created', () => {
  const root = tmp('wize-rs-guard-new-');
  const f = path.join(root, '.wize/agents/wize-orchestrator.md');
  run(root, { guard: (abs) => abs === f });
  assert.ok(!fs.existsSync(f));
});

test('skipAgentsMd keeps AGENTS.md out of a generic-only project', () => {
  const root = tmp('wize-rs-noagents-');
  renderTargets({ kitRoot: KIT, projectRoot: root, targets: ['generic'], profiles: ['core'], skipAgentsMd: true });
  assert.ok(!fs.existsSync(path.join(root, 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(root, '.wize/agents/wize-orchestrator.md')));
  const res = shared.renderAgentsMd(KIT, root, { skipAgentsMd: true });
  assert.deepStrictEqual(res, { written: [], skipped: ['AGENTS.md (skipAgentsMd)'] });

  const root2 = tmp('wize-rs-agents-');
  renderTargets({ kitRoot: KIT, projectRoot: root2, targets: ['generic'], profiles: ['core'] });
  assert.ok(fs.existsSync(path.join(root2, 'AGENTS.md')));
});

test('a leftover .tmp file never replaces a target', () => {
  const root = tmp('wize-rs-tmp-');
  const dir = path.join(root, '.claude/skills/wize-orchestrator');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.SKILL.md.1234.abcd.tmp'), 'half-written');
  run(root);
  const body = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf-8');
  assert.match(body, /^---\nname: wize-orchestrator/);
  assert.notStrictEqual(body, 'half-written');
});

test('writeFileIfChanged / copyFileIfChanged report their outcome and keep stats', () => {
  const dir = tmp('wize-rs-fn-');
  shared.resetWriteStats();
  const f = path.join(dir, 'x.txt');
  assert.strictEqual(shared.writeFileIfChanged(f, 'one'), 'written');
  assert.strictEqual(shared.writeFileIfChanged(f, 'one'), 'unchanged');
  assert.strictEqual(shared.writeFileIfChanged(f, 'two'), 'written');
  const src = path.join(dir, 'src.sh');
  fs.writeFileSync(src, '#!/bin/sh\n', { mode: 0o755 });
  const dst = path.join(dir, 'dst.sh');
  assert.strictEqual(shared.copyFileIfChanged(src, dst), 'written');
  assert.strictEqual(fs.statSync(dst).mode & 0o777, 0o755);
  assert.strictEqual(shared.copyFileIfChanged(src, dst), 'unchanged');
  shared.setWriteGuard(() => true);
  assert.strictEqual(shared.writeFileIfChanged(f, 'three'), 'skipped-tracked');
  shared.clearWriteGuard();
  const stats = shared.getWriteStats();
  assert.strictEqual(stats.written, 3);
  assert.strictEqual(stats.unchanged, 2);
  assert.deepStrictEqual(stats.skippedTracked, [f]);
  shared.resetWriteStats();
  assert.deepStrictEqual(shared.getWriteStats(), { written: 0, unchanged: 0, skippedTracked: [] });
});

test('renderTargets isolates a failing or missing adapter and clears the guard', () => {
  const root = tmp('wize-rs-iso-');
  const r = renderTargets({
    kitRoot: KIT, projectRoot: root, targets: ['nope', 'generic'], profiles: ['core'], guard: () => false
  });
  assert.strictEqual(r.adapters[0].skipped, true);
  assert.strictEqual(r.adapters[1].written > 0, true);
  assert.strictEqual(r.ok, true);
  const f = path.join(root, 'late.txt');
  assert.strictEqual(shared.writeFileIfChanged(f, 'x'), 'written', 'guard cleared after the run');
  shared.resetWriteStats();

  const fakeKit = tmp('wize-rs-fakekit-');
  fs.mkdirSync(path.join(fakeKit, 'adapters/boom'), { recursive: true });
  fs.writeFileSync(path.join(fakeKit, 'adapters/boom/render.js'), 'exports.render = () => { throw new Error("kaboom"); };');
  const bad = renderTargets({ kitRoot: fakeKit, projectRoot: root, targets: [{ code: 'boom' }], profiles: [{ code: 'core' }] });
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.adapters[0].error, 'kaboom');
});

test('marker round-trip, corrupt marker -> null, missing -> null', () => {
  const root = tmp('wize-rs-marker-');
  assert.strictEqual(readMarker(root), null);
  writeMarker(root, { kit_version: '0.27.0', targets: ['claude-code'], profiles: ['core'], counts: { written: 3 }, delegated: false, rendered_with: '0.27.0' });
  const m = readMarker(root);
  assert.strictEqual(m.schema, 1);
  assert.strictEqual(m.kit_version, '0.27.0');
  assert.deepStrictEqual(m.targets, ['claude-code']);
  assert.deepStrictEqual(m.counts, { written: 3 });
  assert.strictEqual(m.delegated, false);
  assert.ok(!Number.isNaN(Date.parse(m.rendered_at)));
  assert.ok(markerPath(root).endsWith(path.join('.wize', '.local', 'hydrated.json')));
  fs.writeFileSync(markerPath(root), '{ not json');
  assert.strictEqual(readMarker(root), null);
  fs.writeFileSync(markerPath(root), '[1,2]');
  assert.strictEqual(readMarker(root), null);
});

test('source: no raw fs.writeFileSync/copyFileSync in adapters; render-shared only inside the helpers', () => {
  const adaptersDir = path.join(KIT, 'adapters');
  for (const d of fs.readdirSync(adaptersDir)) {
    const f = path.join(adaptersDir, d, 'render.js');
    if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, 'utf-8');
    assert.doesNotMatch(src, /fs\.(writeFileSync|copyFileSync)\(/, `${d}/render.js bypasses the write helpers`);
  }
  const src = fs.readFileSync(path.join(KIT, 'tools/installer/render-shared.js'), 'utf-8');
  const hits = [...src.matchAll(/fs\.(writeFileSync|copyFileSync)\(/g)];
  assert.strictEqual(hits.length, 1, 'only atomicWrite may write');
  const atomic = src.slice(src.indexOf('function atomicWrite'), src.indexOf('function emit'));
  assert.match(atomic, /fs\.writeFileSync\(/);
});

test('source: the dead v0.1 installer sync stub is gone', () => {
  assert.ok(!fs.existsSync(path.join(KIT, 'tools/installer/sync.js')));
});
