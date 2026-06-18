'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

delete require.cache[require.resolve('../../src/security-overlay/_shared/install-script.js')];

function freshRequire() {
  delete require.cache[require.resolve('../../src/security-overlay/_shared/install-script.js')];
  return require('../../src/security-overlay/_shared/install-script.js');
}

test('install script for linux/apt includes apt-get install for missing tools', () => {
  const { generateInstallScript } = freshRequire();
  const pre = {
    os: 'linux',
    arch: 'x64',
    packageManager: 'apt',
    tools: {
      nmap: { present: true },
      gitleaks: { present: false },
      'osv-scanner': { present: false },
      nuclei: { present: false }
    },
    missing: ['gitleaks', 'osv-scanner', 'nuclei']
  };
  const script = generateInstallScript(pre);
  assert.match(script, /apt-get install/);
  assert.match(script, /gitleaks/);
  assert.match(script, /nuclei/);
  // Tools that are present should not be in the install list.
  assert.ok(!/\bapt-get install.*\bnmap\b/.test(script), 'present tools should not be re-installed');
});

test('install script for darwin/brew uses brew install', () => {
  const { generateInstallScript } = freshRequire();
  const pre = {
    os: 'darwin', arch: 'arm64', packageManager: 'brew',
    tools: { nmap: { present: false }, curl: { present: true } },
    missing: ['nmap']
  };
  const script = generateInstallScript(pre);
  assert.match(script, /brew install/);
  assert.match(script, /nmap/);
  assert.ok(!/brew install.*\bcurl\b/.test(script));
});

test('install script for win32/scoop uses scoop install', () => {
  const { generateInstallScript } = freshRequire();
  const pre = {
    os: 'win32', arch: 'x64', packageManager: 'scoop',
    tools: { nmap: { present: false } },
    missing: ['nmap']
  };
  const script = generateInstallScript(pre);
  assert.match(script, /scoop install/);
});

test('install script for wsl uses apt-get (delegated to the Linux side)', () => {
  const { generateInstallScript } = freshRequire();
  const pre = {
    os: 'wsl', arch: 'x64', packageManager: 'apt',
    tools: { nmap: { present: false } },
    missing: ['nmap']
  };
  const script = generateInstallScript(pre);
  assert.match(script, /apt-get install/);
});

test('install script for unknown PM (none) returns a manual-install guide', () => {
  const { generateInstallScript } = freshRequire();
  const pre = {
    os: 'linux', arch: 'x64', packageManager: 'none',
    tools: { nmap: { present: false } },
    missing: ['nmap']
  };
  const script = generateInstallScript(pre);
  // We don't know the PM, so the script falls back to manual links.
  assert.match(script, /manual/i);
  assert.match(script, /nmap/);
});

test('install script includes a header explaining what it does', () => {
  const { generateInstallScript } = freshRequire();
  const pre = {
    os: 'linux', arch: 'x64', packageManager: 'apt',
    tools: { nmap: { present: false } },
    missing: ['nmap']
  };
  const script = generateInstallScript(pre);
  // Header explaining what the script does + a shebang.
  assert.match(script, /^#!\/bin\/bash/);
  assert.match(script, /security-overlay/i);
  assert.match(script, /set -e/);
});

test('install script is idempotent: re-running on a fixed host is a no-op', () => {
  const { generateInstallScript } = freshRequire();
  const pre = {
    os: 'linux', arch: 'x64', packageManager: 'apt',
    tools: {
      // Some present, some not — the script should not re-install the
      // present ones (idempotency) and should install the missing ones.
      nmap: { present: true },
      gitleaks: { present: false }
    },
    missing: ['gitleaks']
  };
  const script = generateInstallScript(pre);
  // gitleaks should be installed.
  assert.match(script, /gitleaks/);
  // nmap should NOT be reinstalled.
  assert.ok(!/apt-get install.*\bnmap\b/.test(script),
    'script must not reinstall already-present tools (idempotency)');
});

test('install script for chocolatey (win32) uses choco install', () => {
  const { generateInstallScript } = freshRequire();
  const pre = {
    os: 'win32', arch: 'x64', packageManager: 'chocolatey',
    tools: { nmap: { present: false } },
    missing: ['nmap']
  };
  const script = generateInstallScript(pre);
  assert.match(script, /choco install/);
});
