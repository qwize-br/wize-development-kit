'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('crypto');

const { writePartial } = require('../../src/security-overlay/_shared/partial.js');

delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-pentest/scripts/run-pipeline.js')];
const { runPipeline } = require('../../src/security-overlay/skills/wize-sec-pentest/scripts/run-pipeline.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-prepipe-'));
  const sec = path.join(dir, '.wize', 'security');
  fs.mkdirSync(sec, { recursive: true });
  return { dir, sec };
}

function signedScope() {
  const body = '\n## allowlist\nhosts: []\nurls: []\n## dast_target\nurl: http://localhost\n';
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  return {
    frontmatter: { accepted_by: 'a', accepted_at: '2026-06-17T12:00:00Z', scope_sha256: hash },
    body
  };
}

test('orchestrator runs the preflight and prints the summary even when tools are missing', async () => {
  const { sec } = mkProject();
  // Simulate linux/apt with no tools installed.
  process.env.WIZE_SEC_PREFLIGHT_OS = 'linux';
  process.env.WIZE_SEC_PREFLIGHT_PM = 'apt';
  process.env.WIZE_SEC_PREFLIGHT_TOOLS = JSON.stringify({ node: '/usr/bin/node' });
  const r = await runPipeline({
    scopePath: '/dev/null',
    active: false,
    loadScopeFn: () => signedScope(),
    invokePhase: async () => ({ ok: true, code: 0, stdout: '', stderr: '' })
  });
  assert.equal(r.ok, true, 'orchestrator must continue even when tools are missing (permissive mode)');
  assert.ok(r.preflight, 'result should include a preflight object');
  assert.equal(r.preflight.os, 'linux');
  assert.ok(r.preflight.missing.length > 0, 'preflight should report missing tools');
});

test('orchestrator writes install-pentest-tools.sh when tools are missing', async () => {
  const { dir, sec } = mkProject();
  process.env.WIZE_SEC_PREFLIGHT_OS = 'linux';
  process.env.WIZE_SEC_PREFLIGHT_PM = 'apt';
  process.env.WIZE_SEC_PREFLIGHT_TOOLS = JSON.stringify({ node: '/usr/bin/node' });
  const r = await runPipeline({
    scopePath: '/dev/null',
    active: false,
    securityDir: sec,
    loadScopeFn: () => signedScope(),
    invokePhase: async () => ({ ok: true, code: 0, stdout: '', stderr: '' })
  });
  const scriptPath = path.join(sec, 'install-pentest-tools.sh');
  assert.ok(fs.existsSync(scriptPath), 'install-pentest-tools.sh should be written');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.match(content, /^#!\/bin\/bash/);
  assert.match(content, /apt-get install/);
});

test('orchestrator does NOT overwrite install-pentest-tools.sh if it already exists', async () => {
  const { sec } = mkProject();
  // Pre-create the file with a marker the test can detect.
  const scriptPath = path.join(sec, 'install-pentest-tools.sh');
  fs.writeFileSync(scriptPath, '#!/bin/bash\n# USER-EDITED: do not clobber\n', 'utf8');
  process.env.WIZE_SEC_PREFLIGHT_OS = 'linux';
  process.env.WIZE_SEC_PREFLIGHT_PM = 'apt';
  process.env.WIZE_SEC_PREFLIGHT_TOOLS = JSON.stringify({ node: '/usr/bin/node' });
  await runPipeline({
    scopePath: '/dev/null',
    active: false,
    loadScopeFn: () => signedScope(),
    invokePhase: async () => ({ ok: true, code: 0, stdout: '', stderr: '' })
  });
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.match(content, /USER-EDITED/);
});

test('orchestrator still runs all phases even when tools are missing (permissive mode)', async () => {
  const { sec } = mkProject();
  process.env.WIZE_SEC_PREFLIGHT_OS = 'linux';
  process.env.WIZE_SEC_PREFLIGHT_PM = 'apt';
  process.env.WIZE_SEC_PREFLIGHT_TOOLS = JSON.stringify({ node: '/usr/bin/node' });
  const calls = [];
  await runPipeline({
    scopePath: '/dev/null',
    active: false,
    loadScopeFn: () => signedScope(),
    invokePhase: async (phase) => { calls.push(phase); return { ok: true, code: 0, stdout: '', stderr: '' }; }
  });
  assert.deepEqual(calls, ['wize-sec-recon', 'wize-sec-enumerate', 'wize-sec-exploit', 'wize-sec-report']);
});