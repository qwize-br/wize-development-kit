// `openbot sync` core: finds where each persona's agent workspace lives
// (team.json, built on first run), then refreshes kit skills and the
// AGENTS.md block in place. Never calls OpenBot to change an agent, never
// touches OpenBot-owned skills, never follows a symlink out of a workspace.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const shared = require('./render-shared.js');
const team = require('./openbot-team.js');

const MARKER = team.MARKER;
const OPENBOT_MARKER = '.openbot-managed.json';
const SKILL_ROOTS = ['.agents/skills', '.claude/skills'];

const expandHome = (p) => (p === '~' ? os.homedir() : p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p);

function defaults(env = process.env) {
  const home = os.homedir();
  return {
    teamFile: path.join(home, 'OpenBot', 'Shared', 'wize-dev-kit', 'team.json'),
    agentsDir: path.join(home, 'OpenBot', 'Agents'),
    cli: env.OPENBOT_CLI || 'openbot-cli'
  };
}

// ---- team map ------------------------------------------------------------

// -> [{ id, name }] or null when openbot-cli is missing, fails or prints junk.
function listCliAgents(cli, env) {
  const script = /\.(mjs|cjs|js)$/.test(cli);
  const r = spawnSync(script ? process.execPath : cli, script ? [cli, 'list', '--json'] : ['list', '--json'], {
    encoding: 'utf-8', timeout: 15000, env, stdio: ['ignore', 'pipe', 'ignore']
  });
  if (r.error || r.status !== 0) return null;
  try {
    const out = JSON.parse(r.stdout);
    return Array.isArray(out.agents) ? out.agents.filter(a => a && typeof a.id === 'string' && typeof a.name === 'string') : null;
  } catch { return null; }
}

