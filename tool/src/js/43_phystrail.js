// =====================================================================
//  升空尾缀 · 物理（花型 physS / physM / physL）
//  移植自 analysis/scripts/trail_phys.py（原理见 analysis/升空尾缀_物理.md），在「地面坐标」里实时模拟：
//  弹体按二次阻力弹道减速上升；曲导一路向后喷三层——火粉（极密、极短命 → 星头后的连续白热段）、
//  金火星（木炭，对数正态寿命，出喷口很热、离开燃气后降到空气中的燃烧温度，快烧完才变暗变橙，闪烁）、落火（少量大颗）。
//  火星出生后受线性阻力、重力、风、随高度变化的冻结湍流 → 尾迹停在空中、顺风漂、波浪一喷出就冻住。
//  镜头跟着星头（侧面正交），实拍面板按同一比例逐帧跟拍，两边一样大。
//  星头 = 泪滴形燃气焰（沿弹道速度方向的一串点），不是长条面片。
//  贴图导出仍用 analysis/scripts/trail_phys_bake.py（这里只做实时模拟，给审阅用）。
// =====================================================================
const PHYS_MPP = 0.4545;               // 参考视频的画面比例（m/像素）：曝光 phE 是按这个比例标定的
const PHYS_SHUTTER = 1 / 50;
// 黑体：610 / 550 / 465 nm 三个波长的普朗克辐射（6500 K 归一为白）→ 亮度查表
const PHYS_LUM = (() => {
  const lam = [610e-9, 550e-9, 465e-9], w = [0.2126, 0.7152, 0.0722];
  const pl = (T, l) => 1 / (Math.pow(l, 5) * (Math.exp(1.4388e-2 / (l * Math.max(T, 300))) - 1));
  const ref = lam.map(l => pl(6500, l)), lut = new Float32Array(401);
  for (let i = 0; i <= 400; i++) { const T = 300 + i * 10; lut[i] = lam.reduce((s, l, j) => s + w[j] * pl(T, l) / ref[j], 0); }
  return lut;
})();
function physLum(T) { const x = clamp((T - 300) / 10, 0, 399.999), i = Math.floor(x), f = x - i; return PHYS_LUM[i] * (1 - f) + PHYS_LUM[i + 1] * f; }
const PHYS_LUM_REF = physLum(2350);

function physModes(lam, n, ampExp, seed) {
  const r = new RNG(seed), l0 = Math.log(lam[0]), l1 = Math.log(lam[lam.length - 1]), L = [], a = [], ph = [];
  for (let i = 0; i < n; i++) { const Li = Math.exp(n > 1 ? l0 + (l1 - l0) * i / (n - 1) : l0); L.push(Li); a.push(Math.pow(Li, ampExp)); ph.push(r.u() * 2 * Math.PI); }
  const s = Math.sqrt(0.5 * a.reduce((q, x) => q + x * x, 0)) || 1;
  return { L, a: a.map(x => x / s), ph };
}

