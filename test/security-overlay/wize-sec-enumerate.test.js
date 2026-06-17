'use strict';

// wize-sec-enumerate.test.js — second phase: HTTP probing + tech inference.
// Reads recon.md, enumerates surface from any HTTP/HTTPS ports found.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');

const { loadPartial, writePartial } = require('../../src/security-overlay/_shared/partial.js');

delete require.cache[require.resolve('../../src/security-overlay/skills/wize-sec-enumerate/scripts/run-enumerate.js')];
const { runEnumerate } = require('../../src/security-overlay/skills/wize-sec-enumerate/scripts/run-enumerate.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-enum-'));
  const sec = path.join(dir, '.wize', 'security');
  return { dir, sec };
}

function signedScope({ body = '## allowlist\nhosts:\n  - localhost\n  - 127.0.0.1\nurls:\n  - https://staging.example.internal/api/\n## dast_target\nurl: http://localhost:3000\n' } = {}) {
  const signedBody = '\n' + body;
  const hash = crypto.createHash('sha256').update(signedBody, 'utf8').digest('hex');
  return {
    frontmatter: { accepted_by: 'andrefrd', accepted_at: '2026-06-17T12:00:00Z', scope_sha256: hash },
    body: signedBody
  };
}

test('runEnumerate enumerates endpoints + tech from recon.md (AC-E04-3)', async () => {
  const { sec } = mkProject();
  // Seed a recon.md with open ports so the enumerator has something to probe.
  writePartial({
    securityDir: sec,
    phase: 'recon',
    mode: 'passive',
    scope: signedScope(),
    status: 'complete',
    sections: { open_ports: '- **80/tcp** `http` — nginx 1.18\n- **443/tcp** `https` — nginx' }
  });
  const scope = signedScope();
  // Mock curl probing.
  const mockCurl = (bin, args) => {
    if (args.includes('-sI')) {
      const url = args[args.length - 1];
      if (url.startsWith('https://')) {
        return { stdout: 'HTTP/1.1 200 OK\r\nServer: nginx/1.18\r\nX-Powered-By: Express\r\n', stderr: '' };
      }
      return { stdout: 'HTTP/1.1 200 OK\r\nServer: nginx/1.18\r\n', stderr: '' };
    }
    return { stdout: '', stderr: '' };
  };
  const r = await runEnumerate({
    securityDir: sec,
    scope,
    active: false,
    execFn: mockCurl,
    detectFn: () => ({ curl: { present: true }, nuclei: { present: false } })
  });
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'enumerate' });
  assert.match(partial.body, /## surface/);
  assert.match(partial.body, /## tech/);
  assert.match(partial.body, /nginx/);
  assert.match(partial.body, /Express/);
  assert.deepEqual(partial.frontmatter.depends_on, ['recon']);
});

test('runEnumerate marks partial_status: incomplete when recon.md is missing (AC-E04-3)', async () => {
  const { sec } = mkProject();
  const scope = signedScope();
  const r = await runEnumerate({
    securityDir: sec,
    scope,
    active: false,
    execFn: () => ({ stdout: '', stderr: '' }),
    detectFn: () => ({ curl: { present: true }, nuclei: { present: false } })
  });
  // No recon -> nothing to probe, but the partial is still written so the
  // audit trail is complete.
  assert.equal(r.ok, true);
  const partial = loadPartial({ securityDir: sec, phase: 'enumerate' });
  assert.equal(partial.frontmatter.partial_status, 'incomplete');
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /recon\.md/);
});

test('runEnumerate refuses out-of-scope targets via assertTargetInScope (AC-E04-3)', async () => {
  // Scope: only 127.0.0.1. Recon: open_ports mentions evil.example.com.
  // The enumerator iterates the SCOPE's hostAllowlist, not the recon's
  // listed hosts. evil.example.com is irrelevant to which targets the
  // enumerator probes — but the partial must still be written and the
  // allowlisted host (127.0.0.1) is the one that gets probed. This locks
  // in the contract that the gate is the only source of truth for
  // targets.
  const { sec } = mkProject();
  const body = '\n## allowlist\nhosts:\n  - 127.0.0.1\nurls: []\n## dast_target\nurl: http://127.0.0.1:3000\n';
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  const scope = {
    frontmatter: { accepted_by: 'andrefrd', accepted_at: '2026-06-17T12:00:00Z', scope_sha256: hash },
    body
  };
  writePartial({
    securityDir: sec,
    phase: 'recon',
    mode: 'passive',
    scope,
    status: 'complete',
    sections: { open_ports: '- **80/tcp** `http` — evil.example.com' }
  });
  const probed = [];
  await runEnumerate({
    securityDir: sec,
    scope,
    active: false,
    execFn: (bin, args) => {
      if (args.includes('-sI')) probed.push(args[args.length - 1]);
      return { stdout: 'HTTP/1.1 200 OK\r\nServer: nginx\r\n', stderr: '' };
    },
    detectFn: () => ({ curl: { present: true } })
  });
  // The enumerator MUST NOT probe evil.example.com — even though the recon
  // mentioned it. The scope is the only source of truth.
  for (const url of probed) {
    assert.ok(!url.includes('evil.example.com'),
      `enumerator must not probe out-of-scope hosts; probed: ${url}`);
  }
  // And it should probe 127.0.0.1:80 (which IS in the allowlist).
  assert.ok(probed.some(u => u.includes('127.0.0.1') && u.includes(':80')));
});

test('runEnumerate degrades when both curl and nuclei are missing (AC-E04-3)', async () => {
  const { sec } = mkProject();
  const scope = signedScope();
  writePartial({
    securityDir: sec,
    phase: 'recon',
    mode: 'passive',
    scope,
    status: 'complete',
    sections: { open_ports: '- **80/tcp** `http` — nginx' }
  });
  const r = await runEnumerate({
    securityDir: sec,
    scope,
    active: false,
    execFn: () => ({ stdout: '', stderr: '' }),
    detectFn: () => ({ curl: { present: false }, nuclei: { present: false } })
  });
  const partial = loadPartial({ securityDir: sec, phase: 'enumerate' });
  assert.equal(partial.frontmatter.partial_status, 'incomplete');
  assert.match(partial.body, /## degraded_checks/);
  assert.match(partial.body, /curl|nuclei/);
});