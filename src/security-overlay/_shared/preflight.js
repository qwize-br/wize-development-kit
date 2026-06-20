'use strict';

// preflight.js — detects the host environment (OS/arch/package manager)
// and which tools from data/tool-allowlist.json are installed.
//
// Test hook: when WIZE_SEC_PREFLIGHT_OS, WIZE_SEC_PREFLIGHT_PM, and
// WIZE_SEC_PREFLIGHT_TOOLS (JSON) env vars are set, the real probes
// are skipped and the values are returned directly. This lets tests
// simulate Mac/Linux/Windows-WSL without actually running `which` etc.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');

const ALLOWLIST_PATH = path.join(__dirname, '..', 'data', 'tool-allowlist.json');

function readToolNames() {
  try {
    const data = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
    // Skip _schema and any non-array fields.
    return Object.keys(data).filter(k => k !== '_schema' && Array.isArray(data[k]));
  } catch (_) {
    return [];
  }
}

function detectOS() {
  if (process.env.WIZE_SEC_PREFLIGHT_OS) return process.env.WIZE_SEC_PREFLIGHT_OS;
  const platform = os.platform();
  if (platform === 'linux') {
    // Detect WSL by reading /proc/version for "Microsoft" or "WSL".
    try {
      const v = fs.readFileSync('/proc/version', 'utf8');
      if (/microsoft|wsl/i.test(v)) return 'wsl';
    } catch (_) { /* not linux */ }
    return 'linux';
  }
  if (platform === 'darwin') return 'darwin';
  if (platform === 'win32') return 'win32';
  return 'linux';
}

function detectArch() {
  if (process.env.WIZE_SEC_PREFLIGHT_ARCH) return process.env.WIZE_SEC_PREFLIGHT_ARCH;
  return process.arch; // 'x64' | 'arm64' | 'ia32' etc.
}

function detectPackageManager(os) {
  if (process.env.WIZE_SEC_PREFLIGHT_PM) return process.env.WIZE_SEC_PREFLIGHT_PM;
  // Check for the most common PMs in order.
  const candidates = {
    linux: ['apt', 'dnf', 'pacman', 'zypper', 'apk'],
    wsl:   ['apt', 'dnf', 'pacman'],
    darwin: ['brew'],
    win32: ['scoop', 'chocolatey']
  };
  const list = candidates[os] || [];
  for (const pm of list) {
    const cmds = { apt: 'apt', dnf: 'dnf', pacman: 'pacman', zypper: 'zypper', apk: 'apk', brew: 'brew', scoop: 'scoop', chocolatey: 'choco' }[pm];
    try {
      execFileSync(cmds, ['--version'], { stdio: 'ignore' });
      return pm;
    } catch (_) { /* not present */ }
  }
  return 'none';
}

function whichCommand(os) {
  // 'command -v' on POSIX, 'where' on Windows.
  if (os === 'win32') return 'where';
  return 'command';
}

function whichArg(os) {
  if (os === 'win32') return [];
  return ['-v'];
}

function probeWhich(name, os) {
  try {
    const r = spawnSync(whichCommand(os), [...whichArg(os), name], { encoding: 'utf8', timeout: 2000 });
    if (r.status === 0 && r.stdout) {
      return r.stdout.split('\n')[0].trim();
    }
  } catch (_) { /* not present */ }
  return null;
}

function probeVersion(binPath, os) {
  // Try common version flags. Each is a separate probe; failure is non-fatal.
  const flags = ['--version', '-version', '-V', 'version'];
  for (const f of flags) {
    try {
      const out = execFileSync(binPath, [f], { encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] });
      const first = (out || '').split('\n')[0].trim();
      if (first) return first.slice(0, 120);
    } catch (_) { /* try next */ }
  }
  return null;
}

function detectTools(os) {
  const names = readToolNames();
  const tools = {};
  // Initialize all tools as missing.
  for (const n of names) tools[n] = { present: false };
  // Test hook: parse the JSON env var. The hook marks the listed tools as
  // present; everything else stays missing.
  if (process.env.WIZE_SEC_PREFLIGHT_TOOLS) {
    try {
      const m = JSON.parse(process.env.WIZE_SEC_PREFLIGHT_TOOLS);
      for (const [name, path] of Object.entries(m)) {
        if (!(name in tools)) tools[name] = { present: !!path, path: path || undefined, version: null };
        else {
          tools[name] = { present: !!path, path: path || undefined, version: null };
        }
      }
    } catch (_) { /* fall through to real detection */ }
    return tools;
  }
  // Real detection.
  for (const name of names) {
    const p = probeWhich(name, os);
    if (!p) {
      tools[name] = { present: false };
    } else {
      tools[name] = { present: true, path: p, version: probeVersion(p, os) };
    }
  }
  return tools;
}

function runPreflight(opts = {}) {
  const os_ = detectOS();
  const arch = detectArch();
  const pm = detectPackageManager(os_);
  const tools = detectTools(os_);
  const missing = Object.entries(tools).filter(([, v]) => !v.present).map(([k]) => k);
  return {
    os: os_,
    arch,
    packageManager: pm,
    tools,
    missing,
    node: process.version,
    nodePath: process.execPath
  };
}

function formatReport(p) {
  const present = Object.entries(p.tools).filter(([, v]) => v.present);
  const lines = [];
  lines.push(`OS: ${p.os} (${p.arch})`);
  lines.push(`Package manager: ${p.packageManager || 'none'}`);
  lines.push(`Node: ${p.node}`);
  lines.push('');
  lines.push(`Tools: ${present.length} present, ${p.missing.length} missing`);
  if (present.length) {
    lines.push('  present:');
    for (const [name, info] of present) {
      const v = info.version ? ` — ${info.version}` : '';
      lines.push(`    ✓ ${name}${v}`);
    }
  }
  if (p.missing.length) {
    lines.push('  missing:');
    for (const name of p.missing) lines.push(`    ✗ ${name}`);
    lines.push('');
    lines.push('Run the install script (see .wize/security/install-pentest-tools.sh) to add the missing tools.');
  }
  return lines.join('\n');
}

module.exports = { runPreflight, formatReport, readToolNames };
