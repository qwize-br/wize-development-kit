// OpenBot team model: which personas are active for a set of profiles, which
// skills each one carries, the text written into the import manifest and the
// AGENTS.md block, and the manifest limit checks. Pure reads of the kit; the
// `export` and `sync` commands do the writing.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const shared = require('./render-shared.js');

const { readFrontmatter, clipOneLine } = shared;

const LIMITS = {
  key: 64, name: 80, title: 120, description: 2000, skills: 32, routines: 64,
  memories: 64, memory: 500, skillName: 80, skillFiles: 200, skillBytes: 10 * 1024 * 1024,
  archiveFiles: 200000, sourceString: 80
};

// Modules the kit installs on every project (required: true in module.yaml).
const REQUIRED_MODULES = ['core', 'builder', 'method', 'tea', 'orchestrator'];
const OVERLAYS = ['web-overlay', 'app-overlay', 'security-overlay'];
const KNOWN_PROFILES = [...REQUIRED_MODULES, ...OVERLAYS];

const TRANSVERSAL = ['wize-grill', 'wize-no-ai-slop', 'wize-subtract', 'wize-help'];

// Wizer: the entries the spec names come first, then his own, then the skills
// the intent table routes to most often.
const ORCHESTRATOR_FIRST = ['wize-help', 'wize-orchestrator', 'wize-party-mode', 'wize-check'];
const ORCHESTRATOR_ROUTING = [
  'wize-product-brief', 'wize-create-prd', 'wize-create-architecture', 'wize-create-epics-and-stories',
  'wize-sprint-status', 'wize-sprint-planning', 'wize-quick-dev', 'wize-correct-course',
  'wize-document-project', 'wize-tech-vision', 'wize-ux-scenarios', 'wize-tea-risk', 'wize-tea-gate',
  'wize-dev-story', 'wize-research', 'wize-spec', 'wize-create-story', 'wize-validate-prd',
  'wize-check-implementation-readiness', 'wize-nfr-principles', 'wize-trigger-map'
];

const MARKER = '.wize-managed.json';
const markerContent = (version) => JSON.stringify({ managedBy: 'wize-dev-kit', version }) + '\n';

const FORBIDDEN_DIRS = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__']);
const ARCHIVE_RE = /\.(zip|tar|gz|tgz|7z|rar)$/i;

function normalizeProfiles(list) {
  const given = (list || []).map(s => String(s).trim()).filter(Boolean);
  const unknown = given.filter(p => !KNOWN_PROFILES.includes(p));
  const profiles = [...new Set(['core', ...given.filter(p => KNOWN_PROFILES.includes(p))])];
  return { profiles, unknown };
}

function keyOf(code) {
  return code.replace(/^wize-(agent-|sec-)?/, '');
}

function readYamlList(content, field) {
  const lines = content.split('\n');
  const head = new RegExp('^' + field + ':\\s*(#.*)?$');
  const idx = lines.findIndex(l => head.test(l));
  if (idx === -1) return [];
  const out = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '' || /^\s*#/.test(l)) continue;
    const m = l.match(/^\s+-\s+(?:"([^"]*)"|'([^']*)'|([^\s#]+))/);
    if (!m) break;
    out.push(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]);
  }
  return out;
}

// Truncates at a word boundary without splitting a surrogate pair.
function safeTruncate(str, max) {
  const s = String(str);
  if (s.length <= max) return s;
  let cut = s.slice(0, max - 1);
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xD800 && last <= 0xDBFF) cut = cut.slice(0, -1);
  const space = cut.lastIndexOf(' ');
  if (space > max * 0.6) cut = cut.slice(0, space);
  return cut.replace(/[\s,;:.—-]+$/, '') + '…';
}

// ---- text, per language --------------------------------------------------

