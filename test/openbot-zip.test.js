// Zip writer: round-trip through our own parser (CRCs, names, central
// directory, UTF-8 flag) and through `unzip -t` when the binary exists.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');

const { writeZip, crc32, MAX_ENTRIES } = require('../tools/installer/zip.js');

// Reads a zip by its central directory and verifies every entry.
function readZip(file) {
  const buf = fs.readFileSync(file);
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(eocd >= 0, 'end of central directory record');
  const total = buf.readUInt16LE(eocd + 10);
  assert.strictEqual(buf.readUInt16LE(eocd + 8), total);
  assert.strictEqual(eocd + 22, buf.length, 'no trailing bytes');
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let i = 0; i < total; i++) {
    assert.strictEqual(buf.readUInt32LE(p), 0x02014b50);
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28);
    const attrs = buf.readUInt32LE(p + 38);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nlen).toString('utf-8');
    assert.ok(flags & 0x0800, `${name}: UTF-8 flag`);
    assert.strictEqual(buf.readUInt32LE(lho), 0x04034b50);
    assert.strictEqual(buf.readUInt32LE(lho + 14), crc, `${name}: local CRC matches central`);
    const dataStart = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const raw = buf.slice(dataStart, dataStart + csize);
    const data = method === 8 ? zlib.inflateRawSync(raw) : raw;
    assert.ok(method === 0 || method === 8);
    assert.strictEqual(data.length, usize, `${name}: size`);
    assert.strictEqual(crc32(data), crc, `${name}: CRC`);
    out.set(name, { data, mode: (attrs >>> 16) & 0o777 });
    p += 46 + nlen;
  }
  return out;
}

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wize-zip-'));

test('crc32 matches the standard check value', () => {
  assert.strictEqual(crc32(Buffer.from('123456789')), 0xCBF43926);
  assert.strictEqual(crc32(Buffer.alloc(0)), 0);
});

test('zip round-trips names, contents, modes and CRCs', () => {
  const dir = tmp();
  const src = path.join(dir, 'run.sh');
  fs.writeFileSync(src, '#!/bin/sh\necho hi\n', { mode: 0o755 });
  const random = require('node:crypto').randomBytes(4096);
  const dest = path.join(dir, 'a.zip');
  const r = writeZip(dest, [
    { name: 'openbot-import.json', data: Buffer.from('{"a":1}') },
    { name: 'agents/dev/files/SOUL.md', data: Buffer.from('persona '.repeat(500)) },
    { name: 'agents/dev/skills/ação-ü/SKILL.md', data: Buffer.from('acentuação') },
    { name: 'empty.txt', data: Buffer.alloc(0) },
    { name: 'random.bin', data: random },
    { name: 'tools/run.sh', file: src }
  ]);
  assert.strictEqual(r.entries, 6);
  const z = readZip(dest);
  assert.deepStrictEqual([...z.keys()], [
    'openbot-import.json', 'agents/dev/files/SOUL.md', 'agents/dev/skills/ação-ü/SKILL.md', 'empty.txt', 'random.bin', 'tools/run.sh'
  ]);
  assert.strictEqual(z.get('agents/dev/files/SOUL.md').data.toString(), 'persona '.repeat(500));
  assert.strictEqual(z.get('agents/dev/skills/ação-ü/SKILL.md').data.toString(), 'acentuação');
  assert.ok(z.get('random.bin').data.equals(random));
  assert.strictEqual(z.get('empty.txt').data.length, 0);
  assert.strictEqual(z.get('tools/run.sh').mode, 0o755);
  assert.strictEqual(z.get('openbot-import.json').mode, 0o644);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('zip passes unzip -t when the binary exists', (t) => {
  const has = spawnSync('unzip', ['-v'], { stdio: 'ignore' });
  if (has.error) return t.skip('unzip not installed');
  const dir = tmp();
  const dest = path.join(dir, 'b.zip');
  writeZip(dest, [
    { name: 'x/one.txt', data: Buffer.from('one '.repeat(300)) },
    { name: 'x/ção.txt', data: Buffer.from('dois') }
  ]);
  const r = spawnSync('unzip', ['-t', dest], { encoding: 'utf-8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /No errors detected/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('zip refuses unsafe or duplicate names and too many entries', () => {
  const dir = tmp();
  const dest = path.join(dir, 'c.zip');
  const d = Buffer.from('x');
  for (const name of ['/abs.txt', '../up.txt', 'a/../b.txt', 'a\\b.txt', '', 'a//b.txt']) {
    assert.throws(() => writeZip(dest, [{ name, data: d }]), /zip:/, name);
  }
  assert.throws(() => writeZip(dest, [{ name: 'a', data: d }, { name: 'a', data: d }]), /duplicate/);
  const many = Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => ({ name: `f${i}`, data: d }));
  assert.throws(() => writeZip(dest, many), /65535/);
  assert.ok(!fs.existsSync(dest), 'a refused archive leaves no file behind');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('zip refuses an existing path or a symlink at the destination and never writes through it', () => {
  const dir = tmp();
  const victim = path.join(dir, 'victim.txt');
  fs.writeFileSync(victim, 'keep me');
  const link = path.join(dir, 'd.zip.part');
  fs.symlinkSync(victim, link);
  assert.throws(() => writeZip(link, [{ name: 'a', data: Buffer.from('x') }]), /EEXIST/);
  assert.strictEqual(fs.readFileSync(victim, 'utf-8'), 'keep me');
  assert.ok(fs.lstatSync(link).isSymbolicLink(), 'the foreign path is left as it was');
  const taken = path.join(dir, 'taken.zip');
  fs.writeFileSync(taken, 'mine');
  assert.throws(() => writeZip(taken, [{ name: 'a', data: Buffer.from('x') }]), /EEXIST/);
  assert.strictEqual(fs.readFileSync(taken, 'utf-8'), 'mine');
  fs.rmSync(dir, { recursive: true, force: true });
});
