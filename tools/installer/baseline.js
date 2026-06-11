// Brownfield baseline runner — detects AI harness CLIs available on PATH and,
// when authorized, executes `/wize-document-project` headlessly to populate
// .wize/knowledge/document-project/. Falls back to printed instructions when
// no harness is present or the user opts out.
//
// Harness priority is:
//   1. user's selected IDE targets (from .wize/config/project.toml), highest first
//   2. claude > codex > opencode (universal fallback)
//
// Set WIZE_SKIP_BASELINE=1 in the environment to disable any execution (the
// install still suggests the next step). Useful for CI and unattended setups.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Harness registry — for each supported CLI we know:
//   binary  : the executable name to find on PATH
//   ideCode : the matching `ide_targets` code in project.toml (so we can prioritize)
//   buildCmd: returns the spawnSync args (binary + arg list) for a headless run
const HARNESSES = [
  {
    code: 'claude-code',
    binary: 'claude',
    buildCmd: (prompt) => ({ cmd: 'claude', args: ['-p', prompt] })
  },
  {
    code: 'codex',
    binary: 'codex',
    buildCmd: (prompt) => ({ cmd: 'codex', args: ['exec', '--', prompt] })
  },
  {
    code: 'opencode',
    binary: 'opencode',
    buildCmd: (prompt) => ({ cmd: 'opencode', args: ['run', prompt] })
  }
];

function whichSync(bin) {
  // Manual PATH walk — more predictable than shelling out to `which`/`where`,
  // honors PATH overrides set by callers (and our tests), and stays portable.
  const PATH = process.env.PATH || '';
  const sep = process.platform === 'win32' ? ';' : ':';
  const exts = process.platform === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : [''];
  for (const dir of PATH.split(sep).filter(Boolean)) {
    for (const ext of exts) {
      const candidate = path.join(dir, bin + ext);
      try {
        const st = fs.statSync(candidate);
        if (st.isFile() && (process.platform === 'win32' || (st.mode & 0o111))) {
          return candidate;
        }
      } catch (_) { /* not here, keep looking */ }
    }
  }
  return null;
}

// Returns an ordered list of harnesses present on PATH. When `preferIde`
// includes a harness's `code`, it floats to the top of the result.
function detectHarnessCli({ preferIde = [] } = {}) {
  const found = [];
  for (const h of HARNESSES) {
    const p = whichSync(h.binary);
    if (p) found.push({ ...h, path: p });
  }
  // Float preferred IDE targets to the top, keep relative order otherwise.
  return found.sort((a, b) => {
    const ai = preferIde.indexOf(a.code);
    const bi = preferIde.indexOf(b.code);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// Run the harness headless with the document-project prompt. Returns
// { ok: boolean, exitCode, stdout, stderr }.
function runHeadlessBaseline({ harness, projectRoot, prompt, log = console.log }) {
  if (process.env.WIZE_SKIP_BASELINE === '1') {
    log('WIZE_SKIP_BASELINE=1 — not running the baseline; you can do it later in your IDE.');
    return { ok: false, skipped: true };
  }
  const { cmd, args } = harness.buildCmd(prompt);
  log(`Running ${cmd} ${args.map(a => /\s/.test(a) ? '"' + a + '"' : a).join(' ')}\n`);
  const r = spawnSync(cmd, args, { cwd: projectRoot, stdio: 'inherit' });
  return { ok: r.status === 0, exitCode: r.status, signal: r.signal };
}

function manualInstructions(harness) {
  if (!harness) {
    return [
      '',
      'No AI harness CLI was detected on PATH (claude / codex / opencode).',
      'Open your IDE in this repo and run:',
      '  /wize-document-project',
      ''
    ].join('\n');
  }
  const { cmd, args } = harness.buildCmd('/wize-document-project');
  const shown = `${cmd} ${args.map(a => /\s/.test(a) ? '"' + a + '"' : a).join(' ')}`;
  return [
    '',
    `Skipping the headless run. When you're ready, run from this folder:`,
    `  ${shown}`,
    '',
    `Or open your IDE and type:  /wize-document-project`,
    ''
  ].join('\n');
}

function defaultPrompt() {
  return 'Activate the wize-document-project skill and execute it on this repository. Follow the steps in .claude/skills/wize-document-project/SKILL.md (or the equivalent path for your IDE). Output the baseline docs under .wize/knowledge/document-project/.';
}

module.exports = {
  HARNESSES,
  whichSync,
  detectHarnessCli,
  runHeadlessBaseline,
  manualInstructions,
  defaultPrompt
};
