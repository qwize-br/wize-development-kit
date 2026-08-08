'use strict';

// generate-scope.js — creates a valid .wize/security/scope.md from CLI args.
// Zero-dep. Computes scope_sha256 from the body (including the leading newline
// separator, matching parseScope's convention).

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function parseArgv(argv) {
  const out = { url: null, hosts: [], paths: [], acceptedBy: null, outPath: null };
  for (let i = 0; i < (argv || []).length; i++) {
    const a = argv[i];
    if (a === '--url' && argv[i + 1]) { out.url = argv[i + 1]; i++; }
    else if (a.startsWith('--url=')) out.url = a.slice('--url='.length);
    else if (a === '--hosts' && argv[i + 1]) { out.hosts = argv[i + 1].split(',').map(s => s.trim()).filter(Boolean); i++; }
    else if (a.startsWith('--hosts=')) out.hosts = a.slice('--hosts='.length).split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--paths' && argv[i + 1]) { out.paths = argv[i + 1].split(',').map(s => s.trim()).filter(Boolean); i++; }
    else if (a.startsWith('--paths=')) out.paths = a.slice('--paths='.length).split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--accepted-by' && argv[i + 1]) { out.acceptedBy = argv[i + 1]; i++; }
    else if (a.startsWith('--accepted-by=')) out.acceptedBy = a.slice('--accepted-by='.length);
    else if (a === '--out' && argv[i + 1]) { out.outPath = argv[i + 1]; i++; }
    else if (a.startsWith('--out=')) out.outPath = a.slice('--out='.length);
  }
  if (!out.outPath) out.outPath = path.join(process.cwd(), '.wize', 'security', 'scope.md');
  return out;
}

function buildBody({ url, hosts, paths }) {
  const lines = [];

  lines.push('## allowlist');

  lines.push('hosts:');
  for (const h of hosts) lines.push(`  - ${h}`);

  lines.push('urls:');
  if (url) lines.push(`  - ${url.replace(/\/+$/, '')}/`);

  lines.push('paths:');
  if (paths.length > 0) {
    for (const p of paths) lines.push(`  - ${p}`);
  } else {
    lines.push('  - /');
  }

  lines.push('');
  lines.push('## dast_target');
  if (url) lines.push(`url: ${url}`);
  lines.push('');
  lines.push('## notes');
  lines.push(`Scope gerado por wize-sec-scope em ${new Date().toISOString()}.`);
  lines.push('');

  return lines.join('\n');
}

function generateScope({ url, hosts, paths, acceptedBy, outPath }) {
  const body = buildBody({ url, hosts, paths });

  // The hash is computed on the body as parseScope returns it: with the
  // leading newline separator between the closing --- and the body.
  const signedBody = '\n' + body;
  const scopeSha256 = crypto.createHash('sha256').update(signedBody, 'utf8').digest('hex');
  const acceptedAt = new Date().toISOString();

  const fm = [
    `accepted_by: ${acceptedBy || 'unknown'}`,
    `accepted_at: ${acceptedAt}`,
    `scope_sha256: ${scopeSha256}`
  ].join('\n');

  const content = `---\n${fm}\n---\n${signedBody}`;

  const dir = path.dirname(outPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, content, 'utf8');

  return { path: outPath, sha256: scopeSha256, acceptedBy, acceptedAt };
}

function main() {
  const args = parseArgv(process.argv.slice(2));

  if (!args.url) {
    console.error('✖ --url é obrigatório (ex: --url=http://localhost:8080)');
    process.exit(2);
  }
  if (!args.acceptedBy) {
    console.error('✖ --accepted-by é obrigatório (ex: --accepted-by="Seu Nome")');
    process.exit(2);
  }

  const result = generateScope(args);
  console.log(`✓ scope.md gerado em ${result.path}`);
  console.log(`  SHA-256: ${result.sha256}`);
  console.log(`  aceite por: ${result.acceptedBy}`);
  console.log(`  aceite em: ${result.acceptedAt}`);
}

if (require.main === module) {
  main();
}

module.exports = { generateScope, buildBody, parseArgv };
