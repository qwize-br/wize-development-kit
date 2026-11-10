// `openbot export` and `openbot sync`: team model, manifest limits, the import
// zip end to end, and in-place sync on fake agent workspaces.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const KIT = path.resolve(__dirname, '..');
const CLI = path.join(KIT, 'tools/installer/wize-cli.js');
const VERSION = require(path.join(KIT, 'package.json')).version;
const team = require(path.join(KIT, 'tools/installer/openbot-team.js'));
const { cmdOpenbotExport, cmdOpenbotSync } = require(path.join(KIT, 'tools/installer/commands/openbot.js'));
const shared = require(path.join(KIT, 'tools/installer/render-shared.js'));

const tmp = (p = 'wize-ob-') => fs.mkdtempSync(path.join(os.tmpdir(), p));
const rm = (d) => fs.rmSync(d, { recursive: true, force: true });
const quiet = () => ({ log() {}, warn() {} });
const NO_CLI = { ...process.env, OPENBOT_CLI: '/nonexistent/openbot-cli' };

function readZipEntries(file) {
  const buf = fs.readFileSync(file);
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let i = 0; i < total; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nlen).toString('utf-8');
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const raw = buf.slice(start, start + csize);
    out.set(name, method === 8 ? zlib.inflateRawSync(raw) : raw);
    p += 46 + nlen;
  }
  return out;
}

function exportTo(flags = {}, opts = {}) {
  const out = tmp('wize-ob-out-');
  const lines = [];
  const r = cmdOpenbotExport({
    kitRoot: KIT, projectRoot: null, flags: { out, ...flags },
    opts: { log: (s) => lines.push(s), warn: (s) => lines.push(`ERR ${s}`), ...opts }
  });
  return { r, out, lines, zip: r.path };
}

// ---- team model --------------------------------------------------------------

test('readYamlList reads block lists with comments and quotes', () => {
  const y = 'a: 1\nskills:\n  - one   # note\n  - "two words"\n  - \'three\'\n\nnext: x\n  - not-mine\n';
  assert.deepStrictEqual(team.readYamlList(y, 'skills'), ['one', 'two words', 'three']);
  assert.deepStrictEqual(team.readYamlList(y, 'missing'), []);
});

test('safeTruncate never splits a surrogate pair and respects the limit', () => {
  const s = 'ab ' + '😀'.repeat(30);
  for (let max = 5; max < 40; max++) {
    const t = team.safeTruncate(s, max);
    assert.ok(t.length <= max, `max ${max}`);
    assert.ok(!/[\uD800-\uDBFF]$/.test(t.replace(/…$/, '')), `lone surrogate at ${max}`);
  }
  assert.strictEqual(team.safeTruncate('short', 50), 'short');
});

test('profiles: required modules are always on, unknown names are reported', () => {
  assert.deepStrictEqual(team.normalizeProfiles(['security-overlay']).profiles, ['core', 'security-overlay']);
  assert.deepStrictEqual(team.normalizeProfiles(['core', 'method', 'tea']).profiles, ['core', 'method', 'tea']);
  assert.deepStrictEqual(team.normalizeProfiles(['core', 'nope']).unknown, ['nope']);
});

test('buildTeam: nine agents by default, Natasha only with the security overlay', () => {
  const base = team.buildTeam(KIT, { profiles: ['core', 'method', 'tea'] });
  assert.strictEqual(base.personas.length, 9);
  assert.ok(!base.personas.some(p => p.key === 'red-teamer'));
  assert.deepStrictEqual(base.inactive.map(p => p.key), ['red-teamer']);
  const sec = team.buildTeam(KIT, { profiles: ['core', 'security-overlay'] });
  assert.strictEqual(sec.personas.length, 10);
  const nat = sec.personas.find(p => p.key === 'red-teamer');
  assert.strictEqual(nat.name, 'Natasha Romanoff');
  assert.ok(nat.skills.includes('wize-sec-pentest') && nat.skills.includes('wize-sec-recon'));
  assert.ok(sec.personas[0].key === 'orchestrator');
});

test('buildTeam: keys, own skills first, transversal set, no duplicates, Wizer routing set', () => {
  const t = team.buildTeam(KIT, { profiles: ['core'] });
  const dev = t.personas.find(p => p.key === 'dev');
  assert.strictEqual(dev.name, 'Shuri');
  assert.strictEqual(dev.skills[0], 'wize-agent-dev');
  for (const s of ['wize-dev-story', 'wize-quick-dev', 'wize-grill', 'wize-no-ai-slop', 'wize-subtract', 'wize-help']) {
    assert.ok(dev.skills.includes(s), s);
  }
  assert.ok(dev.skills.indexOf('wize-dev-story') < dev.skills.indexOf('wize-grill'), 'own before transversal');
  const wiz = t.personas.find(p => p.key === 'orchestrator');
  for (const s of ['wize-help', 'wize-orchestrator', 'wize-party-mode', 'wize-check']) assert.ok(wiz.skills.includes(s), s);
  for (const p of t.personas) {
    assert.strictEqual(new Set(p.skills).size, p.skills.length, `${p.key}: duplicates`);
    assert.ok(p.skills.length <= 32);
    assert.ok(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(p.key));
  }
});

test('buildTeam: cap keeps own skills first and logs every drop', () => {
  const t = team.buildTeam(KIT, { profiles: ['core'], cap: 5 });
  const dev = t.personas.find(p => p.key === 'dev');
  assert.strictEqual(dev.skills.length, 5);
  assert.strictEqual(dev.skills[0], 'wize-agent-dev');
  const capped = dev.dropped.filter(d => /5-skill cap/.test(d.reason));
  assert.ok(capped.length > 0);
  assert.ok(capped.some(d => d.code === 'wize-grill'), 'transversal skills drop before own ones');
  assert.ok(!dev.skills.includes('wize-grill'));
});

test('buildTeam: a skill the profiles do not enable is reported, not silent', () => {
  const sec = team.buildTeam(KIT, { profiles: ['core'] });
  const wiz = sec.personas.find(p => p.key === 'orchestrator');
  assert.ok(!wiz.skills.includes('wize-web-landing-page'));
  const web = team.buildTeam(KIT, { profiles: ['core', 'web-overlay'] });
  const mantis = web.personas.find(p => p.key === 'ux-designer');
  assert.ok(mantis.skills.includes('wize-web-landing-page'));
});

test('description is at most 2000 characters, keeps the rules and the SOUL pointer', () => {
  const t = team.textsFor('en');
  const p = { name: 'Zed', title: 'Long Persona', summary: 'word '.repeat(3000) };
  const d = team.descriptionOf(p, t);
  assert.ok(d.length <= 2000, String(d.length));
  assert.ok(d.endsWith(t.readSoul));
  for (const r of t.rules) assert.ok(d.includes(r));
  for (const x of team.buildTeam(KIT, { profiles: ['core'] }).personas) {
    assert.ok(x.description.length <= 2000);
    assert.ok(x.memories.length <= 64 && x.memories.every(m => m.length <= 500));
  }
});