// -> Map(lowercased display name -> [workspace dir name]) from AGENTS.md first headings.
function scanWorkspaces(agentsDir) {
  const out = new Map();
  let entries = [];
  try { entries = fs.readdirSync(agentsDir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    let text;
    try {
      const f = path.join(agentsDir, e.name, 'AGENTS.md');
      if (fs.lstatSync(f).isSymbolicLink()) continue;
      text = fs.readFileSync(f, 'utf-8');
    } catch { continue; }
    const h = text.split(/\r?\n/).find(l => /^#\s+\S/.test(l));
    if (!h) continue;
    const name = h.replace(/^#\s+/, '').split(/\s+[—–-]\s+/)[0].trim().toLowerCase();
    if (!out.has(name)) out.set(name, []);
    out.get(name).push(e.name);
  }
  return out;
}

// personas: [{ key, name }] (every persona the kit knows, active or not).
function discoverTeam({ personas, agentsDir, cli, env }) {
  const cliAgents = listCliAgents(cli, env);
  const scanned = scanWorkspaces(agentsDir);
  const agents = {};
  const matches = [];
  const ambiguous = [];
  const missing = [];
  const lc = (s) => s.trim().toLowerCase();
  const isDir = (id) => { try { return fs.statSync(path.join(agentsDir, id)).isDirectory(); } catch { return false; } };
  for (const p of personas) {
    const fromCli = cliAgents ? cliAgents.filter(a => lc(a.name) === lc(p.name)) : [];
    if (fromCli.length > 1) { ambiguous.push({ key: p.key, name: p.name, candidates: fromCli.map(a => a.id) }); continue; }
    if (fromCli.length === 1 && isDir(fromCli[0].id)) {
      agents[p.key] = fromCli[0].id;
      matches.push({ key: p.key, name: p.name, via: 'openbot-cli', agent: fromCli[0].id });
      continue;
    }
    const fromScan = scanned.get(lc(p.name)) || [];
    if (fromScan.length > 1) { ambiguous.push({ key: p.key, name: p.name, candidates: fromScan }); continue; }
    if (fromScan.length === 1) {
      agents[p.key] = fromScan[0];
      matches.push({ key: p.key, name: p.name, via: 'AGENTS.md', agent: fromScan[0] });
      continue;
    }
    missing.push({ key: p.key, name: p.name });
  }
  return { agents, matches, ambiguous, missing, cliUsed: cliAgents !== null };
}

// -> { agents } or throws on an unreadable or malformed team file.
function readTeamFile(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf-8'); } catch (err) { if (err.code === 'ENOENT') return null; throw err; }
  let json;
  try { json = JSON.parse(raw); } catch { throw new Error(`${file} is not valid JSON`); }
  if (!json || json.version !== 1 || !json.agents || typeof json.agents !== 'object' || Array.isArray(json.agents)) {
    throw new Error(`${file} must look like {"version":1,"agents":{"<key>":"<agent id or workspace path>"}}`);
  }
  for (const [k, v] of Object.entries(json.agents)) {
    if (typeof v !== 'string' || !v.trim()) throw new Error(`${file}: agents.${k} must be a non-empty string`);
  }
  return { agents: json.agents };
}

// Written only when the file is missing: {"version":1,"agents":{...}}.
function writeTeamFile(file, agents) {
  shared.ensureDir(path.dirname(file));
  shared.writeFileIfChanged(file, JSON.stringify({ version: 1, agents }, null, 2) + '\n');
}

const realOrSelf = (p) => { try { return fs.realpathSync(p); } catch { return shared.landingDir(p); } };
const within = (child, parent) => child === parent || child.startsWith(parent + path.sep);

// team.json value -> { dir } or { error }. An id lives in agentsDir; a relative
// path is read from agentsDir and must stay in it; an absolute path must lie in
// agentsDir (or hold AGENTS.md or .agents/ with allowOutside) and never be the home folder, the
// root or a parent of agentsDir. An absolute path outside agentsDir is only
// accepted with allowOutside (--allow-outside), so a typo or a planted entry in
// team.json cannot point sync at an ordinary repository.
function resolveWorkspace(value, agentsDir, { allowOutside = false } = {}) {
  const raw = String(value).trim();
  if (!raw) return { error: 'empty workspace value' };
  const v = expandHome(raw);
  const agents = realOrSelf(agentsDir);
  if (!path.isAbsolute(v) && !raw.includes('/') && !raw.includes(path.sep)) {
    if (raw === '.' || raw === '..') return { error: `"${raw}" is not an agent id` };
    return { dir: path.join(agentsDir, raw) };
  }
  const dir = path.resolve(path.isAbsolute(v) ? v : path.join(agentsDir, v));
  const real = realOrSelf(dir);
  if (!path.isAbsolute(v)) {
    return within(real, agents) && real !== agents ? { dir } : { error: `"${raw}" leaves the agents folder ${agentsDir}` };
  }
  if (real === path.parse(real).root || real === realOrSelf(os.homedir()) || within(agents, real)) {
    return { error: `"${raw}" is the home folder, the root or a parent of the agents folder; not an agent workspace` };
  }
  if (within(real, agents)) return { dir };
  if (!allowOutside) return { error: `${dir} is outside the agents folder ${agentsDir}; pass --allow-outside to sync a workspace there` };
  if (!lstatOrNull(path.join(dir, 'AGENTS.md')) && !lstatOrNull(path.join(dir, '.agents'))) {
    return { error: `${dir} has no AGENTS.md or .agents/; not an agent workspace` };
  }
  return { dir };
}

// ---- writes ----------------------------------------------------------------

function put(dst, buf, dry, src) {
  let existing = null;
  try { existing = fs.readFileSync(dst); } catch { /* absent */ }
  if (existing && existing.equals(buf)) return 'unchanged';
  if (dry) return 'written';
  shared.ensureDir(path.dirname(dst));
  return src ? shared.copyFileIfChanged(src, dst) : shared.writeFileIfChanged(dst, buf);
}

function lstatOrNull(p) {
  try { return fs.lstatSync(p); } catch { return null; }
}

function readMarker(dir, name) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf-8')); } catch { return null; }
}

// absent | kit | openbot | unmarked | other
function classify(dir) {
  const st = lstatOrNull(dir);
  if (!st) return 'absent';
  if (st.isSymbolicLink() || !st.isDirectory()) return 'other';
  if (lstatOrNull(path.join(dir, OPENBOT_MARKER))) return 'openbot';
  const m = readMarker(dir, MARKER);
  return m && m.managedBy === 'wize-dev-kit' ? 'kit' : 'unmarked';
}

function pruneExtra(dir, keep, dry, rel = '') {
  let removed = 0;
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      removed += pruneExtra(dir, keep, dry, r);
      if (!dry) { try { fs.rmdirSync(path.join(dir, r)); } catch { /* not empty */ } }
    } else if (!keep.has(r)) {
      if (!dry) fs.rmSync(path.join(dir, r), { force: true });
      removed++;
    }
  }
  return removed;
}

