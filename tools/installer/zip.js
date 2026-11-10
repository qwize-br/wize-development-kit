// Minimal ZIP writer (no dependencies): local headers + central directory +
// end record, UTF-8 names, deflate or stored per file. No zip64: it refuses
// more than 65535 entries and any size or offset of 4 GB or more, so a reader
// never meets an archive it cannot parse. Node 20 has no zlib.crc32, so the
// CRC-32 table lives here.

'use strict';

const fs = require('node:fs');
const zlib = require('node:zlib');

const MAX_ENTRIES = 0xFFFF;
const MAX_U32 = 0xFFFFFFFF;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(date) {
  const y = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((y - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function checkName(name, seen) {
  if (typeof name !== 'string' || !name) throw new Error('zip: empty entry name');
  if (name.startsWith('/') || name.includes('\\') || name.split('/').some(p => p === '..' || p === '')) {
    throw new Error(`zip: unsafe entry name "${name}"`);
  }
  if (Buffer.byteLength(name) > MAX_ENTRIES) throw new Error(`zip: entry name too long "${name.slice(0, 40)}..."`);
  if (seen.has(name)) throw new Error(`zip: duplicate entry "${name}"`);
  seen.add(name);
}

// entries: [{ name, data?: Buffer, file?: string, mode?: number }]. A `file`
// entry is read when its turn comes, so memory stays at one file at a time.
function writeZip(dest, entries, { mtime = new Date() } = {}) {
  if (entries.length > MAX_ENTRIES) throw new Error(`zip: ${entries.length} entries; the limit is ${MAX_ENTRIES}`);
  const { time, date } = dosDateTime(mtime);
  const seen = new Set();
  const central = [];
  // 'wx': never follow a symlink or reuse a path that already exists.
  const fd = fs.openSync(dest, 'wx');
  let offset = 0;
  const put = (buf) => {
    fs.writeSync(fd, buf, 0, buf.length);
    offset += buf.length;
  };
  try {
    for (const e of entries) {
      checkName(e.name, seen);
      let mode = e.mode;
      let data = e.data;
      if (!data) {
        const st = fs.statSync(e.file);
        if (st.size >= MAX_U32) throw new Error(`zip: "${e.name}" is 4 GB or larger`);
        if (mode === undefined) mode = st.mode & 0o777;
        data = fs.readFileSync(e.file);
      }
      if (data.length >= MAX_U32) throw new Error(`zip: "${e.name}" is 4 GB or larger`);
      const deflated = zlib.deflateRawSync(data, { level: 9 });
      const useDeflate = deflated.length < data.length;
      const body = useDeflate ? deflated : data;
      const method = useDeflate ? 8 : 0;
      const crc = crc32(data);
      const name = Buffer.from(e.name, 'utf-8');
      if (offset >= MAX_U32) throw new Error('zip: archive is 4 GB or larger');
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x0800, 6);
      local.writeUInt16LE(method, 8);
      local.writeUInt16LE(time, 10);
      local.writeUInt16LE(date, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(body.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(name.length, 26);
      central.push({ name, method, crc, csize: body.length, usize: data.length, offset, mode: mode === undefined ? 0o644 : mode });
      put(local); put(name); put(body);
    }
    const cdStart = offset;
    for (const c of central) {
      const h = Buffer.alloc(46);
      h.writeUInt32LE(0x02014b50, 0);
      h.writeUInt16LE((3 << 8) | 20, 4);
      h.writeUInt16LE(20, 6);
      h.writeUInt16LE(0x0800, 8);
      h.writeUInt16LE(c.method, 10);
      h.writeUInt16LE(time, 12);
      h.writeUInt16LE(date, 14);
      h.writeUInt32LE(c.crc, 16);
      h.writeUInt32LE(c.csize, 20);
      h.writeUInt32LE(c.usize, 24);
      h.writeUInt16LE(c.name.length, 28);
      h.writeUInt32LE(((0o100000 | (c.mode & 0o777)) << 16) >>> 0, 38);
      h.writeUInt32LE(c.offset, 42);
      put(h); put(c.name);
    }
    const cdSize = offset - cdStart;
    if (offset >= MAX_U32) throw new Error('zip: archive is 4 GB or larger');
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(central.length, 8);
    end.writeUInt16LE(central.length, 10);
    end.writeUInt32LE(cdSize, 12);
    end.writeUInt32LE(cdStart, 16);
    put(end);
  } catch (err) {
    try { fs.closeSync(fd); } catch { /* already closed */ }
    fs.rmSync(dest, { force: true }); // safe: this call created dest with 'wx'
    throw err;
  }
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  return { entries: central.length, bytes: offset };
}

module.exports = { writeZip, crc32, MAX_ENTRIES };