test('memories carry the roster with keys, the handoff chain, target-repo rule and openbot-cli', () => {
  const t = team.buildTeam(KIT, { profiles: ['core'] });
  const mem = t.personas[0].memories.join('\n');
  assert.match(mem, /dev: Shuri/);
  assert.match(mem, /Pepper Potts → Maria Hill → Mantis\/Nick Fury → Tony Stark → Hawkeye \(risco\) → Shuri → Hawkeye \(trace, review e gate\) → Maria Hill \(status\)/);
  assert.match(mem, /\.wize\//);
  assert.match(mem, /pergunte qual é o repositório alvo/);
  assert.match(mem, /openbot-cli run <agente> - --wait/);
  const en = team.buildTeam(KIT, { profiles: ['core'], lang: 'en' }).personas[0].memories.join('\n');
  assert.match(en, /ask which repository is the target/);
  assert.match(en, /openbot-cli run <agent> - --wait/);
});

// ---- manifest limits -----------------------------------------------------------

function miniTree() {
  const root = tmp('wize-ob-tree-');
  const sk = path.join(root, 'agents/dev/skills/s1');
  fs.mkdirSync(sk, { recursive: true });
  fs.writeFileSync(path.join(sk, 'SKILL.md'), '---\nname: s1\ndescription: "d"\n---\n\n# s1\n');
  fs.mkdirSync(path.join(root, 'agents/dev/files'), { recursive: true });
  fs.writeFileSync(path.join(root, 'agents/dev/files/SOUL.md'), 'soul');
  const m = {
    format: 'openbot-agent-import', version: 1, source: { app: 'wize-dev-kit', appVersion: '1', exportedAt: 'x' },
    agents: [{ key: 'dev', name: 'Dev', title: 'T', description: 'd', avatar: null, skills: ['agents/dev/skills/s1'], routines: [], memories: ['m'], files: 'agents/dev/files' }]
  };
  return { root, m };
}
const clone = (o) => JSON.parse(JSON.stringify(o));

test('validateManifest accepts a valid tree', () => {
  const { root, m } = miniTree();
  assert.deepStrictEqual(team.validateManifest(m, root), []);
  rm(root);
});

test('validateManifest rejects every limit violation', () => {
  const { root, m } = miniTree();
  const cases = [
    [(x) => { x.agents[0].key = 'Bad_Key'; }, /key must be/],
    [(x) => { x.agents[0].key = '-dev'; }, /key must be/],
    [(x) => { x.agents[0].key = 'a'.repeat(65); }, /key must be/],
    [(x) => { x.agents.push(clone(x.agents[0])); }, /duplicate key/],
    [(x) => { x.agents[0].name = 'n'.repeat(81); }, /name must be/],
    [(x) => { x.agents[0].name = ''; }, /name must be/],
    [(x) => { x.agents[0].title = 't'.repeat(121); }, /title is over/],
    [(x) => { x.agents[0].description = 'd'.repeat(2001); }, /description must be/],
    [(x) => { x.agents[0].memories = Array(65).fill('m'); }, /memories must be/],
    [(x) => { x.agents[0].memories = ['m'.repeat(501)]; }, /memory 1 must be/],
    [(x) => { x.agents[0].routines = Array(65).fill({}); }, /routines must be/],
    [(x) => { x.agents[0].skills = Array(33).fill('agents/dev/skills/s1'); }, /skills must be/],
    [(x) => { x.agents[0].skills = ['agents/other/skills/s1']; }, /must be agents\/dev\/skills/],
    [(x) => { x.agents[0].skills = ['agents/dev/skills/missing']; }, /no SKILL\.md/],
    [(x) => { x.agents[0].avatar = 'a.png'; }, /avatar must be null/],
    [(x) => { x.agents[0].files = 'agents/dev/elsewhere'; }, /files must be/],
    [(x) => { x.version = 2; }, /version must be 1/],
    [(x) => { x.format = 'other'; }, /format must be/],
    [(x) => { x.source.app = ''; }, /source\.app/],
    [(x) => { x.agents = []; }, /non-empty/]
  ];
  for (const [mutate, re] of cases) {
    const x = clone(m);
    mutate(x);
    const errs = team.validateManifest(x, root);
    assert.ok(errs.some(e => re.test(e)), `${re}: got ${JSON.stringify(errs)}`);
  }
  rm(root);
});

test('validateManifest checks skill frontmatter, size, file count and forbidden files', () => {
  const { root, m } = miniTree();
  const sk = path.join(root, 'agents/dev/skills/s1');
  fs.writeFileSync(path.join(sk, 'SKILL.md'), '# no frontmatter\n');
  assert.ok(team.validateManifest(m, root).some(e => /frontmatter name/.test(e)));
  fs.writeFileSync(path.join(sk, 'SKILL.md'), `---\nname: ${'n'.repeat(81)}\ndescription: "d"\n---\n`);
  assert.ok(team.validateManifest(m, root).some(e => /frontmatter name/.test(e)));
  fs.writeFileSync(path.join(sk, 'SKILL.md'), '---\nname: s1\ndescription: "d"\n---\n');
  for (let i = 0; i < 200; i++) fs.writeFileSync(path.join(sk, `f${i}.md`), 'x');
  assert.ok(team.validateManifest(m, root).some(e => /has 201 files/.test(e)));
  for (let i = 0; i < 200; i++) fs.rmSync(path.join(sk, `f${i}.md`));
  fs.writeFileSync(path.join(sk, 'big.bin'), Buffer.alloc(10 * 1024 * 1024 + 1));
  assert.ok(team.validateManifest(m, root).some(e => /bytes; the limit/.test(e)));
  fs.rmSync(path.join(sk, 'big.bin'));
  for (const [rel, re] of [
    ['.env.local', /forbidden file name/], ['my-private-key.pem', /forbidden file name/],
    ['bundle.zip', /nested archive/], ['node_modules/x/index.js', /forbidden folder/], ['.git/config', /forbidden folder/]
  ]) {
    const f = path.join(sk, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, 'x');
    assert.ok(team.validateManifest(m, root).some(e => re.test(e)), rel);
    rm(path.join(sk, rel.split('/')[0]));
  }
  assert.deepStrictEqual(team.validateManifest(m, root), []);
  rm(root);
});

// ---- export end to end -----------------------------------------------------------

test('export (default profiles): importable zip, nine agents, no Natasha, no leftovers', () => {
  const { r, out, zip, lines } = exportTo();
  assert.strictEqual(r.exitCode, 0, lines.join('\n'));
  assert.match(path.basename(zip), /^wize-dev-kit-openbot-\d{4}-\d{2}-\d{2}\.zip$/);
  assert.deepStrictEqual(fs.readdirSync(out), [path.basename(zip)], 'no .part file left');
  const z = readZipEntries(zip);
  const manifest = JSON.parse(z.get('openbot-import.json').toString());
  assert.strictEqual(manifest.format, 'openbot-agent-import');
  assert.strictEqual(manifest.version, 1);
  assert.strictEqual(manifest.source.app, 'wize-dev-kit');
  assert.strictEqual(manifest.source.appVersion, VERSION);
  assert.match(manifest.source.exportedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.strictEqual(manifest.agents.length, 9);
  assert.ok(!manifest.agents.some(a => a.key === 'red-teamer'));
  for (const a of manifest.agents) {
    assert.strictEqual(a.avatar, null);
    assert.strictEqual(a.files, `agents/${a.key}/files`);
    assert.ok(z.has(`agents/${a.key}/files/SOUL.md`), `${a.key} SOUL.md`);
    assert.ok(a.skills.length >= 1 && a.skills.length <= 32);
    for (const sp of a.skills) {
      const md = z.get(`${sp}/SKILL.md`).toString();
      assert.match(md, /^---\nname: wize[\w-]*\ndescription: "/);
    }
    assert.ok(a.description.length <= 2000);
  }
  assert.ok(![...z.keys()].some(n => n.startsWith('/') || n.includes('..')));
  fs.writeFileSync(path.join(out, 'x'), '');
  const unzip = spawnSync('unzip', ['-t', zip], { encoding: 'utf-8' });
  if (!unzip.error) assert.strictEqual(unzip.status, 0, unzip.stdout);
  rm(out);
});

test('export: skill folders match the Anthropic emitter, companion files included', () => {
  const pool = tmp('wize-ob-pool-');
  shared.renderAnthropicSkills(KIT, pool, { profiles: ['core', 'security-overlay'] });
  const { zip, out } = exportTo();
  const z = readZipEntries(zip);
  const expected = fs.readFileSync(path.join(pool, 'wize-agent-dev/SKILL.md'));
  assert.ok(z.get('agents/dev/skills/wize-agent-dev/SKILL.md').equals(expected));
  const withCompanions = team.listFiles(path.join(pool, 'wize-sec-pentest')).filter(f => f !== 'SKILL.md');
  assert.ok(withCompanions.length > 0, 'wize-sec-pentest ships companion files');
  const sec = exportTo({ profiles: 'core,security-overlay' });
  const zs = readZipEntries(sec.zip);
  for (const f of withCompanions) assert.ok(zs.has(`agents/red-teamer/skills/wize-sec-pentest/${f}`), f);
  rm(sec.out);
  rm(pool); rm(out);
});

test('export: security overlay adds Natasha with her pipeline skills', () => {
  const { r, zip, out } = exportTo({ profiles: 'core,security-overlay' });
  assert.strictEqual(r.exitCode, 0);
  const manifest = JSON.parse(readZipEntries(zip).get('openbot-import.json').toString());
  const nat = manifest.agents.find(a => a.key === 'red-teamer');
  assert.ok(nat);
  assert.ok(nat.skills.includes('agents/red-teamer/skills/wize-sec-pentest'));
  assert.match(nat.memories.join('\n'), /scope\.md/);
  rm(out);
});

test('export: all overlays stay inside every OpenBot limit', () => {
  const { r, zip, out, lines } = exportTo({ profiles: 'core,web-overlay,app-overlay,security-overlay' });
  assert.strictEqual(r.exitCode, 0, lines.join('\n'));
  const manifest = JSON.parse(readZipEntries(zip).get('openbot-import.json').toString());
  assert.strictEqual(manifest.agents.length, 10);
  rm(out);
});

test('export: SOUL.md is the full persona and the description points to it', () => {
  const { zip, out } = exportTo();
  const z = readZipEntries(zip);
  const manifest = JSON.parse(z.get('openbot-import.json').toString());
  const persona = fs.readFileSync(path.join(KIT, 'src/method-skills/4-implementation/wize-agent-dev/persona.md'), 'utf-8').trim();
  const soul = z.get('agents/dev/files/SOUL.md').toString();
  assert.ok(soul.startsWith(persona));
  assert.match(soul, /## Regras de trabalho/);
  const dev = manifest.agents.find(a => a.key === 'dev');
  assert.match(dev.description, /Leia imported\/SOUL\.md antes da primeira tarefa\.$/);
  rm(out);
});

test('export --json prints exactly one object with the documented shape', () => {
  const lines = [];
  const out = tmp('wize-ob-out-');
  const r = cmdOpenbotExport({ kitRoot: KIT, projectRoot: null, flags: { out, json: true, profiles: 'core' }, opts: { log: (s) => lines.push(s), warn: (s) => lines.push(`ERR ${s}`) } });
  assert.strictEqual(lines.length, 1);
  const o = JSON.parse(lines[0]);
  assert.strictEqual(o.ok, true);
  assert.strictEqual(o.path, r.path);
  assert.strictEqual(o.version, VERSION);
  assert.deepStrictEqual(o.profiles, ['core']);
  assert.strictEqual(o.lang, 'pt-BR');
  assert.ok(Array.isArray(o.agents) && o.agents.length === 9);
  assert.deepStrictEqual(Object.keys(o.agents[0]).sort(), ['dropped', 'key', 'memories', 'name', 'skills', 'title']);
  assert.ok(Array.isArray(o.dropped));
  assert.match(o.import, /Server settings/);
  rm(out);
});

test('export: project.toml supplies profiles and language, flags override them', () => {
  const root = tmp('wize-ob-proj-');
  fs.mkdirSync(path.join(root, '.wize/config'), { recursive: true });
  fs.writeFileSync(path.join(root, '.wize/config/project.toml'), '[project]\nname = "x"\n\n[install]\nprofiles = ["core", "security-overlay"]\nide_targets = ["generic"]\n\n[language]\ncommunication = "en"\n');
  const run = (flags) => {
    const out = tmp('wize-ob-out-');
    const r = cmdOpenbotExport({ kitRoot: KIT, projectRoot: root, flags: { out, ...flags }, opts: quiet() });
    const m = JSON.parse(readZipEntries(r.path).get('openbot-import.json').toString());
    rm(out);
    return m;
  };
  const fromToml = run({});
  assert.ok(fromToml.agents.some(a => a.key === 'red-teamer'));
  assert.match(fromToml.agents[0].description, /Work rules/);
  const flagged = run({ profiles: 'core', lang: 'pt-BR' });
  assert.ok(!flagged.agents.some(a => a.key === 'red-teamer'));
  assert.match(flagged.agents[0].description, /Regras de trabalho/);
  rm(root);
});

test('export: an unknown profile exits 1 and writes nothing', () => {
  const out = tmp('wize-ob-out-');
  const lines = [];
  const r = cmdOpenbotExport({ kitRoot: KIT, projectRoot: null, flags: { out, profiles: 'core,securty-overlay' }, opts: { log: (s) => lines.push(s), warn: (s) => lines.push(s) } });
  assert.strictEqual(r.exitCode, 1);
  assert.match(lines.join('\n'), /unknown profile/);
  assert.deepStrictEqual(fs.readdirSync(out), []);
  rm(out);
});

test('export: a manifest violation exits 1, names it and leaves no zip', () => {
  const kit = tmp('wize-ob-kit-');
  fs.cpSync(path.join(KIT, 'src'), path.join(kit, 'src'), { recursive: true });
  fs.copyFileSync(path.join(KIT, 'package.json'), path.join(kit, 'package.json'));
  const codes = shared.collectAssets(kit, { profiles: ['core'] }).filter(a => a.kind !== 'agent').map(a => a.code).slice(0, 40);
  const yaml = path.join(kit, 'src/method-skills/4-implementation/wize-agent-dev/agent.yaml');
  const text = fs.readFileSync(yaml, 'utf-8').replace(/\nskills:\n(  - .*\n)+/, `\nskills:\n${codes.map(c => `  - ${c}\n`).join('')}`);
  fs.writeFileSync(yaml, text);
  const out = tmp('wize-ob-out-');
  const lines = [];
  const r = cmdOpenbotExport({ kitRoot: kit, projectRoot: null, flags: { out, profiles: 'core' }, opts: { cap: 40, log: (s) => lines.push(s), warn: (s) => lines.push(s) } });
  assert.strictEqual(r.exitCode, 1);
  assert.match(lines.join('\n'), /skills must be an array of at most 32/);
  assert.deepStrictEqual(fs.readdirSync(out), []);
  const json = [];
  const j = cmdOpenbotExport({ kitRoot: kit, projectRoot: null, flags: { out, profiles: 'core', json: true }, opts: { cap: 40, log: (s) => json.push(s), warn() {} } });
  assert.strictEqual(j.exitCode, 1);
  assert.strictEqual(JSON.parse(json[0]).ok, false);
  rm(out); rm(kit);
});

test('export: cap drops are printed and returned, never silent', () => {
  const lines = [];
  const out = tmp('wize-ob-out-');
  const r = cmdOpenbotExport({ kitRoot: KIT, projectRoot: null, flags: { out, profiles: 'core' }, opts: { cap: 6, log: (s) => lines.push(s), warn: (s) => lines.push(s) } });
  assert.strictEqual(r.exitCode, 0);
  assert.ok(r.dropped.length > 0);
  assert.match(lines.join('\n'), /dropped skills:/);
  assert.match(lines.join('\n'), /over the 6-skill cap/);
  rm(out);
});

// ---- sync ------------------------------------------------------------------

function makeEnv(names = { dev: 'Shuri' }) {
  const root = tmp('wize-ob-sync-');
  const agentsDir = path.join(root, 'Agents');
  const ids = {};
  for (const [key, name] of Object.entries(names)) {
    const id = `agent-${key}`;
    ids[key] = id;
    fs.mkdirSync(path.join(agentsDir, id), { recursive: true });
    fs.writeFileSync(path.join(agentsDir, id, 'AGENTS.md'), `# ${name} — Persona de teste\n\nTexto do usuário.\n`);
  }
  return { root, agentsDir, ids, teamFile: path.join(root, 'Shared', 'team.json') };
}

function sync(env, flags = {}, opts = {}) {
  const lines = [];
  const r = cmdOpenbotSync({
    kitRoot: KIT, projectRoot: null,
    flags: { team: env.teamFile, 'agents-dir': env.agentsDir, profiles: 'core', ...flags },
    opts: { log: (s) => lines.push(s), warn: (s) => lines.push(s), env: NO_CLI, ...opts }
  });
  return { r, lines };
}

function snapshot(dir) {
  const out = {};
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = e.isSymbolicLink() ? 'link' : crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
    }
  })(dir);
  return out;
}

const devSkills = () => team.buildTeam(KIT, { profiles: ['core'] }).personas.find(p => p.key === 'dev').skills;

test('sync builds team.json from AGENTS.md headings, then writes skills and the block', () => {
  const env = makeEnv({ dev: 'Shuri', pm: 'Maria Hill' });
  const { r } = sync(env);
  assert.strictEqual(r.exitCode, 0);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(env.teamFile, 'utf-8')), { version: 1, agents: { pm: 'agent-pm', dev: 'agent-dev' } });
  assert.deepStrictEqual(fs.readdirSync(path.dirname(env.teamFile)), ['team.json'], 'only team.json is written there');
  const ws = path.join(env.agentsDir, 'agent-dev');
  for (const root of ['.agents/skills', '.claude/skills']) {
    for (const code of devSkills()) {
      const dir = path.join(ws, root, code);
      assert.ok(fs.existsSync(path.join(dir, 'SKILL.md')), `${root}/${code}`);
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, '.wize-managed.json'), 'utf-8')), { managedBy: 'wize-dev-kit', version: VERSION });
    }
  }
  const md = fs.readFileSync(path.join(ws, 'AGENTS.md'), 'utf-8');
  assert.ok(md.startsWith('# Shuri — Persona de teste\n\nTexto do usuário.\n'), 'user text first and untouched');
  assert.strictEqual(md.split('<!-- wize-dev-kit:begin -->').length, 2);
  assert.match(md, /<!-- wize-dev-kit:end -->\n$/);
  assert.match(md, /Você é \*\*Shuri\*\*/);
  rm(env.root);
});

