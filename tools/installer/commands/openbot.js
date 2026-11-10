// `wize-dev-kit openbot <export|sync>` — the kit's team for the OpenBot app.
// OpenBot agents live outside the repository, so this is not an IDE target in
// project.toml: `export` builds an import .zip, `sync` refreshes agents that
// were already imported.

'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const { loadProjectConfig } = require('../toml.js');
const { writeZip, MAX_ENTRIES } = require('../zip.js');
const team = require('../openbot-team.js');
const sync = require('../openbot-sync.js');
const shared = require('../render-shared.js');

const USAGE = `Usage:
  wize-dev-kit openbot export [--profiles a,b] [--lang pt-BR] [--out <dir>] [--json]
  wize-dev-kit openbot sync [--team <file>] [--agents-dir <dir>] [--dry-run] [--adopt] [--allow-outside] [--strict] [--json]
                            [--profiles a,b] [--lang pt-BR]`;

const csv = (v) => (typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : null);

// Flags beat project.toml, and project.toml beats the defaults. `source` says
// which one won.
function resolveContext({ projectRoot, flags }) {
  const cfg = projectRoot ? loadProjectConfig(projectRoot) : {};
  const flagProfiles = csv(flags.profiles);
  const cfgProfiles = cfg.install && Array.isArray(cfg.install.profiles) ? cfg.install.profiles : null;
  const source = { profiles: 'default', lang: 'default' };
  let list = ['core', 'method', 'tea'];
  if (flagProfiles) { list = flagProfiles; source.profiles = 'flag'; }
  else if (cfgProfiles) { list = cfgProfiles; source.profiles = 'project'; }
  const { profiles, unknown } = team.normalizeProfiles(list);
  let lang = 'pt-BR';
  if (typeof flags.lang === 'string' && flags.lang.trim()) { lang = flags.lang.trim(); source.lang = 'flag'; }
  else if (cfg.language && typeof cfg.language.communication === 'string' && cfg.language.communication) { lang = cfg.language.communication; source.lang = 'project'; }
  return { profiles, unknown, lang, source };
}

// A value flag given with no value is parsed as `true`; refuse it instead of
// silently using a default.
function missingValue(flags, names) {
  const bad = names.find(n => flags[n] !== undefined && typeof flags[n] !== 'string');
  return bad ? `--${bad} needs a value` : null;
}

function emitter(opts, json) {
  const log = opts.log || console.log;
  const warn = opts.warn || console.error;
  return { err: warn, say: (s) => { if (!json) log(s); }, warn: (s) => { if (!json) warn(s); }, out: (o) => log(JSON.stringify(o)) };
}

function fail(io, json, message) {
  if (json) io.out({ ok: false, error: message });
  else io.err(`wize: openbot: ${message}`);
  return { exitCode: 1, ok: false, error: message };
}

const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---- export ----------------------------------------------------------------