function textsFor(lang) {
  if (/^pt/i.test(lang)) {
    return {
      rules: [
        'Responda em português do Brasil, direto, sem enrolação.',
        'Não invente dados, números, nomes ou fontes. Faltando informação, diga o que falta e como obter.',
        'Só diga "feito" depois de verificar o resultado com uma leitura ou comando real.',
        'Respeite os limites da persona: o que não é seu, você passa por handoff em vez de decidir.',
        'Os artefatos do método ficam em `.wize/` no repositório alvo. Pergunte qual é o repositório alvo antes de escrever qualquer arquivo e nunca grave neste workspace.'
      ],
      rulesHeading: 'Regras de trabalho',
      readSoul: 'Leia imported/SOUL.md antes da primeira tarefa.',
      you: (n, t) => `Você é **${n}**, ${t}.`,
      kitHeading: 'Kit',
      kitLines: (v, code, key) => [
        `Persona e skills do kit em \`.agents/skills/wize-*/SKILL.md\`, espelhadas em \`.claude/skills/\`. Comece por \`${code}\`.`,
        'Os artefatos do projeto vivem em `.wize/` no repositório alvo (`planning/`, `solutioning/`, `implementation/`, `knowledge/`, `security/`, `config/`).',
        `Atualização: \`npx wize-dev-kit@latest openbot sync\` (kit v${v}, chave \`${key}\`). O sync reescreve este bloco e as skills com \`.wize-managed.json\`; o texto fora do bloco não é tocado.`
      ],
      roster: 'Time Wize Dev Kit (chave: nome, papel): ',
      chain: 'Cadeia do método: ',
      chainRisk: 'risco', chainGate: 'trace, review e gate', chainStatus: 'status',
      artifacts: 'Os artefatos do projeto ficam em `.wize/` no repositório alvo (planning/, solutioning/, implementation/, knowledge/, security/, config/). Leia o artefato anterior antes de escrever o seu. Antes de escrever qualquer arquivo, pergunte qual é o repositório alvo; nunca grave no workspace do agente.',
      delegation: 'Para delegar a outro agente, use `openbot-cli run <agente> - --wait` com a tarefa na entrada padrão, quando Local scripts estiver ligado nele (`<agente>` é o id ou o nome). A mensagem traz: repositório alvo, artefato de entrada (caminho em `.wize/`), o que entregar e o critério de pronto.',
      identity: (n, key, code, v) => `Você é ${n} (chave \`${key}\`, skill \`${code}\`). Kit wize-dev-kit v${v}; persona e skills são atualizadas por \`npx wize-dev-kit@latest openbot sync\`. Não edite as skills wize-* à mão.`,
      scope: 'Só atua com `.wize/security/scope.md` assinado no repositório alvo. Sem scope, recusa e registra a recusa.'
    };
  }
  const name = /^en/i.test(lang) ? 'English' : `the language "${lang}"`;
  return {
    rules: [
      `Reply in ${name}, direct and short.`,
      'Do not invent data, numbers, names or sources. When information is missing, say what is missing and how to get it.',
      'Say "done" only after checking the result with a real read or command.',
      'Respect the persona limits: what is not yours, hand off instead of deciding.',
      'Method artifacts live in `.wize/` of the target repository. Ask which repository is the target before writing any file, and never write into this agent workspace.'
    ],
    rulesHeading: 'Work rules',
    readSoul: 'Read imported/SOUL.md before your first task.',
    you: (n, t) => `You are **${n}**, ${t}.`,
    kitHeading: 'Kit',
    kitLines: (v, code, key) => [
      `Kit persona and skills live in \`.agents/skills/wize-*/SKILL.md\`, mirrored in \`.claude/skills/\`. Start with \`${code}\`.`,
      'Project artifacts live in `.wize/` of the target repository (`planning/`, `solutioning/`, `implementation/`, `knowledge/`, `security/`, `config/`).',
      `Update with \`npx wize-dev-kit@latest openbot sync\` (kit v${v}, key \`${key}\`). Sync rewrites this block and the skills carrying \`.wize-managed.json\`; text outside the block is never touched.`
    ],
    roster: 'Wize Dev Kit team (key: name, role): ',
    chain: 'Method handoff chain: ',
    chainRisk: 'risk', chainGate: 'trace, review and gate', chainStatus: 'status',
    artifacts: 'Project artifacts live in `.wize/` of the target repository (planning/, solutioning/, implementation/, knowledge/, security/, config/). Read the previous artifact before writing yours. Before writing any file, ask which repository is the target; never write into the agent workspace.',
    delegation: 'To delegate to another agent, use `openbot-cli run <agent> - --wait` with the task on standard input, when Local scripts is on for that agent (`<agent>` is the id or the name). The message carries: target repository, input artifact (path in `.wize/`), what to deliver and the done criterion.',
    identity: (n, key, code, v) => `You are ${n} (key \`${key}\`, skill \`${code}\`). Kit wize-dev-kit v${v}; persona and skills are refreshed by \`npx wize-dev-kit@latest openbot sync\`. Do not hand-edit the wize-* skills.`,
    scope: 'Acts only with a signed `.wize/security/scope.md` in the target repository. Without a scope it refuses and logs the refusal.'
  };
}