test('sync is idempotent: a second run writes nothing and keeps mtimes', () => {
  const env = makeEnv();
  sync(env);
  const ws = path.join(env.agentsDir, 'agent-dev');
  const before = snapshot(ws);
  const mtime = fs.statSync(path.join(ws, 'AGENTS.md')).mtimeMs;
  const skillMtime = fs.statSync(path.join(ws, '.agents/skills/wize-agent-dev/SKILL.md')).mtimeMs;
  const { r } = sync(env);
  assert.deepStrictEqual(snapshot(ws), before);
  assert.strictEqual(fs.statSync(path.join(ws, 'AGENTS.md')).mtimeMs, mtime);
  assert.strictEqual(fs.statSync(path.join(ws, '.agents/skills/wize-agent-dev/SKILL.md')).mtimeMs, skillMtime);
  const dev = r.agents.find(a => a.key === 'dev');
  assert.strictEqual(dev.skills.written, 0);
  assert.strictEqual(dev.agentsMd, 'unchanged');
  rm(env.root);
});

test('sync marker semantics: OpenBot-owned and unmarked folders are never touched', () => {
  const env = makeEnv();
  const ws = path.join(env.agentsDir, 'agent-dev');
  const mk = (rel, files) => {
    for (const [f, c] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(ws, rel, f)), { recursive: true });
      fs.writeFileSync(path.join(ws, rel, f), c);
    }
  };
  for (const root of ['.agents/skills', '.claude/skills']) {
    mk(`${root}/wize-grill`, { 'SKILL.md': 'openbot owned', '.openbot-managed.json': '{"managedBy":"openbot"}' });
    mk(`${root}/wize-agent-dev`, { 'SKILL.md': 'hand install' });
    mk(`${root}/my-own-skill`, { 'SKILL.md': 'mine' });
    mk(`${root}/wize-web-landing-page`, { 'SKILL.md': '---\nname: wize-web-landing-page\ndescription: "x"\n---\n', '.wize-managed.json': '{"managedBy":"wize-dev-kit","version":"0.1.0"}' });
    mk(`${root}/wize-unmarked-stale`, { 'SKILL.md': 'hand' });
    mk(`${root}/wize-agent-dev-ignored`, { 'SKILL.md': 'x' });
  }
  const { r } = sync(env);
  for (const root of ['.agents/skills', '.claude/skills']) {
    assert.strictEqual(fs.readFileSync(path.join(ws, root, 'wize-grill/SKILL.md'), 'utf-8'), 'openbot owned');
    assert.ok(!fs.existsSync(path.join(ws, root, 'wize-grill/.wize-managed.json')));
    assert.strictEqual(fs.readFileSync(path.join(ws, root, 'wize-agent-dev/SKILL.md'), 'utf-8'), 'hand install');
    assert.ok(!fs.existsSync(path.join(ws, root, 'wize-agent-dev/.wize-managed.json')));
    assert.strictEqual(fs.readFileSync(path.join(ws, root, 'my-own-skill/SKILL.md'), 'utf-8'), 'mine');
    assert.ok(!fs.existsSync(path.join(ws, root, 'wize-web-landing-page')), 'stale kit-managed folder removed');
    assert.ok(fs.existsSync(path.join(ws, root, 'wize-unmarked-stale/SKILL.md')), 'unmarked stale folder kept');
  }
  assert.ok(r.warnings.some(w => /wize-agent-dev: exists without the kit marker/.test(w)));
  const dev = r.agents.find(a => a.key === 'dev');
  assert.ok(dev.skills.skipped.some(s => s.reason === 'OpenBot-managed'));
  assert.strictEqual(dev.skills.removed.length, 2);

  const again = sync(env, { adopt: true });
  for (const root of ['.agents/skills', '.claude/skills']) {
    assert.match(fs.readFileSync(path.join(ws, root, 'wize-agent-dev/SKILL.md'), 'utf-8'), /Shuri/);
    assert.ok(fs.existsSync(path.join(ws, root, 'wize-agent-dev/.wize-managed.json')));
    assert.strictEqual(fs.readFileSync(path.join(ws, root, 'wize-grill/SKILL.md'), 'utf-8'), 'openbot owned', '--adopt never takes OpenBot folders');
    assert.strictEqual(fs.readFileSync(path.join(ws, root, 'my-own-skill/SKILL.md'), 'utf-8'), 'mine');
  }
  assert.strictEqual(again.r.agents[0].skills.adopted.length, 2);
  rm(env.root);
});