class PhysTrail {
  constructor(P) {
    this.P = P; const sd = P.seed | 0;
    this.wm = [0, 1].map(ax => physModes(P.phWobL, P.phWobL.length, 0, sd * 13 + 1 + 7 * ax));
    this.tm = [0, 1].map(ax => physModes(P.phTurbL, 9, 1 / 3, sd * 17 + 3 + 11 * ax));
    const k = P.phK, v0 = P.phV0; this.ba = Math.atan(v0 * Math.sqrt(k / G)); this.bw = Math.sqrt(G * k); this.bcos = Math.cos(this.ba);
    this.pops = ['A', 'B', 'C'].map((c, i) => this.emit(c, i));
    this.total = this.pops.reduce((s, q) => s + q.n, 0);
  }
  wob(z, ax, d) { const m = this.wm[ax]; let s = 0; for (let i = 0; i < m.L.length; i++) { const kk = 2 * Math.PI / m.L[i]; s += d ? m.a[i] * kk * Math.cos(kk * z + m.ph[i]) : m.a[i] * Math.sin(kk * z + m.ph[i]); } return this.P.phWob * s; }
  turb(z, ax) { const m = this.tm[ax]; let s = 0; for (let i = 0; i < m.L.length; i++) s += m.a[i] * Math.sin(2 * Math.PI * z / m.L[i] + m.ph[i]); return this.P.phTurb * s; }
  // 飞行时刻 s → 位置、速度（三维，z 向上）
  shell(s) {
    const P = this.P, k = P.phK, ph = this.ba - this.bw * s, vt = Math.sqrt(G / k);
    // 二次阻力竖直弹道：上升段 v = vt·tan φ、z = ln(cos φ / cos φ0) / k；过顶后（φ < 0）是下落段 v = −vt·tanh ψ、z = 顶点 − ln(cosh ψ) / k（ψ = −φ）。
    // 4.3.2（渲染基础问题 E11③）：以前过顶后照用 tan（还夹在 −1.5），下落速度会一直涨到终端速度的 14 倍；现在的预设都在顶点前开花，碰不到
    const z = ph >= 0 ? Math.log(Math.cos(Math.min(ph, 1.5)) / this.bcos) / k : (Math.log(1 / this.bcos) - Math.log(Math.cosh(Math.min(-ph, 20)))) / k;
    const vz = ph >= 0 ? vt * Math.tan(Math.min(ph, 1.5)) : -vt * Math.tanh(-ph), la = P.phLeanA, lb = P.phLeanB;
    return { x: la * z + lb * z * z + this.wob(z, 0), y: this.wob(z, 1), z, vx: (la + 2 * lb * z + this.wob(z, 0, true)) * vz, vy: this.wob(z, 1, true) * vz, vz };
  }
  emit(c, pi) {
    const P = this.P, g = k => P['ph' + c + k], rate = g('Rate'), puff = Math.max(1, g('Puff')), T = P.phT;
    const r = new RNG((P.seed | 0) * 101 + pi * 7 + 1), nPuff = Math.max(0, Math.round(rate / puff * T));
    const rows = [];
    for (let ip = 0; ip < nPuff; ip++) {
      const tp = (ip + r.u()) / nPuff * T, m = puff > 1 ? Math.max(1, r.poisson(puff)) : 1, dqp = [r.n() * 0.7, r.n() * 0.7];
      for (let j = 0; j < m; j++) {
        const tb = tp + (puff > 1 ? r.u() * 0.012 : 0); if (tb >= T) continue;
        const lnz = clamp(r.n(), -3, 3), life = g('Life') * Math.exp(g('Lsig') * lnz), size = Math.exp(0.5 * g('Lsig') * lnz);
        const s = this.shell(tb), sp = Math.hypot(s.vx, s.vy, s.vz) || 1, ux = s.vx / sp, uy = s.vy / sp, uz = s.vz / sp;
        // 与速度垂直的两个方向：e1 = u × (0,1,0)，e2 = u × e1
        let e1x = -uz, e1z = ux; const n1 = Math.hypot(e1x, e1z) || 1; e1x /= n1; e1z /= n1;
        const e2x = uy * e1z, e2y = uz * e1x - ux * e1z, e2z = -uy * e1x;
        const jet = g('Jet') * (0.75 + 0.5 * r.u()), ang = 2 * Math.PI * P.phSpinF * tb, ca = Math.cos(ang), sa = Math.sin(ang);
        const d1 = dqp[0] + r.n() * 0.7, d2 = dqp[1] + r.n() * 0.7, cone = g('Cone'), am = P.phSpinA;
        const vx = s.vx - jet * ux + cone * (d1 * e1x + d2 * e2x) + am * (ca * e1x + sa * e2x);
        const vz = s.vz - jet * uz + cone * (d1 * e1z + d2 * e2z) + am * (ca * e1z + sa * e2z);
        const air = P.phWind + this.turb(s.z, 0) + r.n() * P.phJit;
        rows.push([tb, s.x, s.z, vx, vz, g('Kd') / size, air, life, size,
          g('T0') + r.n() * 60, g('Tb') + r.n() * 40, g('Tc'), g('Tend'), g('Pt'), g('Pm'), g('I'), g('Tw'), 7 + 9 * r.u(), r.u() * 6.28]);
      }
    }
    rows.sort((a, b) => a[0] - b[0]);
    const n = rows.length, F = 19, d = new Float32Array(n * F); let maxLife = 0;
    rows.forEach((q, i) => { d.set(q, i * F); if (q[7] > maxLife) maxLife = q[7]; });
    return { n, d, F, maxLife, R: g('R') };
  }
  // 飞行时刻 t 的全部火星写进 buf（x, z, 亮度, 发光直径）
  gather(t, buf, cap) {
    let k = 0;
    for (const q of this.pops) {
      const d = q.d, F = q.F; let lo = 0, hi = q.n; const t0 = t - q.maxLife - 0.02;
      while (lo < hi) { const m = (lo + hi) >> 1; if (d[m * F] < t0) lo = m + 1; else hi = m; }
      for (let i = lo; i < q.n; i++) {
        const o = i * F, a = t - d[o]; if (a < 0) break;
        const life = d[o + 7]; if (a >= life) continue;
        const kd = d[o + 5], e = Math.exp(-kd * a), s1 = (1 - e) / kd, vtx = d[o + 6], vtz = -G / kd;
        const x = d[o + 1] + vtx * a + (d[o + 3] - vtx) * s1, z = d[o + 2] + vtz * a + (d[o + 4] - vtz) * s1;
        const u = a / life, Tb = d[o + 10];
        const T = Tb + (d[o + 9] - Tb) * Math.exp(-a / d[o + 11]) - (Tb - d[o + 12]) * Math.pow(u, d[o + 13]);
        const tw = 1 + d[o + 16] * Math.sin(d[o + 17] * a * 6.283 + d[o + 18]) * Math.sin(d[o + 17] * 0.37 * a * 6.283 + 1.3 * d[o + 18]);
        const size = d[o + 8], I = d[o + 15] * size * size * Math.pow(Math.max(0, 1 - u), d[o + 14]) * Math.min(1, a / 0.03) * tw * physLum(T) / PHYS_LUM_REF;
        if (I <= 0 || k >= cap) continue;
        buf[k * 4] = x; buf[k * 4 + 1] = z; buf[k * 4 + 2] = I; buf[k * 4 + 3] = 2 * q.R * size; k++;
      }
    }
    return k;
  }
  // 星头燃气焰：沿速度反方向一串点（泪滴：头部最亮、向后变细变暗）
  flame(t, buf) {
    const P = this.P; if (t < 0 || t > P.phT) return 0;
    const s = this.shell(t), sp = Math.hypot(s.vx, s.vz) || 1, ux = s.vx / sp, uz = s.vz / sp, L = P.phFlL0 + P.phFlLv * sp, n = 48;
    const fl = 1 + 0.12 * Math.sin(t * 37) * Math.sin(t * 11.3 + 0.7); let ws = 0; const w = [];
    for (let i = 0; i < n; i++) { const q = (i + 0.5) / n, v = Math.exp(-3 * q) * (1 - Math.exp(-q * 18)); w.push(v); ws += v; }
    for (let i = 0; i < n; i++) {
      const q = (i + 0.5) / n;
      buf[i * 4] = s.x - ux * q * L; buf[i * 4 + 1] = s.z - uz * q * L; buf[i * 4 + 2] = w[i] / ws * P.phFlI * fl; buf[i * 4 + 3] = 2 * P.phFlW * (0.55 + 0.9 * q);
    }
    return n;
  }
  head(t) { return this.shell(clamp(t, 0, this.P.phT)); }
}