// ---- team ----------------------------------------------------------------

function loadPersonas(assets) {
  return assets.filter(a => a.kind === 'agent').map(a => {
    const yaml = fs.readFileSync(path.join(a.srcDir, 'agent.yaml'), 'utf-8');
    return {
      code: a.code,
      key: keyOf(a.code),
      name: a.name,
      title: a.title,
      module: (yaml.match(/^module:\s*(\S+)/m) || [])[1] || 'method',
      yamlSkills: readYamlList(yaml, 'skills'),
      summary: clipOneLine(a.description, 400),
      body: a.body
    };
  }).sort((x, y) => {
    const r = (c) => { const i = shared.AGENT_ORDER.indexOf(c); return i === -1 ? shared.AGENT_ORDER.length : i; };
    return r(x.code) - r(y.code) || x.code.localeCompare(y.code);
  });
}

const ownerOf = (a) => String(a.owner || '').trim().split(/\s+/)[0];

function selectSkills(persona, assets, { cap = LIMITS.skills } = {}) {
  const byCode = new Map(assets.map(a => [a.code, a]));
  const owned = assets
    .filter(a => a.kind !== 'agent' && ownerOf(a) === persona.code)
    .map(a => a.code).sort();
  const overlayExtra = persona.code === 'wize-sec-red-teamer'
    ? assets.filter(a => a.kind !== 'agent' && a.overlay === 'security').map(a => a.code).sort()
    : [];
  const isOrch = persona.code === 'wize-orchestrator';
  const wanted = [...new Set([
    persona.code,
    ...(isOrch ? ORCHESTRATOR_FIRST : []),
    ...persona.yamlSkills,
    ...owned,
    ...overlayExtra,
    ...TRANSVERSAL,
    ...(isOrch ? ORCHESTRATOR_ROUTING : [])
  ])];
  const dropped = [];
  const present = [];
  for (const code of wanted) {
    if (byCode.has(code)) present.push(code);
    else dropped.push({ code, reason: 'not active for these profiles' });
  }
  const keep = present.slice(0, cap);
  for (const code of present.slice(cap)) dropped.push({ code, reason: `over the ${cap}-skill cap` });
  return { skills: keep, dropped };
}