test('sync refreshes a kit-managed skill and prunes files that left the source', () => {
  const env = makeEnv();
  sync(env);
  const dir = path.join(env.agentsDir, 'agent-dev/.claude/skills/wize-dev-story');
  fs.writeFileSync(path.join(dir, 'SKILL.md'), 'tampered');
  fs.writeFileSync(path.join(dir, 'leftover.md'), 'old companion');
  fs.mkdirSync(path.join(dir, 'gone'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'gone/x.md'), 'x');
  sync(env);
  assert.match(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf-8'), /^---\nname: wize-dev-story/);
  assert.ok(!fs.existsSync(path.join(dir, 'leftover.md')));
  assert.ok(!fs.existsSync(path.join(dir, 'gone')));
  rm(env.root);
});

test('AGENTS.md: user text is preserved, only the block is rewritten', () => {
  const env = makeEnv();
  const file = path.join(env.agentsDir, 'agent-dev/AGENTS.md');
  sync(env);
  const first = fs.readFileSync(file, 'utf-8');
  const edited = first.replace('Você é **Shuri**', 'TAMPERED').replace('Texto do usuário.', 'Texto do usuário.\n\nLinha nova do usuário.') + '\nRodapé do usuário\n';
  fs.writeFileSync(file, edited);
  sync(env);
  const after = fs.readFileSync(file, 'utf-8');
  assert.ok(after.includes('Linha nova do usuário.'));
  assert.ok(after.endsWith('<!-- wize-dev-kit:end -->\n\nRodapé do usuário\n'));
  assert.ok(!after.includes('TAMPERED'));
  assert.match(after, /Você é \*\*Shuri\*\*/);
  assert.strictEqual(after.split('wize-dev-kit:begin').length, 2);
  rm(env.root);
});

test('AGENTS.md: CRLF files keep CRLF; a half-written block is left alone', () => {
  const env = makeEnv();
  const file = path.join(env.agentsDir, 'agent-dev/AGENTS.md');
  fs.writeFileSync(file, '# Shuri — x\r\n\r\nTexto\r\n');
  sync(env);
  const md = fs.readFileSync(file, 'utf-8');
  assert.ok(!/[^\r]\n/.test(md), 'every newline is CRLF');
  assert.ok(md.startsWith('# Shuri — x\r\n\r\nTexto\r\n'));
  const broken = '# Shuri — x\n\nmeu texto\n<!-- wize-dev-kit:begin -->\nmeio escrito\n';
  fs.writeFileSync(file, broken);
  const { r } = sync(env);
  assert.strictEqual(fs.readFileSync(file, 'utf-8'), broken);
  assert.ok(r.warnings.some(w => /marker without its pair/.test(w)));
  rm(env.root);
});

test('AGENTS.md is created when absent, headed by the persona so team.json can find it later', () => {
  const env = makeEnv();
  fs.rmSync(path.join(env.agentsDir, 'agent-dev/AGENTS.md'));
  fs.mkdirSync(path.dirname(env.teamFile), { recursive: true });
  fs.writeFileSync(env.teamFile, JSON.stringify({ version: 1, agents: { dev: 'agent-dev' } }));
  const { r } = sync(env);
  assert.strictEqual(r.agents[0].agentsMd, 'created');
  const md = fs.readFileSync(path.join(env.agentsDir, 'agent-dev/AGENTS.md'), 'utf-8');
  assert.ok(md.startsWith('# Shuri — Senior Developer\n\n<!-- wize-dev-kit:begin -->'));
  rm(env.root);
});

test('sync refuses symlinks that leave the workspace', () => {
  const env = makeEnv();
  const ws = path.join(env.agentsDir, 'agent-dev');
  const outside = tmp('wize-ob-outside-');
  fs.mkdirSync(path.join(outside, 'skills'));
  fs.symlinkSync(outside, path.join(ws, '.claude'));
  const target = path.join(outside, 'agents.md');
  fs.writeFileSync(target, 'fora');
  fs.rmSync(path.join(ws, 'AGENTS.md'));
  fs.symlinkSync(target, path.join(ws, 'AGENTS.md'));
  fs.mkdirSync(path.dirname(env.teamFile), { recursive: true });
  fs.writeFileSync(env.teamFile, JSON.stringify({ version: 1, agents: { dev: 'agent-dev' } }));
  const { r } = sync(env);
  assert.deepStrictEqual(fs.readdirSync(path.join(outside, 'skills')), [], 'nothing written through the .claude link');
  assert.strictEqual(fs.readFileSync(target, 'utf-8'), 'fora', 'AGENTS.md link target untouched');
  assert.ok(r.warnings.some(w => /\.claude\/skills resolves outside the workspace/.test(w)));
  assert.ok(r.warnings.some(w => /AGENTS\.md resolves outside the workspace/.test(w)));
  assert.ok(fs.existsSync(path.join(ws, '.agents/skills/wize-agent-dev/SKILL.md')), 'the safe root is still synced');
  rm(env.root); rm(outside);
});

test('sync refuses a workspace that is itself a symlink', () => {
  const env = makeEnv();
  const real = tmp('wize-ob-real-');
  fs.writeFileSync(path.join(real, 'AGENTS.md'), '# Shuri — x\n');
  fs.rmSync(path.join(env.agentsDir, 'agent-dev'), { recursive: true });
  fs.symlinkSync(real, path.join(env.agentsDir, 'agent-dev'));
  fs.mkdirSync(path.dirname(env.teamFile), { recursive: true });
  fs.writeFileSync(env.teamFile, JSON.stringify({ version: 1, agents: { dev: 'agent-dev' } }));
  const { r } = sync(env);
  assert.deepStrictEqual(fs.readdirSync(real), ['AGENTS.md']);
  assert.ok(r.warnings.some(w => /symlink or not a folder/.test(w)));
  rm(env.root); rm(real);
});

test('sync --dry-run writes nothing, not even team.json', () => {
  const env = makeEnv({ dev: 'Shuri', pm: 'Maria Hill' });
  const before = snapshot(env.root);
  const { r, lines } = sync(env, { 'dry-run': true });
  assert.strictEqual(r.exitCode, 0);
  assert.deepStrictEqual(snapshot(env.root), before);
  assert.ok(!fs.existsSync(env.teamFile));
  assert.match(lines.join('\n'), /Dry run: nothing was written/);
  assert.ok(r.agents.find(a => a.key === 'dev').skills.written > 0, 'reports what would change');
  rm(env.root);
});

test('team.json auto-build: ambiguous and missing personas warn, skip, and --strict turns them into exit 1', () => {
  const env = makeEnv({ dev: 'Shuri' });
  fs.mkdirSync(path.join(env.agentsDir, 'agent-dev2'));
  fs.writeFileSync(path.join(env.agentsDir, 'agent-dev2/AGENTS.md'), '# Shuri — outra\n');
  const { r } = sync(env);
  assert.strictEqual(r.exitCode, 0);
  assert.ok(r.warnings.some(w => /dev \(Shuri\): ambiguous/.test(w)));
  assert.ok(!fs.existsSync(env.teamFile), 'no match, no team.json');
  assert.ok(!fs.existsSync(path.join(env.agentsDir, 'agent-dev/.agents')));
  const strict = sync(env, { strict: true });
  assert.strictEqual(strict.r.exitCode, 1);
  rm(env.root);
});

test('team.json auto-build prefers openbot-cli list --json and resolves by display name', () => {
  const env = makeEnv({ dev: 'Shuri', pm: 'Maria Hill' });
  const fake = path.join(env.root, 'fake-openbot-cli.js');
  fs.writeFileSync(fake, `console.log(JSON.stringify({ ok: true, exitCode: 0, agents: [{ id: 'agent-pm', name: 'maria hill' }, { id: 'agent-ghost', name: 'Shuri' }] }));`);
  const { r } = sync(env, {}, { env: { ...process.env, OPENBOT_CLI: fake } });
  const map = JSON.parse(fs.readFileSync(env.teamFile, 'utf-8')).agents;
  assert.strictEqual(map.pm, 'agent-pm', 'matched through the CLI (case-insensitive)');
  assert.strictEqual(map.dev, 'agent-dev', 'CLI id without a workspace falls back to the AGENTS.md match');
  assert.strictEqual(r.exitCode, 0);
  rm(env.root);
});

test('an existing team.json is used as is; paths and ids both work; bad files exit 1', () => {
  const env = makeEnv();
  const elsewhere = tmp('wize-ob-elsewhere-');
  fs.writeFileSync(path.join(elsewhere, 'AGENTS.md'), '# Qualquer coisa\n');
  fs.mkdirSync(path.dirname(env.teamFile), { recursive: true });
  fs.writeFileSync(env.teamFile, JSON.stringify({ version: 1, agents: { dev: 'agent-dev', pm: elsewhere, ghost: 'agent-x' } }));
  const refused = sync(env).r;
  assert.deepStrictEqual(refused.agents.map(a => a.key), ['dev'], 'a path outside the agents folder needs --allow-outside');
  assert.ok(refused.warnings.some(w => /pm \(Maria Hill\): .*outside the agents folder.*--allow-outside/.test(w)), JSON.stringify(refused.warnings));
  assert.ok(!fs.existsSync(path.join(elsewhere, '.agents')));
  const { r } = sync(env, { 'allow-outside': true });
  assert.deepStrictEqual(r.agents.map(a => a.key).sort(), ['dev', 'pm']);
  assert.ok(fs.existsSync(path.join(elsewhere, '.agents/skills/wize-agent-pm/SKILL.md')));
  fs.writeFileSync(env.teamFile, '{not json');
  assert.strictEqual(sync(env).r.exitCode, 1);
  fs.writeFileSync(env.teamFile, JSON.stringify({ version: 2, agents: {} }));
  assert.strictEqual(sync(env).r.exitCode, 1);
  rm(env.root); rm(elsewhere);
});

test('sync skips a mapped persona whose module is not active, and syncs it once enabled', () => {
  const env = makeEnv({ red: 'Natasha Romanoff' });
  fs.mkdirSync(path.dirname(env.teamFile), { recursive: true });
  fs.writeFileSync(env.teamFile, JSON.stringify({ version: 1, agents: { 'red-teamer': 'agent-red' } }));
  const ws = path.join(env.agentsDir, 'agent-red');
  const before = snapshot(ws);
  const { r } = sync(env);
  assert.deepStrictEqual(snapshot(ws), before);
  assert.ok(r.warnings.some(w => /security-overlay is not active/.test(w)));
  const on = sync(env, { profiles: 'core,security-overlay' });
  assert.strictEqual(on.r.agents.length, 1);
  assert.ok(fs.existsSync(path.join(ws, '.agents/skills/wize-sec-pentest/SKILL.md')));
  rm(env.root);
});

test('sync --json prints one object', () => {
  const env = makeEnv();
  const { r, lines } = sync(env, { json: true });
  assert.strictEqual(lines.length, 1);
  const o = JSON.parse(lines[0]);
  assert.strictEqual(o.ok, true);
  assert.strictEqual(o.dryRun, false);
  assert.strictEqual(o.teamBuilt, true);
  assert.ok(Array.isArray(o.agents) && Array.isArray(o.warnings));
  assert.strictEqual(o.exitCode, r.exitCode);
  rm(env.root);
});

// ---- CLI ---------------------------------------------------------------------

function cli(args, env = {}) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf-8', env: { ...process.env, WIZE_DISABLE_UPDATE_CHECK: '1', ...env } });
}