function physOf(slot, P) { if (!slot.phys || slot.phys.P !== P) slot.phys = new PhysTrail(P); return slot.phys; }
// 镜头：跟着星头（开花后停在开花点），星头在画面离顶 phHead 处
function physView(P, slot, t) {
  const h = P.phView / 2, s = physOf(slot, P).head(t);
  return [s.x, s.z - h * (1 - 2 * P.phHead), h, h];
}
function drawPhysTrail(slot, P, t, view, ppm) {
  const pt = physOf(slot, P), nsub = 4; let n = 0;
  for (let j = 0; j < nsub; j++) {
    const ts = t + ((j + 0.5) / nsub - 0.5) * PHYS_SHUTTER;
    n = pt.gather(ts, bufT, bufT.length / 4); drawPoints(bufT, n, view, ppm, [0, 1, 0, 0], 1 / nsub);
    const nf = pt.flame(ts, bufH); if (nf) drawPoints(bufH, nf, view, ppm, [1, 0, 0, 0], 1 / nsub);
  }
  return { stars: 1, sparks: n };
}
// 占位「烘焙」：物理尾缀只做实时模拟；曝光按参考视频标定（phE 是 0.4545 m/像素下的相机曝光）
function physBake(P) {
  const e = P.phE * PHYS_MPP * PHYS_MPP / 4 * (P.phExpo || 1);
  return { form: 'phys', P, head: { dispose() { } }, meta: { expoH: e, expoT: e, L: { cols: 1, rows: 1, F: 1, chans: 1, cellW: 1, cellH: 1 }, duration: P.duration } };
}
function physStats(P) {
  const pt = new PhysTrail(P), ta = pt.ba / pt.bw;     // 到顶时刻（二次阻力）
  // 4.3.2（H15②）：开花时刻晚于到顶时给提示（过顶后按下落段算，星头在往下掉时开花）
  const late = P.phT > ta + 0.05 ? ` · <span class="warn">开花晚于到顶 ${(P.phT - ta).toFixed(2)} s（${ta.toFixed(2)} s 到顶，之后星头在往下掉）</span>` : ` · ${ta.toFixed(2)} s 到顶`;
  return `升空尾缀 · 物理（实时模拟）· 出膛 <b>${P.phV0}</b> m/s · 开花 <b>${P.phT}</b> s${late} · 火花 <b>${pt.total.toLocaleString()}</b> 颗<br>` +
    `镜头跟着星头，视野 ${P.phView} m；实拍面板按同一比例跟拍。贴图导出：<code>analysis/scripts/trail_phys_bake.py</code>`;
}
// 实拍面板跟拍：星头在视频里的位置（按视频高度归一化）→ 和模拟画面同一比例、同一取景
function physRefMeta(vm, P) {
  const f = vm.follow, slot = liveSlot('A'); if (!f || !isPhys(P)) return vm;
  const v = physView(P, slot, state.t), k = 1 / (f.mpp * f.H);
  // layoutRef 的 cx 按视频宽度归一化、cy / half 按高度；launch 是按高度归一化的像素位置
  return { ...vm, cx: (f.launch[0] + v[0] * k) / f.aspect, cy: f.launch[1] - v[1] * k, half: v[3] * k };
}