function buildTeam(kitRoot, { profiles = ['core'], lang = 'pt-BR', cap = LIMITS.skills } = {}) {
  const { profiles: active } = normalizeProfiles(profiles);
  const version = require(path.resolve(kitRoot, 'package.json')).version;
  const assets = shared.collectAssets(kitRoot, { profiles: active });
  const t = textsFor(lang);
  const all = loadPersonas(assets);
  const isActive = (p) => REQUIRED_MODULES.includes(p.module) || active.includes(p.module);
  const personas = all.filter(isActive);
  const inactive = all.filter(p => !isActive(p)).map(p => ({ code: p.code, key: p.key, name: p.name, title: p.title, module: p.module }));
  const nameOf = (code) => (personas.find(p => p.code === code) || {}).name;
  const names = (...codes) => codes.map(nameOf).filter(Boolean).join('/');

  const chain = [
    names('wize-agent-analyst'), names('wize-agent-pm'),
    names('wize-agent-ux-designer', 'wize-agent-solution-strategist'),
    names('wize-agent-architect'),
    `${names('wize-agent-test-architect')} (${t.chainRisk})`,
    names('wize-agent-dev'),
    `${names('wize-agent-test-architect')} (${t.chainGate})`,
    `${names('wize-agent-pm')} (${t.chainStatus})`
  ].filter(s => s && !/^\s*\(/.test(s));

  const rosterItems = personas.map(p => `${p.key}: ${p.name}, ${p.title}`);
  const common = [
    ...pack(t.roster, rosterItems),
    `${t.chain}${chain.join(' → ')}.`,
    t.artifacts,
    t.delegation
  ];

  for (const p of personas) {
    const sel = selectSkills(p, assets, { cap });
    p.skills = sel.skills;
    p.dropped = sel.dropped;
    p.rules = t.rules;
    p.soul = soulOf(p, t);
    p.description = descriptionOf(p, t);
    p.memories = [
      t.identity(p.name, p.key, p.code, version),
      ...common,
      ...(p.code === 'wize-sec-red-teamer' ? [t.scope] : [])
    ].map(m => safeTruncate(m, LIMITS.memory));
    p.block = agentsBlock(p, t, version);
  }
  return { version, lang, profiles: active, personas, inactive };
}

// "prefix a; b; c" packed into strings of at most `max` characters.
function pack(prefix, items, max = LIMITS.memory) {
  const out = [];
  let cur = '';
  for (const it of items) {
    const next = cur ? `${cur}; ${it}` : prefix + it;
    if (next.length > max - 1 && cur) { out.push(cur + '.'); cur = prefix + it; } else cur = next;
  }
  if (cur) out.push(cur + '.');
  return out;
}

function soulOf(p, t) {
  const body = (p.body || '').trim() || p.summary;
  return `${body}\n\n## ${t.rulesHeading}\n\n${t.rules.map(r => `- ${r}`).join('\n')}\n`;
}

// Persona summary + work rules + pointer to SOUL.md, at most 2000 characters.
// Only the summary is ever cut; the rules and the pointer always survive.
function descriptionOf(p, t) {
  const tail = `\n\n${t.rulesHeading}:\n${t.rules.map(r => `- ${r}`).join('\n')}\n\n${t.readSoul}`;
  const head = `${p.name}, ${p.title}. `;
  const room = LIMITS.description - tail.length - head.length;
  return head + safeTruncate(p.summary, Math.max(room, 40)) + tail;
}

const BLOCK_BEGIN = '<!-- wize-dev-kit:begin -->';
const BLOCK_END = '<!-- wize-dev-kit:end -->';

function agentsBlock(p, t, version) {
  return [
    BLOCK_BEGIN,
    `## Wize Dev Kit v${version}`,
    '',
    `${t.you(p.name, p.title)} ${clipOneLine(p.summary, 400)}`,
    '',
    `### ${t.rulesHeading}`,
    '',
    ...t.rules.map(r => `- ${r}`),
    '',
    `### ${t.kitHeading}`,
    '',
    ...t.kitLines(version, p.code, p.key).map(l => `- ${l}`),
    BLOCK_END
  ].join('\n');
}

// Pure. Returns { content, action } where action is created | appended |
// updated | unchanged | refused (one marker without the other).
function upsertKitBlock(content, block, heading) {
  if (content === null || content === undefined) {
    return { content: `${heading}\n\n${block}\n`, action: 'created' };
  }
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const b = block.replace(/\n/g, eol);
  const begin = content.indexOf(BLOCK_BEGIN);
  const end = content.indexOf(BLOCK_END);
  if (begin !== -1 || end !== -1) {
    if (begin === -1 || end === -1 || end < begin) return { content, action: 'refused' };
    const next = content.slice(0, begin) + b + content.slice(end + BLOCK_END.length);
    return { content: next, action: next === content ? 'unchanged' : 'updated' };
  }
  const base = content.endsWith(eol) || content === '' ? content : content + eol;
  return { content: `${base}${content === '' ? '' : eol}${b}${eol}`, action: 'appended' };
}

// ---- skills pool ---------------------------------------------------------

// Renders every active skill once, with the Anthropic SKILL.md emitter, so each
// agent folder is a copy of what the other harnesses get.
function renderSkillPool(kitRoot, dir, profiles) {
  shared.clearWriteGuard();
  shared.setProbeMode(false);
  shared.resetWriteStats();
  shared.renderAnthropicSkills(kitRoot, dir, { profiles });
  shared.resetWriteStats();
}

function listFiles(dir, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listFiles(dir, r));
    else if (e.isFile()) out.push(r);
  }
  return out.sort();
}