test('CLI help lists openbot with its sub-commands', () => {
  for (const args of [['help'], ['openbot', '--help']]) {
    const r = cli(args);
    assert.match(r.stdout, /openbot <export\|sync>/);
    assert.match(r.stdout, /export \[--profiles a,b\] \[--lang pt-BR\] \[--out <dir>\]/);
    assert.match(r.stdout, /--adopt/);
  }
});

test('CLI: openbot without a sub-command or with a bad one exits 1 with usage', () => {
  for (const args of [['openbot'], ['openbot', 'nope']]) {
    const r = cli(args);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /openbot export/);
  }
});

test('CLI: openbot export --json and sync --adopt parse their flags', () => {
  const out = tmp('wize-ob-out-');
  const r = cli(['openbot', 'export', '--out', out, '--profiles', 'core', '--json']);
  assert.strictEqual(r.status, 0, r.stderr);
  const o = JSON.parse(r.stdout);
  assert.ok(o.ok && fs.existsSync(o.path));
  const env = makeEnv();
  fs.mkdirSync(path.dirname(env.teamFile), { recursive: true });
  fs.writeFileSync(env.teamFile, JSON.stringify({ version: 1, agents: { dev: 'agent-dev' } }));
  fs.mkdirSync(path.join(env.agentsDir, 'agent-dev/.agents/skills/wize-agent-dev'), { recursive: true });
  fs.writeFileSync(path.join(env.agentsDir, 'agent-dev/.agents/skills/wize-agent-dev/SKILL.md'), 'hand');
  const s = cli(['openbot', 'sync', '--adopt', '--team', env.teamFile, '--agents-dir', env.agentsDir, '--profiles', 'core', '--json'], { OPENBOT_CLI: '/nonexistent' });
  assert.strictEqual(s.status, 0, s.stderr);
  assert.match(fs.readFileSync(path.join(env.agentsDir, 'agent-dev/.agents/skills/wize-agent-dev/SKILL.md'), 'utf-8'), /Shuri/);
  rm(out); rm(env.root);
});

test('CLI: --adopt=false is off, so a hand-installed skill is not replaced', () => {
  const env = makeEnv();
  fs.mkdirSync(path.dirname(env.teamFile), { recursive: true });
  fs.writeFileSync(env.teamFile, JSON.stringify({ version: 1, agents: { dev: 'agent-dev' } }));
  const skill = path.join(env.agentsDir, 'agent-dev/.agents/skills/wize-agent-dev/SKILL.md');
  fs.mkdirSync(path.dirname(skill), { recursive: true });
  fs.writeFileSync(skill, 'hand');
  const s = cli(['openbot', 'sync', '--adopt=false', '--team', env.teamFile, '--agents-dir', env.agentsDir, '--profiles', 'core', '--json'], { OPENBOT_CLI: '/nonexistent' });
  assert.strictEqual(s.status, 0, s.stderr);
  assert.strictEqual(fs.readFileSync(skill, 'utf-8'), 'hand');
  rm(env.root);
});

