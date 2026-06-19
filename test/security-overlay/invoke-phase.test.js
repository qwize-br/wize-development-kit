'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const {
  invokePhase,
  resolvePhaseScript,
  _spawnForTest
} = require('../../src/security-overlay/_shared/invoke-phase.js');

// --- resolvePhaseScript (pure function) -----------------------------------

test('resolvePhaseScript maps skill name to a concrete script path inside the kit', () => {
  const KIT = path.resolve(__dirname, '..', '..');
  const p = resolvePhaseScript('wize-sec-recon', { kitRoot: KIT });
  // Should be inside src/security-overlay/skills/wize-sec-recon/scripts/
  assert.match(p, /src\/security-overlay\/skills\/wize-sec-recon\/scripts\//);
  assert.match(p, /\.js$/);
});

test('resolvePhaseScript rejects skill names that escape the kit root (no path traversal)', () => {
  const KIT = path.resolve(__dirname, '..', '..');
  assert.throws(() => resolvePhaseScript('../../etc/passwd', { kitRoot: KIT }), /traversal|escape/i);
});

test('resolvePhaseScript returns the computed path even if the file does not exist (callers check existsSync)', () => {
  const KIT = path.resolve(__dirname, '..', '..');
  const p = resolvePhaseScript('wize-sec-no-such-skill', { kitRoot: KIT });
  assert.ok(p, 'should return a path string');
  assert.ok(p.includes('wize-sec-no-such-skill'));
});

// --- invokePhase: behavior with a real, tiny script -----------------------

function mkSkillDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-invoke-'));
  const skillDir = path.join(dir, 'src', 'security-overlay', 'skills', 'wize-sec-tiny');
  fs.mkdirSync(path.join(skillDir, 'scripts'), { recursive: true });
  const script = path.join(skillDir, 'scripts', 'run-tiny.js');
  fs.writeFileSync(script, 'console.log("ok"); process.exit(0);');
  return { root: dir, script };
}

test('invokePhase runs a real script via node and returns {ok:true, code:0}', async () => {
  const { root } = mkSkillDir();
  const r = await invokePhase('wize-sec-tiny', { kitRoot: root });
  assert.equal(r.ok, true);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /ok/);
});

test('invokePhase captures non-zero exit and returns {ok:false} WITHOUT throwing', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-invoke-fail-'));
  const skillDir = path.join(dir, 'src', 'security-overlay', 'skills', 'wize-sec-fail');
  fs.mkdirSync(path.join(skillDir, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'scripts', 'run-fail.js'), 'process.exit(2);');
  const r = await invokePhase('wize-sec-fail', { kitRoot: dir });
  assert.equal(r.ok, false);
  assert.equal(r.code, 2);
});

test('invokePhase adds --active to the subprocess argv when active=true', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-invoke-active-'));
  const skillDir = path.join(dir, 'src', 'security-overlay', 'skills', 'wize-sec-arg');
  fs.mkdirSync(path.join(skillDir, 'scripts'), { recursive: true });
  // Script prints its argv as JSON; we then assert --active is present.
  fs.writeFileSync(path.join(skillDir, 'scripts', 'run-arg.js'),
    'process.stdout.write(JSON.stringify(process.argv.slice(2)));');
  const r = await invokePhase('wize-sec-arg', { kitRoot: dir, active: true });
  assert.equal(r.ok, true);
  const argv = JSON.parse(r.stdout);
  assert.ok(argv.includes('--active'), 'argv should contain --active');
});

test('invokePhase returns {ok:false} when the skill script does not exist (caller can skip)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-invoke-miss-'));
  const r = await invokePhase('wize-sec-not-there', { kitRoot: dir });
  assert.equal(r.ok, false);
  assert.match(r.error || '', /not found|missing|script/i);
});

// --- canary: invokePhase must not use shell: true -------------------------

test('canary: invoke-phase.js does not enable shell:true (no command-injection escape)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'security-overlay', '_shared', 'invoke-phase.js'),
    'utf8'
  );
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(stripped, /shell:\s*true/);
  // Ensure the spawn options object is present so future changes are obvious.
  assert.match(stripped, /spawn\(/);
});