function copyTree(src, dst) {
  for (const f of listFiles(src)) {
    fs.mkdirSync(path.dirname(path.join(dst, f)), { recursive: true });
    fs.copyFileSync(path.join(src, f), path.join(dst, f));
    fs.chmodSync(path.join(dst, f), fs.statSync(path.join(src, f)).mode & 0o777);
  }
}

// ---- manifest ------------------------------------------------------------

function buildManifest(team, { exportedAt }) {
  return {
    format: 'openbot-agent-import',
    version: 1,
    source: { app: 'wize-dev-kit', appVersion: team.version, exportedAt },
    agents: team.personas.map(p => ({
      key: p.key,
      name: p.name,
      title: p.title,
      description: p.description,
      avatar: null,
      skills: p.skills.map(code => `agents/${p.key}/skills/${code}`),
      routines: [],
      memories: p.memories,
      files: `agents/${p.key}/files`
    }))
  };
}

// -> array of violation messages (empty when the tree is importable).
function validateManifest(m, root) {
  const errs = [];
  const bad = (msg) => errs.push(msg);
  if (!m || typeof m !== 'object') return ['manifest is not an object'];
  if (m.format !== 'openbot-agent-import') bad('format must be "openbot-agent-import"');
  if (m.version !== 1) bad('version must be 1');
  const src = m.source;
  if (!src || typeof src.app !== 'string' || !src.app || src.app.length > LIMITS.sourceString) bad(`source.app must be a string of 1 to ${LIMITS.sourceString} characters`);
  if (src && src.appVersion !== undefined && (typeof src.appVersion !== 'string' || src.appVersion.length > LIMITS.sourceString)) bad('source.appVersion must be a short string');
  if (!Array.isArray(m.agents) || m.agents.length === 0) return [...errs, 'agents must be a non-empty array'];

  const keys = new Set();
  for (const a of m.agents) {
    const id = `agent "${a && a.key}"`;
    if (!a || typeof a.key !== 'string' || a.key.length > LIMITS.key || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(a.key)) { bad(`${id}: key must be lowercase letters, digits and hyphens, at most ${LIMITS.key} characters, not starting or ending with a hyphen`); continue; }
    if (keys.has(a.key)) bad(`${id}: duplicate key`);
    keys.add(a.key);
    if (typeof a.name !== 'string' || !a.name || a.name.length > LIMITS.name) bad(`${id}: name must be 1 to ${LIMITS.name} characters`);
    if (a.title !== undefined && (typeof a.title !== 'string' || a.title.length > LIMITS.title)) bad(`${id}: title is over ${LIMITS.title} characters`);
    if (typeof a.description !== 'string' || !a.description || a.description.length > LIMITS.description) bad(`${id}: description must be 1 to ${LIMITS.description} characters (is ${(a.description || '').length})`);
    if (a.avatar !== null && a.avatar !== undefined) bad(`${id}: avatar must be null`);
    if (!Array.isArray(a.skills) || a.skills.length > LIMITS.skills) bad(`${id}: skills must be an array of at most ${LIMITS.skills}`);
    if (!Array.isArray(a.memories) || a.memories.length > LIMITS.memories) bad(`${id}: memories must be an array of at most ${LIMITS.memories}`);
    else a.memories.forEach((s, i) => { if (typeof s !== 'string' || !s || s.length > LIMITS.memory) bad(`${id}: memory ${i + 1} must be 1 to ${LIMITS.memory} characters`); });
    if (!Array.isArray(a.routines) || a.routines.length > LIMITS.routines) bad(`${id}: routines must be an array of at most ${LIMITS.routines}`);
    const prefix = `agents/${a.key}/`;
    if (a.files !== null && a.files !== `agents/${a.key}/files`) bad(`${id}: files must be "agents/${a.key}/files" or null`);
    if (a.files && !isDir(path.join(root, a.files))) bad(`${id}: files folder is missing`);
    const seen = new Set();
    for (const sp of Array.isArray(a.skills) ? a.skills : []) {
      if (typeof sp !== 'string' || !sp.startsWith(`${prefix}skills/`) || sp.includes('..') || sp.split('/').length !== 4) { bad(`${id}: skill path "${sp}" must be ${prefix}skills/<name>`); continue; }
      if (seen.has(sp)) bad(`${id}: skill "${sp}" listed twice`);
      seen.add(sp);
      const dir = path.join(root, sp);
      const skillMd = path.join(dir, 'SKILL.md');
      if (!fs.existsSync(skillMd)) { bad(`${id}: ${sp} has no SKILL.md`); continue; }
      const fm = readFrontmatter(fs.readFileSync(skillMd, 'utf-8'));
      if (!fm.name || fm.name.length > LIMITS.skillName) bad(`${id}: ${sp}/SKILL.md frontmatter name must be 1 to ${LIMITS.skillName} characters`);
      if (!fm.description) bad(`${id}: ${sp}/SKILL.md has no frontmatter description`);
      const files = listFiles(dir);
      if (files.length > LIMITS.skillFiles) bad(`${id}: ${sp} has ${files.length} files; the limit is ${LIMITS.skillFiles}`);
      const bytes = files.reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
      if (bytes > LIMITS.skillBytes) bad(`${id}: ${sp} is ${bytes} bytes; the limit is ${LIMITS.skillBytes}`);
    }
  }

  const all = listFiles(root);
  if (all.length > LIMITS.archiveFiles) bad(`archive has ${all.length} files; the limit is ${LIMITS.archiveFiles}`);
  for (const f of all) {
    const parts = f.split('/');
    const base = parts[parts.length - 1];
    if (/^\.env/i.test(base) || /private.*key/i.test(base)) bad(`forbidden file name: ${f}`);
    if (ARCHIVE_RE.test(base)) bad(`nested archive: ${f}`);
    if (parts.slice(0, -1).some(p => FORBIDDEN_DIRS.has(p))) bad(`forbidden folder in: ${f}`);
  }
  return errs;
}

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

module.exports = {
  MARKER, markerContent, LIMITS, KNOWN_PROFILES, REQUIRED_MODULES, TRANSVERSAL,
  BLOCK_BEGIN, BLOCK_END,
  normalizeProfiles, keyOf, readYamlList, safeTruncate, textsFor,
  buildTeam, selectSkills, descriptionOf, agentsBlock, upsertKitBlock,
  renderSkillPool, listFiles, copyTree, buildManifest, validateManifest
};