test('package keeps prompts as its only runtime dependency', () => {
  assert.deepStrictEqual(Object.keys(require(path.join(KIT, 'package.json')).dependencies), ['prompts']);
});

// ---- docs and routing ----------------------------------------------------------

const read = (rel) => fs.readFileSync(path.join(KIT, rel), 'utf-8');

test('OpenBot docs exist in en and pt-BR, cross-linked, and cover the same commands and limits', () => {
  const en = read('docs/harnesses/openbot.md');
  const pt = read('docs/harnesses/openbot.pt-BR.md');
  assert.match(en, /\[Português \(pt-BR\)\]\(openbot\.pt-BR\.md\)/);
  assert.match(pt, /\[English\]\(openbot\.md\)/);
  assert.ok(en.includes('](../../README.md)') && pt.includes('](../../README.pt-BR.md)'));
  for (const text of [en, pt]) {
    for (const needle of [
      'openbot export', 'wize-dev-kit@latest openbot sync', '--dry-run', '--adopt', '--strict', 'team.json',
      '.wize-managed.json', '.openbot-managed.json', 'wize-dev-kit:begin', 'wize-dev-kit:end', 'openbot-cli run', 'OPENBOT_CLI',
      'Server settings', 'SOUL.md', '2000', '32', '.agents/skills', '.claude/skills', 'security-overlay'
    ]) {
      assert.ok(text.includes(needle), `missing "${needle}"`);
    }
  }
});

test('READMEs list OpenBot as an agent app next to the harness table and in the command list', () => {
  const docs = { 'README.md': 'docs/harnesses/openbot.md', 'README.pt-BR.md': 'docs/harnesses/openbot.pt-BR.md', 'README.es.md': 'docs/harnesses/openbot.md' };
  for (const [f, doc] of Object.entries(docs)) {
    const text = read(f);
    assert.ok(text.includes(`](${doc})`), `${f} links ${doc}`);
    assert.ok(fs.existsSync(path.join(KIT, doc)));
    assert.match(text, /npx wize-dev-kit openbot export \[--profiles a,b\]/);
    assert.match(text, /npx wize-dev-kit openbot sync \[--dry-run\] \[--adopt\]/);
    assert.match(text, /All 12 IDE targets|Los 12 IDEs objetivo|Os 12 alvos de IDE/, `${f}: the IDE count stays 12`);
  }
});

