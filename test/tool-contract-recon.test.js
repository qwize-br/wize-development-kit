'use strict';

// Tool contract smoke tests — recon phase (nmap, gitleaks, osv-scanner, grype).
// RETRO-1: Each test runs the real binary with --version or --help, skips if
// the tool is not installed, and validates expected CLI flags exist.

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');

function toolPresent(bin) {
  try { execFileSync(bin, ['--version'], { timeout: 5000, stdio: 'pipe' }); return true; }
  catch { return false; }
}

function run(bin, args) {
  try {
    return execFileSync(bin, args, { timeout: 10000, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    return (e.stdout || '') + '\n' + (e.stderr || '');
  }
}

// ── nmap ────────────────────────────────────────────────────────────────────

test('nmap --version outputs version string', { skip: !toolPresent('nmap') }, () => {
  const out = run('nmap', ['--version']);
  assert.match(out, /Nmap version/i, 'nmap --version should print version');
});

test('nmap accepts -Pn -T4 -sV flags', { skip: !toolPresent('nmap') }, () => {
  const out = run('nmap', ['--help']);
  assert.match(out, /-Pn/, 'nmap help should document -Pn');
  assert.match(out, /-T[<0-5]/, 'nmap help should document -T');
  assert.match(out, /-sV/, 'nmap help should document -sV');
});

// ── gitleaks ────────────────────────────────────────────────────────────────

test('gitleaks --version outputs version', { skip: !toolPresent('gitleaks') }, () => {
  const out = run('gitleaks', ['--version']);
  assert.match(out, /\d+\.\d+/, 'gitleaks --version should print a version number');
});

test('gitleaks detect accepts -s -f -r flags', { skip: !toolPresent('gitleaks') }, () => {
  const out = run('gitleaks', ['detect', '--help']);
  assert.match(out, /-s,?\s+--source/, 'gitleaks detect should document -s/--source');
  assert.match(out, /-f,?\s+--report-format/, 'gitleaks detect should document -f/--report-format');
  assert.match(out, /-r,?\s+--report-path/, 'gitleaks detect should document -r/--report-path');
});

// ── osv-scanner ──────────────────────────────────────────────────────────────

test('osv-scanner --version outputs version', { skip: !toolPresent('osv-scanner') }, () => {
  const out = run('osv-scanner', ['--version']);
  assert.match(out, /osv-scanner|version/i, 'osv-scanner --version should print version');
});

test('osv-scanner scan accepts -L --format json flags', { skip: !toolPresent('osv-scanner') }, () => {
  const out = run('osv-scanner', ['scan', '--help']);
  assert.match(out, /-L\b/, 'osv-scanner scan should document -L');
  assert.match(out, /--lockfile/, 'osv-scanner scan should document --lockfile');
  assert.match(out, /--format/, 'osv-scanner scan should document --format');
});

// ── grype ───────────────────────────────────────────────────────────────────

test('grype --version outputs version', { skip: !toolPresent('grype') }, () => {
  const out = run('grype', ['--version']);
  assert.match(out, /grype|Application/, 'grype --version should print version info');
});

test('grype accepts -o json flag', { skip: !toolPresent('grype') }, () => {
  const out = run('grype', ['--help']);
  assert.match(out, /-o,?\s+--output/, 'grype help should document -o/--output');
});
