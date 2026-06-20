'use strict';

// orchestrator.test.js — verifies the pipeline ordering + active propagation
// of wize-sec-pentest. We inject the dependencies directly (loadScopeFn,
// invokePhase) so we don't depend on real skills existing for every phase
// yet (those land in E04–E07).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Delete the runner from the require cache so a fresh require re-evaluates
// the module. The runner resolves invokePhase lazily (per call), so a simple
// import is enough — we pass mocks via the runPipeline options.
delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-pentest/scripts/run-pipeline.js')];
const { runPipeline } = require('../../src/security-overlay/skills/wize-sec-pentest/scripts/run-pipeline.js');

function fakeScope() {
  return { frontmatter: { accepted_by: 'x', accepted_at: '2026-01-01T00:00:00Z', scope_sha256: '0'.repeat(64) }, body: '## allowlist\nhosts: []\n' };
}

test('orchestrator runs phases in canonical order: recon -> enumerate -> exploit -> report (AC-E03-2)', async () => {
  const calls = [];
  const mockInvoke = async (skill) => { calls.push(skill); return { ok: true, code: 0, stdout: '', stderr: '' }; };
  const result = await runPipeline({
    scopePath: '/dev/null',
    active: false,
    loadScopeFn: fakeScope,
    invokePhase: mockInvoke
  });
  assert.deepEqual(calls, ['wize-sec-recon', 'wize-sec-enumerate', 'wize-sec-exploit', 'wize-sec-report']);
  assert.equal(result.ok, true);
});

test('orchestrator propagates --active to every phase invocation (AC-E03-2)', async () => {
  const seen = [];
  const mockInvoke = async (skill, opts) => { seen.push({ skill, active: !!(opts && opts.active) }); return { ok: true, code: 0, stdout: '', stderr: '' }; };
  await runPipeline({
    scopePath: '/dev/null',
    active: true,
    loadScopeFn: fakeScope,
    invokePhase: mockInvoke
  });
  assert.equal(seen.length, 4);
  for (const entry of seen) {
    assert.equal(entry.active, true, `phase ${entry.skill} should receive active=true`);
  }
});

test('orchestrator continues past a failed phase (AC-E03-2 — NFR Reliability #2)', async () => {
  const calls = [];
  let first = true;
  const mockInvoke = async (skill) => {
    calls.push(skill);
    if (first) { first = false; return { ok: false, code: 2, stdout: '', stderr: 'boom' }; }
    return { ok: true, code: 0, stdout: '', stderr: '' };
  };
  const result = await runPipeline({
    scopePath: '/dev/null',
    active: false,
    loadScopeFn: fakeScope,
    invokePhase: mockInvoke
  });
  assert.deepEqual(calls, ['wize-sec-recon', 'wize-sec-enumerate', 'wize-sec-exploit', 'wize-sec-report']);
  assert.equal(result.ok, true, 'pipeline ok=true if at least one phase succeeded');
  assert.deepEqual(result.skipped, ['wize-sec-recon']);
});

test('orchestrator returns ok=false only when every phase failed', async () => {
  const mockInvoke = async () => ({ ok: false, code: 1, stdout: '', stderr: '' });
  const result = await runPipeline({
    scopePath: '/dev/null',
    active: false,
    loadScopeFn: fakeScope,
    invokePhase: mockInvoke
  });
  assert.equal(result.ok, false);
});

test('orchestrator throws when loadScope fails (ScopeError propagates — caller decides)', async () => {
  const { ScopeError } = require('../../src/security-overlay/_shared/scope-gate.js');
  const loadScopeFn = () => { throw new ScopeError('MISSING_FILE', null, 'no scope'); };
  await assert.rejects(
    () => runPipeline({
      scopePath: '/dev/null',
      active: false,
      loadScopeFn,
      invokePhase: async () => ({ ok: true, code: 0, stdout: '', stderr: '' })
    }),
    err => err.code === 'MISSING_FILE'
  );
});

test('orchestrator surface area: runPipeline is a function exported from the script', () => {
  assert.equal(typeof runPipeline, 'function');
});