test('CHANGELOG names both commands in the release that ships them', () => {
  const text = read('CHANGELOG.md');
  const start = text.search(/^## \[(Unreleased|0\.29\.0)\]/m);
  assert.ok(start >= 0, 'no Unreleased or 0.29.0 entry');
  const section = text.slice(start, text.indexOf('\n## [0.28.0]'));
  assert.ok(section.includes('`openbot export`') && section.includes('`openbot sync`'));
});

test('"openbot" routes to wize-update and the skill explains export and sync', () => {
  const help = read('src/orchestrator-skills/wize-help/skill.md');
  const row = help.split('\n').find(l => l.includes('"agentes no openbot"'));
  assert.ok(row && row.includes('`wize-update`'));
  const upd = read('src/orchestrator-skills/wize-update/skill.md');
  assert.match(upd, /openbot sync --dry-run/);
  assert.match(upd, /openbot export/);
});

test('OpenBot prose avoids the banned vocabulary', () => {
  const slop = read('src/core-skills/wize-no-ai-slop/skill.md');
  const line = slop.split('\n').find(l => l.startsWith('- **Banned:**'));
  const words = line.replace('- **Banned:**', '').replace(/\.$/, '').split(',').map(w => w.trim()).filter(w => /^[a-z]+$/.test(w) && w !== 'harness');
  const sources = [
    read('docs/harnesses/openbot.md'), read('docs/harnesses/openbot.pt-BR.md'),
    read('tools/installer/openbot-team.js'), read('tools/installer/commands/openbot.js'), read('tools/installer/openbot-sync.js')
  ];
  const changelog = read('CHANGELOG.md');
  sources.push(changelog.slice(changelog.indexOf('## [Unreleased]'), changelog.indexOf('\n## [0.28.0]')));
  for (const text of sources) {
    for (const w of words) assert.ok(!new RegExp(`\\b${w}\\b`, 'i').test(text), `banned word "${w}"`);
  }
});

// ---- fix round 1 -----------------------------------------------------------

const writeTeam = (env, agents, extra = {}) => {
  fs.mkdirSync(path.dirname(env.teamFile), { recursive: true });
  fs.writeFileSync(env.teamFile, JSON.stringify({ version: 1, ...extra, agents }));
};

test('sync never writes through a symlink inside a kit-managed skill folder', () => {
  const env = makeEnv();
  sync(env);
  const ws = path.join(env.agentsDir, 'agent-dev');
  const outside = tmp('wize-ob-outside-');
  const dir = path.join(ws, '.agents/skills/wize-code-review');
  assert.ok(fs.existsSync(path.join(dir, 'steps')), 'wize-code-review ships a steps/ folder');
  fs.rmSync(path.join(dir, 'steps'), { recursive: true });
  fs.symlinkSync(outside, path.join(dir, 'steps'));
  const { r } = sync(env);
  assert.deepStrictEqual(fs.readdirSync(outside), [], 'nothing written outside the workspace');
  assert.ok(r.warnings.some(w => /wize-code-review: contains a symlink \(steps\)/.test(w)));
  assert.ok(fs.lstatSync(path.join(dir, 'steps')).isSymbolicLink(), 'the link is left for the user');
  assert.ok(fs.existsSync(path.join(ws, '.claude/skills/wize-code-review/steps')), 'the clean mirror is still synced');
  rm(env.root); rm(outside);
});

test('team.json values are confined: .., ~, / and parents of the agents folder are refused', () => {
  const env = makeEnv();
  const home = tmp('wize-ob-home-');
  const prevHome = process.env.HOME;
  process.env.HOME = home;
  try {
    const bad = { dev: '..', pm: '~', 'ux-designer': '/', analyst: path.dirname(env.agentsDir), architect: 'sub/../..', 'tech-writer': '.', 'test-architect': path.join(os.tmpdir(), 'wize-ob-nowhere-xyz') };
    writeTeam(env, bad);
    const before = snapshot(env.agentsDir);
    const { r } = sync(env);
    assert.deepStrictEqual(r.agents, [], 'no workspace was synced');
    assert.deepStrictEqual(snapshot(env.agentsDir), before);
    assert.deepStrictEqual(fs.readdirSync(home), [], 'the home folder is untouched');
    assert.ok(r.warnings.filter(w => /skipped$/.test(w) && !/not in/.test(w)).length >= 7, JSON.stringify(r.warnings));
  } finally {
    if (prevHome === undefined) delete process.env.HOME; else process.env.HOME = prevHome;
  }
  rm(env.root); rm(home);
});

test('team.json: a relative path resolves against the agents folder, not the cwd', () => {
  const env = makeEnv();
  fs.mkdirSync(path.join(env.agentsDir, 'group/inner'), { recursive: true });
  fs.writeFileSync(path.join(env.agentsDir, 'group/inner/AGENTS.md'), '# x\n');
  writeTeam(env, { dev: 'group/inner' });
  const { r } = sync(env);
  assert.strictEqual(r.agents.length, 1);
  assert.ok(fs.existsSync(path.join(env.agentsDir, 'group/inner/.agents/skills/wize-agent-dev/SKILL.md')));
  rm(env.root);
});

test('a kit-marked copy that is not a kit skill is kept and warned about', () => {
  const env = makeEnv();
  sync(env);
  const ws = path.join(env.agentsDir, 'agent-dev');
  for (const root of ['.agents/skills', '.claude/skills']) {
    fs.cpSync(path.join(ws, root, 'wize-grill'), path.join(ws, root, 'my-grill'), { recursive: true });
    fs.cpSync(path.join(ws, root, 'wize-grill'), path.join(ws, root, 'wize-grill-mine'), { recursive: true });
    fs.writeFileSync(path.join(ws, root, 'my-grill/NOTES.md'), 'notes');
  }
  const { r } = sync(env, { 'dry-run': true });
  assert.deepStrictEqual(r.agents[0].skills.removed, []);
  const real = sync(env);
  assert.ok(fs.existsSync(path.join(ws, '.agents/skills/my-grill/NOTES.md')));
  assert.ok(fs.existsSync(path.join(ws, '.claude/skills/wize-grill-mine/SKILL.md')));
  assert.ok(real.r.warnings.some(w => /my-grill: carries the kit marker but is not a kit skill/.test(w)));
  rm(env.root);
});

test('one broken workspace does not stop the others; exit 1 only with --strict or when all fail', () => {
  const env = makeEnv({ dev: 'Shuri', orchestrator: 'Wizer' });
  fs.writeFileSync(path.join(env.agentsDir, 'agent-dev/.agents'), 'a file, not a folder');
  writeTeam(env, { orchestrator: 'agent-orchestrator', dev: 'agent-dev' });
  const { r } = sync(env);
  assert.strictEqual(r.exitCode, 0);
  assert.strictEqual(r.agents.length, 2);
  assert.ok(fs.existsSync(path.join(env.agentsDir, 'agent-orchestrator/.agents/skills/wize-orchestrator/SKILL.md')));
  assert.ok(r.warnings.some(w => /^dev: \.agents\/skills failed: ENOTDIR/.test(w)));
  assert.ok(fs.existsSync(path.join(env.agentsDir, 'agent-dev/.claude/skills/wize-agent-dev/SKILL.md')), 'the other root and AGENTS.md still run');
  assert.match(fs.readFileSync(path.join(env.agentsDir, 'agent-dev/AGENTS.md'), 'utf-8'), /wize-dev-kit:begin/);
  assert.strictEqual(sync(env, { strict: true }).r.exitCode, 1);

  rm(env.root);
});

test('a throwing step is reported by name and marks the agent as error', () => {
  const env = makeEnv();
  const ws = path.join(env.agentsDir, 'agent-dev');
  fs.mkdirSync(path.join(ws, '.agents/skills'), { recursive: true });
  fs.chmodSync(path.join(ws, '.agents/skills'), 0o500);
  writeTeam(env, { dev: 'agent-dev' });
  const { r } = sync(env);
  fs.chmodSync(path.join(ws, '.agents/skills'), 0o700);
  if (process.getuid && process.getuid() === 0) { rm(env.root); return; }
  assert.strictEqual(r.agents[0].status, 'error');
  assert.ok(r.warnings.some(w => /^dev: \.agents\/skills failed:/.test(w)));
  assert.strictEqual(r.exitCode, 1, 'every agent failed');
  assert.ok(fs.existsSync(path.join(ws, '.claude/skills/wize-agent-dev/SKILL.md')));
  rm(env.root);
});

test('AGENTS.md that links to a file inside the workspace gets the block in the target', () => {
  const env = makeEnv();
  const ws = path.join(env.agentsDir, 'agent-dev');
  fs.rmSync(path.join(ws, 'AGENTS.md'));
  fs.writeFileSync(path.join(ws, 'CLAUDE.md'), '# Shuri — x\n\nmeu texto\n');
  fs.symlinkSync('CLAUDE.md', path.join(ws, 'AGENTS.md'));
  writeTeam(env, { dev: 'agent-dev' });
  const { r } = sync(env);
  assert.ok(fs.lstatSync(path.join(ws, 'AGENTS.md')).isSymbolicLink(), 'the link survives');
  assert.strictEqual(r.agents[0].agentsMd, 'appended');
  const md = fs.readFileSync(path.join(ws, 'CLAUDE.md'), 'utf-8');
  assert.ok(md.startsWith('# Shuri — x\n\nmeu texto\n'));
  assert.strictEqual(md.split('wize-dev-kit:begin').length, 2);
  fs.rmSync(path.join(ws, 'CLAUDE.md'));
  const dangling = sync(env);
  assert.ok(dangling.r.warnings.some(w => /does not resolve to a file/.test(w)));
  rm(env.root);
});

test('sync never edits an existing team.json and never stores profiles or language in it', () => {
  const env = makeEnv({ 'ux-designer': 'Mantis' });
  sync(env, { profiles: 'core,web-overlay', lang: 'en' });
  const built = fs.readFileSync(env.teamFile, 'utf-8');
  assert.deepStrictEqual(JSON.parse(built), { version: 1, agents: { 'ux-designer': 'agent-ux-designer' } });
  const ws = path.join(env.agentsDir, 'agent-ux-designer');
  assert.ok(fs.existsSync(path.join(ws, '.agents/skills/wize-web-landing-page/SKILL.md')));
  const lines = [];
  const r = cmdOpenbotSync({ kitRoot: KIT, projectRoot: null, flags: { team: env.teamFile, 'agents-dir': env.agentsDir }, opts: { log: (s) => lines.push(s), warn: (s) => lines.push(s), env: NO_CLI } });
  assert.deepStrictEqual(r.source, { profiles: 'default', lang: 'default' }, 'nothing is remembered between runs');
  assert.deepStrictEqual(r.profiles, ['core', 'method', 'tea']);
  assert.strictEqual(r.lang, 'pt-BR');
  assert.ok(fs.existsSync(path.join(ws, '.agents/skills/wize-web-landing-page/SKILL.md')), 'overlay skill is kept without --profiles');
  assert.ok(r.warnings.some(w => /outside the default profiles .* were kept/.test(w)));
  assert.strictEqual(fs.readFileSync(env.teamFile, 'utf-8'), built);
  const withFlags = sync(env, { profiles: 'core,web-overlay', lang: 'en' });
  assert.strictEqual(withFlags.r.exitCode, 0);
  assert.strictEqual(fs.readFileSync(env.teamFile, 'utf-8'), built, 'flags do not touch the file either');
  assert.ok(fs.existsSync(path.join(ws, '.agents/skills/wize-web-landing-page/SKILL.md')));
  assert.match(fs.readFileSync(path.join(ws, 'AGENTS.md'), 'utf-8'), /You are \*\*Mantis\*\*/);
  rm(env.root);
});

test('default profiles keep out-of-set kit skills (warned); explicit profiles prune them; the summary names the sources', () => {
  const env = makeEnv({ 'ux-designer': 'Mantis' });
  sync(env, { profiles: 'core,web-overlay' });
  fs.writeFileSync(env.teamFile, JSON.stringify({ version: 1, agents: { 'ux-designer': 'agent-ux-designer' } }));
  const lines = [];
  const r = cmdOpenbotSync({ kitRoot: KIT, projectRoot: null, flags: { team: env.teamFile, 'agents-dir': env.agentsDir }, opts: { log: (s) => lines.push(s), warn: (s) => lines.push(s), env: NO_CLI } });
  assert.ok(r.warnings.some(w => /outside the default profiles .* were kept/.test(w)), JSON.stringify(r.warnings));
  assert.strictEqual(r.agents[0].skills.removed.length, 0);
  const ws = path.join(env.agentsDir, 'agent-ux-designer');
  const pruned = sync(env, { profiles: 'core,method,tea' });
  assert.ok(pruned.r.agents[0].skills.removed.length > 0);
  assert.ok(!fs.existsSync(path.join(ws, '.agents/skills/wize-web-landing-page')));
  assert.match(lines.join('\n'), /profiles core, method, tea \(default\)/);
  assert.match(lines.join('\n'), /skill folders \(\d+ files written, \d+ unchanged\)/);
  assert.ok(r.agents[0].skills.folders > 0);
  rm(env.root);
});

test('a persona missing from an existing team.json says how to fix it', () => {
  const env = makeEnv();
  writeTeam(env, { dev: 'agent-dev' });
  const { r } = sync(env);
  assert.ok(r.warnings.some(w => /orchestrator \(Wizer\): not in .*team\.json; skipped \(add "orchestrator" to the file, or delete the file to rebuild it\)/.test(w)));
  rm(env.root);
});

test('value flags without a value exit 1 instead of using a default', () => {
  const out = tmp('wize-ob-out-');
  for (const flag of ['out', 'profiles', 'lang']) {
    const lines = [];
    const r = cmdOpenbotExport({ kitRoot: KIT, projectRoot: null, flags: { out, [flag]: true }, opts: { log: (s) => lines.push(s), warn: (s) => lines.push(s) } });
    assert.strictEqual(r.exitCode, 1, flag);
    assert.match(lines.join('\n'), new RegExp(`--${flag} needs a value`));
  }
  assert.deepStrictEqual(fs.readdirSync(out), []);
  const env = makeEnv();
  for (const flag of ['team', 'agents-dir', 'profiles', 'lang']) {
    const { r, lines } = sync(env, { [flag]: true });
    assert.strictEqual(r.exitCode, 1, flag);
    assert.match(lines.join('\n'), new RegExp(`--${flag} needs a value`));
  }
  const cli = spawnSync(process.execPath, [CLI, 'openbot', 'export', '--out'], { encoding: 'utf-8', cwd: tmp('wize-ob-cwd-'), env: { ...process.env, HOME: tmp('wize-ob-home-') } });
  assert.strictEqual(cli.status, 1);
  rm(out); rm(env.root);
});

test('HELP lists every openbot flag', () => {
  const help = spawnSync(process.execPath, [CLI, 'help'], { encoding: 'utf-8' }).stdout;
  const line = help.split('\n').find(l => /^\s*openbot /.test(l));
  for (const f of ['--json', '--strict', '--profiles', '--lang', '--out', '--team', '--agents-dir', '--dry-run', '--adopt']) assert.ok(line.includes(f), f);
});

// ---- round 2 -----------------------------------------------------------------

function unzipTo(zip, dir) {
  for (const [name, buf] of readZipEntries(zip)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), buf);
  }
}