// First symlink anywhere under dir (not followed), as a relative path, or null.
function findSymlink(dir, rel = '') {
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isSymbolicLink()) return r;
    if (e.isDirectory()) { const hit = findSymlink(dir, r); if (hit) return hit; }
  }
  return null;
}

// A kit-managed folder is only removed when it really is a kit skill: the name
// starts with wize- and matches the SKILL.md name (a copy made with cp -r to
// customize a skill keeps the marker but not the name).
function isKitSkillDir(dir, name) {
  if (!/^wize-/.test(name)) return false;
  try {
    const fm = shared.readFrontmatter(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf-8'));
    return fm.name === name;
  } catch { return false; }
}

function syncSkillsRoot({ dir, codes, pool, version, dry, adopt, prune = true, catalog = null, rep, label }) {
  const want = new Set(codes);
  const marker = Buffer.from(team.markerContent(version));
  let entries = [];
  const rootSt = lstatOrNull(dir);
  if (rootSt && !rootSt.isDirectory()) { rep.warnings.push(`${label} exists but is not a folder; skipped`); return; }
  if (rootSt) entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const e of entries) {
    if (want.has(e.name)) continue;
    const sub = path.join(dir, e.name);
    if (e.isSymbolicLink()) {
      if (/^wize-/.test(e.name) && readMarker(sub, MARKER)) rep.warnings.push(`${label}/${e.name}: stale kit skill is a symlink; left alone`);
      continue;
    }
    if (!e.isDirectory()) continue;
    if (classify(sub) !== 'kit') continue;
    // Only a code the kit ships (in any profile) can be stale; a renamed copy
    // that kept the marker is the user's.
    if (catalog && !catalog.has(e.name)) {
      rep.warnings.push(`${label}/${e.name}: carries the kit marker but is not a kit skill code; left alone`);
      continue;
    }
    if (!isKitSkillDir(sub, e.name)) {
      rep.warnings.push(`${label}/${e.name}: carries the kit marker but is not a kit skill (name differs from SKILL.md or no wize- prefix); left alone`);
      continue;
    }
    if (!prune) { rep.skills.kept.push(`${label}/${e.name}`); continue; }
    if (!dry) fs.rmSync(sub, { recursive: true, force: true });
    rep.skills.removed.push(`${label}/${e.name}`);
  }

  for (const code of codes) {
    const dest = path.join(dir, code);
    const state = classify(dest);
    if (state === 'openbot') { rep.skills.skipped.push({ skill: `${label}/${code}`, reason: 'OpenBot-managed' }); continue; }
    if (state === 'other') { rep.warnings.push(`${label}/${code}: not a plain folder (file or symlink); left alone`); rep.skills.skipped.push({ skill: `${label}/${code}`, reason: 'not a folder' }); continue; }
    if (state === 'unmarked') {
      if (!adopt) {
        rep.warnings.push(`${label}/${code}: exists without the kit marker (hand install?); left alone, pass --adopt to replace it`);
        rep.skills.skipped.push({ skill: `${label}/${code}`, reason: 'unmarked' });
        continue;
      }
      if (!dry) fs.rmSync(dest, { recursive: true, force: true });
      rep.skills.adopted.push(`${label}/${code}`);
    }
    if (state === 'kit') {
      const link = findSymlink(dest);
      if (link) {
        rep.warnings.push(`${label}/${code}: contains a symlink (${link}); skipped, remove the link to let sync refresh it`);
        rep.skills.skipped.push({ skill: `${label}/${code}`, reason: 'symlink inside' });
        continue;
      }
    }
    const files = team.listFiles(path.join(pool, code));
    const keep = new Set([MARKER, ...files]);
    const tally = (r) => { rep.skills[r === 'unchanged' ? 'unchanged' : 'written']++; };
    rep.skills.folders++;
    tally(put(path.join(dest, MARKER), marker, dry));
    for (const f of files) {
      const src = path.join(pool, code, f);
      tally(put(path.join(dest, f), fs.readFileSync(src), dry, src));
    }
    if (state === 'kit') rep.skills.pruned += pruneExtra(dest, keep, dry);
  }
}

