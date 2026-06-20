'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..', '..');
const AGENT_DIR = path.join(KIT, 'src', 'security-overlay', 'agents', 'red-teamer');
const AGENT_YAML = path.join(AGENT_DIR, 'agent.yaml');
const PERSONA_MD = path.join(AGENT_DIR, 'persona.md');

test('red-teamer agent.yaml exists (AC-E03-1)', () => {
  assert.ok(fs.existsSync(AGENT_YAML), `expected ${AGENT_YAML}`);
});

test('red-teamer agent.yaml declares name, overlay, and commands pointing to wize-sec-pentest', () => {
  const src = fs.readFileSync(AGENT_YAML, 'utf8');
  // name field — the persona's name
  assert.match(src, /^name:\s+red-teamer/m, 'agent.yaml must declare name: red-teamer');
  // overlay field — marks this agent as belonging to the security overlay
  assert.match(src, /^overlay:\s+security/m, 'agent.yaml must declare overlay: security');
  // commands must point to wize-sec-pentest (the orchestrator skill)
  assert.match(src, /wize-sec-pentest/, 'agent.yaml must reference wize-sec-pentest in commands/skills');
});

test('red-teamer agent.yaml is found by walkAgents (kit-level integration)', () => {
  const { walkAgents } = require(path.join(KIT, 'tools/installer/validators/walk.js'));
  const agents = [...walkAgents(KIT)].map(p => path.relative(KIT, p));
  assert.ok(agents.some(p => p.includes('security-overlay/agents/red-teamer/agent.yaml')),
    `walkAgents did not pick up ${AGENT_YAML}; found: ${agents.filter(a => a.includes('red-teamer'))}`);
});

test('red-teamer agent.yaml passes the kit validator (npm run validate green)', () => {
  const { spawnSync } = require('node:child_process');
  const r = spawnSync('npm', ['run', 'validate'], { cwd: KIT, encoding: 'utf8', timeout: 60_000 });
  assert.equal(r.status, 0, `validate exited ${r.status}\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
  assert.match(r.stdout, /All structural checks passed/);
});

test('red-teamer persona.md exists and mentions scope + autorizado (AC-E03-1 + brief keywords)', () => {
  assert.ok(fs.existsSync(PERSONA_MD), `expected ${PERSONA_MD}`);
  const src = fs.readFileSync(PERSONA_MD, 'utf8');
  assert.match(src, /scope/i, 'persona.md must mention scope (gate language)');
  assert.match(src, /autorizado|authorized/i, 'persona.md must mention authorized/autorizado (brief constraint)');
});

test('red-teamer persona.md includes a Hand-off to TEA section (AC-E03-4)', () => {
  const src = fs.readFileSync(PERSONA_MD, 'utf8');
  assert.match(src, /Hand-off to TEA/i, 'persona.md must have a Hand-off to TEA section');
});
