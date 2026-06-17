'use strict';

// wize-sec-recon.test.js — covers the nmap-only portion of the recon skill
// (SAST is a separate story E05 that shares the same skill).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');

const { loadPartial, PARTIALS_SUBDIR } = require('../../src/security-overlay/_shared/partial.js');

// The runner exports its dependencies as injectable. We require the file
// (without running it) and pass mocks in via the runRecon function.
delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-recon/scripts/run-recon.js')];
const { runRecon } = require('../../src/security-overlay/skills/wize-sec-recon/scripts/run-recon.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-recon-'));
  const sec = path.join(dir, '.wize', 'security');
  return { dir, sec };
}

function signedScope({ body = '## allowlist\nhosts:\n  - localhost\n  - 127.0.0.1\n## dast_target\nurl: http://localhost:3000\n', sha = 'reconhash' } = {}) {
  // The scope-parser includes the separator '\n' (after the closing ---)
  // in the body it returns. So we hash the same bytes the parser will see.
  const signedBody = '\n' + body;
  const hash = sha === 'reconhash'
    ? crypto.createHash('sha256').update(signedBody, 'utf8').digest('hex')
    : sha;
  return {
    frontmatter: { accepted_by: 'andrefrd', accepted_at: '2026-06-17T12:00:00Z', scope_sha256: hash },
    // Return the body as the parser would return it — starting with '\n'.
    body: signedBody
  };
}

test('runRecon writes open_ports section when nmap returns (AC-E04-1)', async () => {
  const { sec } = mkProject();
  const scope = signedScope();
  const mockExec = (bin, args, opts) => {
    assert.equal(bin, 'nmap');
    // Passive default: no -sV.
    assert.ok(!args.includes('-sV'), 'passive mode must NOT include -sV');
    assert.ok(!args.includes('-A'), 'passive mode must NOT include -A');
    assert.ok(args.includes('localhost') || args.includes('127.0.0.1'), 'target is one of the allowlisted hosts');
    return { stdout: '22/tcp  ssh  OpenSSH 8.0\n80/tcp  http  nginx 1.18\n', stderr: '' };
  };
  const r = await runRecon({
    securityDir: sec,
    scope,
    target: 'localhost',
    active: false,
    execFn: mockExec,
    detectFn: () => ({ nmap: { present: true, version: '7.94' } })
  });
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'recon' });
  assert.match(partial.body, /## open_ports/);
  assert.match(partial.body, /22\/tcp/);
  assert.match(partial.body, /80\/tcp/);
  assert.equal(partial.frontmatter.partial_status, 'complete');
});

test('runRecon includes -sV only when --active (AC-E04-1)', async () => {
  const { sec } = mkProject();
  const scope = signedScope();
  let captured = null;
  const mockExec = (bin, args) => { captured = args; return { stdout: '', stderr: '' }; };
  await runRecon({
    securityDir: sec,
    scope,
    target: 'localhost',
    active: true,
    execFn: mockExec,
    detectFn: () => ({ nmap: { present: true, version: '7.94' } })
  });
  assert.ok(captured.includes('-sV'), 'active mode should include -sV');
});

test('runRecon writes partial_status: incomplete when nmap is missing (AC-E04-2)', async () => {
  const { sec } = mkProject();
  const scope = signedScope();
  let execCalled = false;
  const r = await runRecon({
    securityDir: sec,
    scope,
    target: 'localhost',
    active: false,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ nmap: { present: false } })
  });
  assert.equal(execCalled, false, 'nmap must NOT be invoked when missing');
  assert.equal(r.ok, true, 'pipeline must continue even when nmap is missing (partial_status: incomplete)');
  const partial = loadPartial({ securityDir: sec, phase: 'recon' });
  assert.equal(partial.frontmatter.partial_status, 'incomplete');
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /nmap/);
});

test('runRecon writes degraded_checks section when target is out of scope (AC-E04-1)', async () => {
  const { sec } = mkProject();
  const scope = signedScope();
  let execCalled = false;
  const r = await runRecon({
    securityDir: sec,
    scope,
    target: 'evil.example.com',
    active: false,
    execFn: () => { execCalled = true; return { stdout: '', stderr: '' }; },
    detectFn: () => ({ nmap: { present: true, version: '7.94' } })
  });
  assert.equal(execCalled, false, 'nmap must NOT be invoked when target is out of scope');
  assert.equal(r.ok, false, 'runRecon returns ok=false when the gate refused the target');
  const partial = loadPartial({ securityDir: sec, phase: 'recon' });
  // Even when the target is refused, we still write a partial so the audit
  // trail is complete.
  assert.equal(partial.frontmatter.partial_status, 'incomplete');
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /evil\.example\.com/);
  assert.match(partial.body, /host not in allowlist/);
});

test('runRecon propagates ScopeError when scope is invalid', async () => {
  const { sec } = mkProject();
  const { ScopeError } = require('../../src/security-overlay/_shared/scope-gate.js');
  const scope = signedScope({ sha: 'WRONG_HASH' });
  await assert.rejects(
    () => runRecon({
      securityDir: sec,
      scope,
      target: 'localhost',
      active: false,
      execFn: () => ({ stdout: '', stderr: '' }),
      detectFn: () => ({ nmap: { present: true } })
    }),
    err => err instanceof ScopeError && err.code === 'HASH_MISMATCH'
  );
});