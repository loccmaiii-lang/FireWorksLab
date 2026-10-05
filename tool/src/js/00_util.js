// =====================================================================
//  工具
// =====================================================================
const $ = s => document.querySelector(s);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const G = 9.81;
const H_STEP = 1 / 480;                 // 物理步长
const PREVIEW_SCALE = 1;
const PREVIEW_LIB_N = 1024;
const nextTick = () => new Promise(r => setTimeout(r, 0));
function hexToLin(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// 状态放在对象上（不放闭包里），模拟才能做快照（实时模拟倒回时从快照接着算，不从 0 重算；4.1.2）。序列和 mulberry32 逐位相同。
class RNG {
  constructor(seed) { this.a = (Math.imul(seed | 0, 2654435761) ^ 0x9E3779B9) >>> 0; this.spare = null; for (let i = 0; i < 8; i++) this.r(); }
  r() { const a = this.a = (this.a | 0) + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  u() { return this.r(); }
  n() {
    if (this.spare !== null) { const s = this.spare; this.spare = null; return s; }
    let u, v, s; do { u = this.r() * 2 - 1; v = this.r() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const m = Math.sqrt(-2 * Math.log(s) / s); this.spare = v * m; return u * m;
  }
  poisson(l) { if (l <= 0) return 0; let k = 0, p = Math.exp(-l), s = p; const u = this.r(); while (u > s && k < 60) { k++; p *= l / k; s += p; } return k; }
}
function randRot(rng) {
  const a = rng.u() * 6.2832, b = rng.u() * 6.2832, c = rng.u() * 6.2832;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  // Rz(a) * Rx(b) * Ry(c)
  const Rz = [ca, -sa, 0, sa, ca, 0, 0, 0, 1], Rx = [1, 0, 0, 0, cb, -sb, 0, sb, cb], Ry = [cc, 0, sc, 0, 1, 0, -sc, 0, cc];
  const mul = (A, B) => { const o = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return o; };
  return mul(mul(Rz, Rx), Ry);
}
function fibDirs(n, rng, R, jitDeg) {
  const out = [], GA = Math.PI * (3 - Math.sqrt(5)), j = jitDeg * Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(Math.max(0, 1 - y * y)), th = i * GA;
    let x = Math.cos(th) * r, z = Math.sin(th) * r, yy = y;
    let X = R[0] * x + R[1] * yy + R[2] * z, Y = R[3] * x + R[4] * yy + R[5] * z, Z = R[6] * x + R[7] * yy + R[8] * z;
    X += rng.n() * j; Y += rng.n() * j; Z += rng.n() * j;
    const l = Math.hypot(X, Y, Z) || 1; out.push([X / l, Y / l, Z / l]);
  }
  return out;
}
function randUnit(rng) { const x = rng.n(), y = rng.n(), z = rng.n(), l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }
// 4.5.8（19-C02）：显示强度 / 亮度倍数没填才算 1；填 0 就是 0（以前导出写 `|| 1`，预览是 0、导出变 1）
const intOr1 = v => v == null || v === '' || !Number.isFinite(+v) ? 1 : +v;