function syncAgentsMd({ workspace, persona, dry, rep, inside }) {
  const file = path.join(workspace, 'AGENTS.md');
  if (!inside(file)) { rep.warnings.push('AGENTS.md resolves outside the workspace; refused'); rep.agentsMd = 'refused'; return; }
  const st = lstatOrNull(file);
  if (st && !(st.isFile() || st.isSymbolicLink())) { rep.warnings.push('AGENTS.md is not a file; refused'); rep.agentsMd = 'refused'; return; }
  let target = file;
  if (st && st.isSymbolicLink()) {
    try { target = fs.realpathSync(file); } catch { target = null; }
    if (!target || !fs.statSync(target).isFile()) { rep.warnings.push('AGENTS.md is a symlink that does not resolve to a file; refused'); rep.agentsMd = 'refused'; return; }
  }
  const current = st ? fs.readFileSync(target, 'utf-8') : null;
  const out = team.upsertKitBlock(current, persona.block, `# ${persona.name} — ${persona.title}`);
  if (out.action === 'refused') {
    rep.warnings.push('AGENTS.md has a wize-dev-kit begin or end marker without its pair; left alone');
    rep.agentsMd = 'refused';
    return;
  }
  rep.agentsMd = out.action;
  if (out.action !== 'unchanged' && !dry) shared.writeFileIfChanged(target, out.content, st ? fs.statSync(target).mode & 0o777 : undefined);
}

function syncAgent({ persona, workspace, pool, version, dry, adopt, prune = true, catalog = null }) {
  const rep = {
    key: persona.key, name: persona.name, workspace, status: 'ok',
    skills: { folders: 0, written: 0, unchanged: 0, removed: [], kept: [], skipped: [], adopted: [], pruned: 0 },
    agentsMd: null, warnings: []
  };
  const st = lstatOrNull(workspace);
  if (!st) { rep.status = 'skipped'; rep.warnings.push(`workspace not found: ${workspace}`); return rep; }
  if (st.isSymbolicLink() || !st.isDirectory()) { rep.status = 'skipped'; rep.warnings.push(`workspace is a symlink or not a folder; refused: ${workspace}`); return rep; }
  const realWs = fs.realpathSync(workspace);
  const inside = (p) => { const r = shared.landingDir(p); return r === realWs || r.startsWith(realWs + path.sep); };

  const step = (what, fn) => {
    try { fn(); } catch (err) {
      rep.status = 'error';
      rep.warnings.push(`${what} failed: ${err && err.message ? err.message : err}`);
    }
  };
  for (const root of SKILL_ROOTS) {
    const dir = path.join(workspace, root);
    if (!inside(dir)) { rep.warnings.push(`${root} resolves outside the workspace; refused`); continue; }
    step(root, () => syncSkillsRoot({ dir, codes: persona.skills, pool, version, dry, adopt, prune, catalog, rep, label: root }));
  }
  step('AGENTS.md', () => syncAgentsMd({ workspace, persona, dry, rep, inside }));
  return rep;
}

module.exports = {
  MARKER, OPENBOT_MARKER, SKILL_ROOTS,
  defaults, expandHome, realOrSelf, listCliAgents, scanWorkspaces, discoverTeam, readTeamFile, writeTeamFile, resolveWorkspace, syncAgent
};
