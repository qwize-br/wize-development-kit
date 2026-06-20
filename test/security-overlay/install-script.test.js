'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

delete require.cache[require.resolve('../../src/security-overlay/_shared/install-script.js')];

function freshRequire() {
  delete require.cache[require.resolve('../../src/security-overlay/_shared/install-script.js')];
  return require('../../src/security-overlay/_shared/install-script.js');
}

test('install script installs apt tools via apt and GitHub binaries via curl', () => {
  const { generateInstallScript } = freshRequire();
  const pre = {
    os: 'linux',
    arch: 'x64',
    packageManager: 'apt',
    missing: ['nmap', 'gitleaks', 'osv-scanner', 'nuclei']
  };
  const script = generateInstallScript(pre);
  // nmap IS in apt -> apt-get install nmap.
  assert.match(script, /apt-get install -y nmap/);
  // gitleaks/nuclei/osv-scanner are NOT in apt -> GitHub release download.
  assert.match(script, /github\.com\/gitleaks\/gitleaks\/releases/);
  assert.match(script, /github\.com\/projectdiscovery\/nuclei\/releases/);
  assert.match(script, /github\.com\/google\/osv-scanner\/releases/);
  // The GitHub binaries must NOT appear in an apt-get install line.
  assert.ok(!/apt-get install[^\n]*gitleaks/.test(script), 'gitleaks must not be apt-installed');
  assert.ok(!/apt-get install[^\n]*nuclei/.test(script), 'nuclei must not be apt-installed');
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

test('install script for unknown PM (none) falls back to manual links for PM tools', () => {
  const { generateInstallScript } = freshRequire();
  const pre = {
    os: 'linux', arch: 'x64', packageManager: 'none',
    missing: ['nmap']
  };
  const script = generateInstallScript(pre);
  // nmap needs a PM but none was detected -> point at the project page.
  assert.match(script, /package manager/i);
  assert.match(script, /nmap\.org|nmap/);
});

test('install script installs GitHub binaries even when no PM is present', () => {
  const { generateInstallScript } = freshRequire();
  const pre = {
    os: 'linux', arch: 'x64', packageManager: 'none',
    missing: ['ffuf', 'gitleaks']
  };
  const script = generateInstallScript(pre);
  // GitHub binaries don't need a PM — they should still install.
  assert.match(script, /github\.com\/ffuf\/ffuf\/releases/);
  assert.match(script, /github\.com\/gitleaks\/gitleaks\/releases/);
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
  assert.match(script, /^#!\/usr\/bin\/env bash/);
  assert.match(script, /security-overlay/i);
  assert.match(script, /set -euo pipefail/);
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