test('export marks every skill folder, so the first sync after an import refreshes it without --adopt', () => {
  const { r, out, zip } = exportTo({ profiles: 'core' });
  const z = readZipEntries(zip);
  const manifest = JSON.parse(z.get('openbot-import.json').toString());
  const dev = manifest.agents.find(a => a.key === 'dev');
  for (const sp of dev.skills) {
    assert.deepStrictEqual(JSON.parse(z.get(`${sp}/.wize-managed.json`).toString()), { managedBy: 'wize-dev-kit', version: VERSION }, sp);
  }
  assert.strictEqual(r.exitCode, 0);
  const extracted = tmp('wize-ob-unzip-');
  unzipTo(zip, extracted);
  const env = makeEnv();
  const ws = path.join(env.agentsDir, 'agent-dev');
  for (const root of ['.agents/skills', '.claude/skills']) {
    for (const code of dev.skills.map(sp => path.basename(sp))) team.copyTree(path.join(extracted, 'agents/dev/skills', code), path.join(ws, root, code));
  }
  fs.writeFileSync(path.join(ws, '.agents/skills/wize-agent-dev/SKILL.md'), 'old copy');
  const res = sync(env);
  assert.strictEqual(res.r.exitCode, 0);
  assert.ok(!res.r.warnings.some(w => /without the kit marker/.test(w)), JSON.stringify(res.r.warnings));
  const rep = res.r.agents.find(a => a.key === 'dev');
  assert.ok(rep.skills.folders > 0 && rep.skills.skipped.length === 0 && rep.skills.adopted.length === 0);
  assert.match(fs.readFileSync(path.join(ws, '.agents/skills/wize-agent-dev/SKILL.md'), 'utf-8'), /Shuri/, 'refreshed');
  rm(out); rm(extracted); rm(env.root);
});

test('sync refuses an absolute workspace outside the agents folder unless --allow-outside is given', () => {
  const env = makeEnv();
  const repo = tmp('wize-ob-repo-');
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), '# Meu repo\n');
  fs.mkdirSync(path.join(repo, '.claude/skills/my-skill'), { recursive: true });
  writeTeam(env, { dev: repo });
  const before = snapshot(repo);
  const { r } = sync(env);
  assert.deepStrictEqual(r.agents, []);
  assert.deepStrictEqual(snapshot(repo), before, 'the repository is untouched');
  assert.ok(r.warnings.some(w => /outside the agents folder/.test(w)));
  const link = path.join(env.agentsDir, 'agent-link');
  fs.symlinkSync(repo, link);
  writeTeam(env, { dev: link });
  const viaLink = sync(env).r;
  assert.deepStrictEqual(viaLink.agents, [], 'a link inside the agents folder that leaves it is outside too');
  assert.deepStrictEqual(snapshot(repo), before);
  writeTeam(env, { dev: repo });
  assert.strictEqual(sync(env, { 'allow-outside': true }).r.agents.length, 1);
  rm(env.root); rm(repo);
});

test('a workspace two team.json keys resolve to is skipped for both and left untouched', () => {
  const env = makeEnv();
  writeTeam(env, { dev: 'agent-dev', pm: path.join(env.agentsDir, 'agent-dev') });
  const ws = path.join(env.agentsDir, 'agent-dev');
  const before = fs.readFileSync(path.join(ws, 'AGENTS.md'), 'utf-8');
  const { r } = sync(env);
  assert.deepStrictEqual(r.agents, []);
  assert.ok(r.warnings.some(w => /pm \(Maria Hill\): workspace .* is mapped to pm, dev|pm \(Maria Hill\): workspace .* is mapped to dev, pm/.test(w)), JSON.stringify(r.warnings));
  assert.ok(r.warnings.some(w => /dev \(Shuri\): workspace .* is mapped to/.test(w)), JSON.stringify(r.warnings));
  assert.strictEqual(fs.readFileSync(path.join(ws, 'AGENTS.md'), 'utf-8'), before);
  rm(env.root);
});

test('a renamed copy of a kit skill keeps the marker and a matching name, and survives a pruning sync', () => {
  const env = makeEnv({ dev: 'Shuri' });
  sync(env, { profiles: 'core,method,tea' });
  const root = path.join(env.agentsDir, 'agent-dev', '.agents/skills');
  const copy = path.join(root, 'wize-my-story');
  fs.cpSync(path.join(root, 'wize-dev-story'), copy, { recursive: true });
  const md = path.join(copy, 'SKILL.md');
  fs.writeFileSync(md, fs.readFileSync(md, 'utf-8').replace(/^name: .*$/m, 'name: wize-my-story') + '\nmy edit\n');
  const { r } = sync(env, { profiles: 'core,method,tea' });
  assert.ok(fs.existsSync(md));
  assert.match(fs.readFileSync(md, 'utf-8'), /my edit/);
  assert.ok(r.warnings.some(w => /wize-my-story: carries the kit marker but is not a kit skill code/.test(w)), JSON.stringify(r.warnings));
  rm(env.root);
});

test('AGENTS.md keeps its file mode when the block is written', () => {
  const env = makeEnv();
  const md = path.join(env.agentsDir, 'agent-dev/AGENTS.md');
  fs.chmodSync(md, 0o600);
  sync(env);
  assert.strictEqual(fs.statSync(md).mode & 0o777, 0o600);
  rm(env.root);
});

test('auto-build with no agents says nothing was written; an inactive persona is not reported as missing', () => {
  const empty = makeEnv({});
  const none = sync(empty);
  assert.ok(!fs.existsSync(empty.teamFile));
  assert.match(none.lines.join('\n'), /No agents found.*team\.json not written/);
  assert.ok(!none.lines.some(l => /^Built /.test(l)));
  rm(empty.root);
  const env = makeEnv({ dev: 'Shuri' });
  const { r } = sync(env, { strict: false });
  assert.ok(!r.warnings.some(w => /red-teamer/.test(w)), JSON.stringify(r.warnings));
  assert.ok(r.warnings.some(w => /pm \(Maria Hill\): no agent found/.test(w)));
  const mapped = makeEnv({ 'red-teamer': 'Natasha Romanoff', dev: 'Shuri' });
  const full = sync(mapped);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(mapped.teamFile, 'utf-8')).agents['red-teamer'], 'agent-red-teamer', 'a mapped Natasha is still stored');
  assert.ok(full.r.warnings.some(w => /security-overlay is not active/.test(w)));
  rm(env.root); rm(mapped.root);
});

test('a stale kit skill that is a symlink is left alone with a warning', () => {
  const env = makeEnv();
  const elsewhere = tmp('wize-ob-elsewhere-');
  fs.writeFileSync(path.join(elsewhere, '.wize-managed.json'), JSON.stringify({ managedBy: 'wize-dev-kit', version: '0.0.1' }));
  fs.writeFileSync(path.join(elsewhere, 'SKILL.md'), '---\nname: wize-oldskill\n---\n');
  const ws = path.join(env.agentsDir, 'agent-dev');
  fs.mkdirSync(path.join(ws, '.agents/skills'), { recursive: true });
  fs.symlinkSync(elsewhere, path.join(ws, '.agents/skills/wize-oldskill'));
  const { r } = sync(env);
  assert.ok(r.warnings.some(w => /\.agents\/skills\/wize-oldskill: stale kit skill is a symlink; left alone/.test(w)), JSON.stringify(r.warnings));
  assert.ok(fs.lstatSync(path.join(ws, '.agents/skills/wize-oldskill')).isSymbolicLink());
  assert.ok(fs.existsSync(path.join(elsewhere, 'SKILL.md')));
  rm(env.root); rm(elsewhere);
});

test('export never writes through a symlink at the old fixed .part name, and two exports do not share a part file', () => {
  const out = tmp('wize-ob-out-');
  const victim = path.join(out, 'victim.txt');
  fs.writeFileSync(victim, 'keep me');
  const now = new Date();
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  fs.symlinkSync(victim, path.join(out, `wize-dev-kit-openbot-${d}.zip.part`));
  const r = cmdOpenbotExport({ kitRoot: KIT, projectRoot: null, flags: { out, profiles: 'core' }, opts: { ...quiet(), now } });
  assert.strictEqual(r.exitCode, 0);
  assert.strictEqual(fs.readFileSync(victim, 'utf-8'), 'keep me');
  assert.ok(!fs.lstatSync(r.path).isSymbolicLink());
  rm(out);
});

test('openbot export and sync reject a stray positional argument', () => {
  for (const sub of ['export', 'sync']) {
    const lines = [];
    const run = require(path.join(KIT, 'tools/installer/commands/openbot.js')).cmdOpenbot;
    const out = tmp('wize-ob-out-');
    const r = run({ kitRoot: KIT, projectRoot: null, args: [sub, 'bogus'], flags: { out }, opts: { log: (s) => lines.push(s), warn: (s) => lines.push(s) } });
    assert.strictEqual(r.exitCode, 1);
    assert.match(lines.join('\n'), /unexpected argument "bogus"/);
    assert.deepStrictEqual(fs.readdirSync(out), []);
    rm(out);
  }
});
