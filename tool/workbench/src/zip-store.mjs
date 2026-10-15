// 最小 ZIP 写入（只存储不压缩，文件名 UTF-8）。16.0.40 灯光交付包用；浏览器和 Node 都能跑。
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(bytes) { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function dosTime(d) {
  return {time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()};
}
// files: {相对路径: 字符串或 Uint8Array}；folder: 包内顶层目录名（可空）
export function zipStore(files, {folder = '', now = new Date()} = {}) {
  const enc = new TextEncoder(), {time, date} = dosTime(now), locals = [], centrals = [];
  let offset = 0;
  for (const [name, body] of Object.entries(files)) {
    const path = enc.encode((folder ? folder + '/' : '') + name), data = typeof body === 'string' ? enc.encode(body) : body, crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, path.length, 2], [28, 0, 2]]
      .forEach(([o, v, n]) => (n === 4 ? head.setUint32(o, v, true) : head.setUint16(o, v, true)));
    const cen = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, path.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, offset, 4]]
      .forEach(([o, v, n]) => (n === 4 ? cen.setUint32(o, v, true) : cen.setUint16(o, v, true)));
    locals.push(new Uint8Array(head.buffer), path, data);
    centrals.push(new Uint8Array(cen.buffer), path);
    offset += 30 + path.length + data.length;
  }
  const cenSize = centrals.reduce((n, b) => n + b.length, 0), end = new DataView(new ArrayBuffer(22)), count = Object.keys(files).length;
  [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, count, 2], [10, count, 2], [12, cenSize, 4], [16, offset, 4], [20, 0, 2]]
    .forEach(([o, v, n]) => (n === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true)));
  const parts = [...locals, ...centrals, new Uint8Array(end.buffer)], out = new Uint8Array(parts.reduce((n, b) => n + b.length, 0));
  let p = 0; for (const b of parts) { out.set(b, p); p += b.length; }
  return out;
}