function cmdOpenbotExport({ kitRoot, projectRoot, flags = {}, opts = {} }) {
  const json = !!flags.json;
  const io = emitter(opts, json);
  const noValue = missingValue(flags, ['out', 'profiles', 'lang']);
  if (noValue) return fail(io, json, noValue);
  const ctx = resolveContext({ projectRoot, flags });
  if (ctx.unknown.length) return fail(io, json, `unknown profile(s): ${ctx.unknown.join(', ')}. Valid: ${team.KNOWN_PROFILES.join(', ')}`);
  const now = opts.now || new Date();
  const outDir = typeof flags.out === 'string' ? path.resolve(flags.out) : path.join(os.homedir(), 'Downloads');
  const tm = team.buildTeam(kitRoot, { profiles: ctx.profiles, lang: ctx.lang, cap: opts.cap });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-openbot-'));
  let part = null;
  try {
    const pool = path.join(tmp, 'pool');
    const stage = path.join(tmp, 'stage');
    team.renderSkillPool(kitRoot, pool, ctx.profiles);
    for (const p of tm.personas) {
      const base = path.join(stage, 'agents', p.key);
      for (const code of p.skills) {
        team.copyTree(path.join(pool, code), path.join(base, 'skills', code));
        fs.writeFileSync(path.join(base, 'skills', code, team.MARKER), team.markerContent(tm.version));
      }
      fs.mkdirSync(path.join(base, 'files'), { recursive: true });
      fs.writeFileSync(path.join(base, 'files', 'SOUL.md'), p.soul);
    }
    const manifest = team.buildManifest(tm, { exportedAt: now.toISOString().replace(/\.\d{3}Z$/, 'Z') });
    const errs = team.validateManifest(manifest, stage);
    if (errs.length) return fail(io, json, `the import manifest breaks OpenBot limits:\n  - ${errs.join('\n  - ')}`);
    fs.writeFileSync(path.join(stage, 'openbot-import.json'), JSON.stringify(manifest, null, 2) + '\n');

    const files = team.listFiles(stage).filter(f => f !== 'openbot-import.json');
    if (files.length + 1 > MAX_ENTRIES) return fail(io, json, `${files.length + 1} files; a zip holds at most ${MAX_ENTRIES}`);
    const entries = ['openbot-import.json', ...files].map(name => ({ name, file: path.join(stage, name) }));

    fs.mkdirSync(outDir, { recursive: true });
    const dest = path.join(outDir, `wize-dev-kit-openbot-${localDate(now)}.zip`);
    part = path.join(outDir, `.${path.basename(dest)}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.part`);
    const z = writeZip(part, entries, { mtime: now });
    fs.renameSync(part, dest);
    part = null;

    const dropped = tm.personas.flatMap(p => p.dropped.map(d => ({ agent: p.key, skill: d.code, reason: d.reason })));
    const result = {
      ok: true,
      path: dest,
      version: tm.version,
      profiles: tm.profiles,
      lang: tm.lang,
      files: z.entries,
      bytes: z.bytes,
      agents: tm.personas.map(p => ({ key: p.key, name: p.name, title: p.title, skills: p.skills, memories: p.memories.length, dropped: p.dropped })),
      skippedPersonas: tm.inactive.map(p => ({ key: p.key, name: p.name, module: p.module })),
      dropped,
      import: 'OpenBot → Server settings → Import → choose this file'
    };
    if (json) { io.out(result); return { exitCode: 0, ...result }; }
    io.say(`OpenBot export written: ${dest}`);
    io.say(`  kit v${tm.version} · profiles ${tm.profiles.join(', ')} · language ${tm.lang} · ${z.entries} files`);
    io.say(`  ${tm.personas.length} agents:`);
    for (const p of tm.personas) io.say(`    ${p.key.padEnd(20)} ${p.name} · ${p.skills.length} skills`);
    if (tm.inactive.length) io.say(`  not exported (module not active): ${tm.inactive.map(p => `${p.name} (${p.module})`).join(', ')}`);
    if (dropped.length) {
      io.say('  dropped skills:');
      for (const d of dropped) io.say(`    ${d.agent}: ${d.skill} (${d.reason})`);
    }
    io.say(`Import: ${result.import}.`);
    return { exitCode: 0, ...result };
  } catch (err) {
    return fail(io, json, err && err.message ? err.message : String(err));
  } finally {
    if (part) fs.rmSync(part, { force: true });
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---- sync ------------------------------------------------------------------

function cmdOpenbotSync({ kitRoot, projectRoot, flags = {}, opts = {} }) {
  const json = !!flags.json;
  const io = emitter(opts, json);
  const env = opts.env || process.env;
  const dry = !!flags['dry-run'];
  const noValue = missingValue(flags, ['team', 'agents-dir', 'profiles', 'lang']);
  if (noValue) return fail(io, json, noValue);
  const def = sync.defaults(env);
  const teamFile = typeof flags.team === 'string' ? path.resolve(sync.expandHome(flags.team)) : def.teamFile;
  const agentsDir = typeof flags['agents-dir'] === 'string' ? path.resolve(sync.expandHome(flags['agents-dir'])) : def.agentsDir;
  const warnings = [];

  let map;
  try { map = sync.readTeamFile(teamFile); } catch (err) { return fail(io, json, err.message); }
  const ctx = resolveContext({ projectRoot, flags });
  if (ctx.unknown.length) return fail(io, json, `unknown profile(s): ${ctx.unknown.join(', ')}. Valid: ${team.KNOWN_PROFILES.join(', ')}`);

  const tm = team.buildTeam(kitRoot, { profiles: ctx.profiles, lang: ctx.lang, cap: opts.cap });
  const everyone = [...tm.personas, ...tm.inactive];

  let built = null;
  if (!map) {
    built = sync.discoverTeam({ personas: everyone, agentsDir, cli: def.cli, env });
    map = { agents: built.agents };
    const found = built.matches.length > 0;
    if (found && !dry) sync.writeTeamFile(teamFile, built.agents);
    const via = built.cliUsed ? '' : ' (openbot-cli not available; used AGENTS.md headings)';
    io.say(found
      ? `${dry ? '[dry-run] would build' : 'Built'} ${teamFile}: ${built.matches.length} matched${via}`
      : `No agents found${via}; team.json not written`);
    for (const m of built.matches) io.say(`  ${m.key.padEnd(20)} ${m.name} -> ${m.agent} (via ${m.via})`);
    for (const a of built.ambiguous) warnings.push(`${a.key} (${a.name}): ambiguous, several agents match (${a.candidates.join(', ')}); skipped`);
    for (const m of built.missing) {
      if (tm.inactive.some(p => p.key === m.key)) continue;
      warnings.push(`${m.key} (${m.name}): no agent found; skipped`);
    }
  }

  const reports = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wize-openbot-sync-'));
  try {
    const pool = path.join(tmp, 'pool');
    team.renderSkillPool(kitRoot, pool, ctx.profiles);
    const everything = path.join(tmp, 'catalog');
    team.renderSkillPool(kitRoot, everything, team.KNOWN_PROFILES);
    const catalog = new Set(fs.readdirSync(everything));
    // Resolve every key first: a workspace two personas point at is skipped for
    // both, so neither overwrites the other's block or prunes its skills.
    const targets = [];
    const owners = new Map();
    for (const p of tm.personas) {
      const value = map.agents[p.key];
      if (!value) {
        if (!built) warnings.push(`${p.key} (${p.name}): not in ${teamFile}; skipped (add "${p.key}" to the file, or delete the file to rebuild it)`);
        continue;
      }
      const ws = sync.resolveWorkspace(value, agentsDir, { allowOutside: flags['allow-outside'] === true });
      if (ws.error) { warnings.push(`${p.key} (${p.name}): ${ws.error}; skipped`); continue; }
      const real = sync.realOrSelf(ws.dir);
      owners.set(real, [...(owners.get(real) || []), p.key]);
      targets.push({ p, ws, real });
    }
    for (const { p, ws, real } of targets) {
      const keys = owners.get(real);
      if (keys.length > 1) {
        warnings.push(`${p.key} (${p.name}): workspace ${ws.dir} is mapped to ${keys.join(', ')}; skipped until team.json names one persona per workspace`);
        continue;
      }
      let rep;
      try {
        // Without an explicit profile list (flag or project.toml) the active overlays
        // are a guess, so kit skills outside the default set are kept, never removed.
        rep = sync.syncAgent({ persona: p, workspace: ws.dir, pool, version: tm.version, dry, adopt: flags.adopt === true, prune: ctx.source.profiles !== 'default', catalog });
      } catch (err) {
        rep = { key: p.key, name: p.name, workspace: ws.dir, status: 'error', skills: { folders: 0, written: 0, unchanged: 0, removed: [], kept: [], skipped: [], adopted: [], pruned: 0 }, agentsMd: null, warnings: [`sync failed: ${err && err.message ? err.message : err}`] };
      }
      reports.push(rep);
    }
  } catch (err) {
    return fail(io, json, err && err.message ? err.message : String(err));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  for (const key of Object.keys(map.agents)) {
    const idle = tm.inactive.find(p => p.key === key);
    if (idle) warnings.push(`${key} (${idle.name}): module ${idle.module} is not active; pass --profiles ${idle.module} to sync it`);
  }
  for (const r of reports) for (const w of r.warnings) warnings.push(`${r.key}: ${w}`);
  const kept = reports.reduce((n, r) => n + r.skills.kept.length, 0);
  if (kept) {
    warnings.push(`${kept} kit skill folder(s) outside the default profiles (${tm.profiles.join(', ')}) were kept, not removed or refreshed; pass --profiles (or run inside the project) to refresh or prune them`);
  }

  const result = {
    ok: true, dryRun: dry, version: tm.version, profiles: tm.profiles, lang: tm.lang, source: ctx.source,
    teamFile, teamBuilt: !!built, agentsDir, agents: reports, warnings
  };
  const allFailed = reports.length > 0 && reports.every(r => r.status === 'error');
  const exitCode = (flags.strict === true && warnings.length > 0) || allFailed ? 1 : 0;
  if (json) { io.out({ ...result, exitCode }); return { exitCode, ...result }; }
  io.say(`${dry ? '[dry-run] ' : ''}OpenBot sync · kit v${tm.version} · profiles ${tm.profiles.join(', ')} (${ctx.source.profiles}) · language ${tm.lang} (${ctx.source.lang})`);
  for (const r of reports) {
    const s = r.skills;
    io.say(`  ${r.key.padEnd(20)} ${r.name}: ${r.status === 'error' ? 'ERROR, ' : ''}${s.folders} skill folders (${s.written} files written, ${s.unchanged} unchanged), ${s.removed.length} stale folders removed${s.adopted.length ? `, ${s.adopted.length} adopted` : ''}; AGENTS.md ${r.agentsMd || 'untouched'}`);
  }
  if (!reports.length) io.say('  no workspace was synced');
  for (const w of warnings) io.warn(`  warning: ${w}`);
  if (dry) io.say('Dry run: nothing was written.');
  return { exitCode, ...result };
}

function cmdOpenbot({ kitRoot, projectRoot, args = [], flags = {}, opts = {} }) {
  const sub = args[0];
  if ((sub === 'export' || sub === 'sync') && args.length > 1) {
    (opts.warn || console.error)(`wize: openbot ${sub}: unexpected argument "${args[1]}"\n${USAGE}`);
    return { exitCode: 1 };
  }
  if (sub === 'export') return cmdOpenbotExport({ kitRoot, projectRoot, flags, opts });
  if (sub === 'sync') return cmdOpenbotSync({ kitRoot, projectRoot, flags, opts });
  (opts.warn || console.error)(sub ? `Unknown openbot subcommand: ${sub}\n${USAGE}` : USAGE);
  return { exitCode: 1 };
}

module.exports = { cmdOpenbot, cmdOpenbotExport, cmdOpenbotSync, resolveContext, USAGE };
