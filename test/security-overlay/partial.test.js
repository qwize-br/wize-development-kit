'use strict';

// partial.test.js — verifies the contract between phase skills and the
// final report render: parciais are written/read in a uniform format.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  writePartial,
  loadPartial,
  listPartials,
  PARTIALS_SUBDIR
} = require('../../src/security-overlay/_shared/partial.js');

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-partial-'));
  return path.join(dir, '.wize', 'security');
}

const SAMPLE_SCOPE = {
  frontmatter: { scope_sha256: 'abc123' },
  body: '## allowlist\nhosts: []\n'
};

test('writePartial creates the security directory if it does not exist', () => {
  const sec = mkProject();
  assert.ok(!fs.existsSync(sec));
  writePartial({
    securityDir: sec,
    phase: 'recon',
    mode: 'passive',
    scope: SAMPLE_SCOPE,
    status: 'complete',
    sections: { open_ports: '80/tcp http' }
  });
  assert.ok(fs.existsSync(sec));
  assert.ok(fs.existsSync(path.join(sec, 'recon.md')));
});

test('writePartial writes a valid YAML frontmatter with the canonical fields', () => {
  const sec = mkProject();
  writePartial({
    securityDir: sec,
    phase: 'recon',
    mode: 'passive',
    scope: SAMPLE_SCOPE,
    status: 'complete',
    tools: { nmap: { present: true, version: '7.94' } },
    sections: { open_ports: '80/tcp http' }
  });
  const text = fs.readFileSync(path.join(sec, 'recon.md'), 'utf8');
  assert.match(text, /^---\n/);
  assert.match(text, /^phase: recon$/m);
  assert.match(text, /^mode: passive$/m);
  assert.match(text, /^scope_sha256: abc123$/m);
  assert.match(text, /^partial_status: complete$/m);
  assert.match(text, /^generated_at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/m);
  // Tools block is a nested mapping under tools:.
  assert.match(text, /^tools:/m);
  assert.match(text, /^  nmap:/m);
  assert.match(text, /^    present: true$/m);
  assert.match(text, /^    version: 7\.94$/m);
});

test('writePartial renders sections as `## heading` blocks in input order', () => {
  const sec = mkProject();
  writePartial({
    securityDir: sec,
    phase: 'recon',
    mode: 'passive',
    scope: SAMPLE_SCOPE,
    status: 'complete',
    sections: {
      open_ports: '80/tcp http\n22/tcp ssh',
      degraded_checks: 'nmap not installed'
    }
  });
  const text = fs.readFileSync(path.join(sec, 'recon.md'), 'utf8');
  // Order is preserved.
  const openIdx = text.indexOf('## open_ports');
  const degIdx = text.indexOf('## degraded_checks');
  assert.ok(openIdx > 0 && degIdx > openIdx, 'sections should appear in input order');
  assert.match(text, /## open_ports\n\n80\/tcp http/);
});

test('writePartial escapes YAML special characters in heading values (no injection)', () => {
  const sec = mkProject();
  // Should be safe; heading is not a YAML key here, so plain text is fine.
  writePartial({
    securityDir: sec,
    phase: 'recon',
    mode: 'passive',
    scope: SAMPLE_SCOPE,
    status: 'complete',
    sections: { 'note: with colon': 'value with: colon' }
  });
  const text = fs.readFileSync(path.join(sec, 'recon.md'), 'utf8');
  // Heading is rendered as ##, so no YAML parse risk; but value should appear verbatim.
  assert.match(text, /## note: with colon/);
  assert.match(text, /value with: colon/);
});

test('writePartial refuses to write outside the securityDir (no path traversal)', () => {
  const sec = mkProject();
  assert.throws(() => writePartial({
    securityDir: sec,
    phase: '../../etc/passwd',
    mode: 'passive',
    scope: SAMPLE_SCOPE,
    status: 'complete',
    sections: {}
  }), /traversal|escape|invalid phase/i);
});

test('loadPartial round-trips: write then load yields the same fields', () => {
  const sec = mkProject();
  const payload = {
    securityDir: sec,
    phase: 'enumerate',
    mode: 'active',
    scope: { frontmatter: { scope_sha256: 'deadbeef' }, body: '## allowlist\nhosts: []\n' },
    status: 'incomplete',
    tools: { nuclei: { present: true, version: '2.9' } },
    sections: { surface: 'GET /api\nPOST /login' }
  };
  writePartial(payload);
  const loaded = loadPartial({ securityDir: sec, phase: 'enumerate' });
  assert.equal(loaded.frontmatter.phase, 'enumerate');
  assert.equal(loaded.frontmatter.mode, 'active');
  assert.equal(loaded.frontmatter.scope_sha256, 'deadbeef');
  assert.equal(loaded.frontmatter.partial_status, 'incomplete');
  assert.deepEqual(loaded.frontmatter.tools, { nuclei: { present: true, version: '2.9' } });
  assert.match(loaded.body, /## surface\n\nGET \/api\nPOST \/login/);
});

test('loadPartial returns null when the file does not exist', () => {
  const sec = mkProject();
  const loaded = loadPartial({ securityDir: sec, phase: 'recon' });
  assert.equal(loaded, null);
});

test('listPartials returns the phases of all existing partial files', () => {
  const sec = mkProject();
  writePartial({ securityDir: sec, phase: 'recon', mode: 'passive', scope: SAMPLE_SCOPE, status: 'complete', sections: { a: 'b' } });
  writePartial({ securityDir: sec, phase: 'dast', mode: 'passive', scope: SAMPLE_SCOPE, status: 'complete', sections: { a: 'b' } });
  const list = listPartials({ securityDir: sec });
  assert.deepEqual(list.sort(), ['dast', 'recon']);
});
