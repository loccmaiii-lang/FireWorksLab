// =====================================================================
//  升空尾缀 · 物理粒子 × V5 游戏素材形式（T5，2026-09-30）
//  用户：物理尾缀（physS/M/L）的物理好多了，但镜头是实拍跟拍，不是正式游戏素材的视角。
//  这里把物理模型的粒子行为（43_phystrail.js / trail_phys.py）放进 V5 的弹体随体坐标：
//    镜头、产物、导出全部沿用 V5（星头固定在面片上端、16×1 格、上升循环 + 30 / 20 fps 消散、Size By Life、接力、cascade.json）；
//    粒子换成物理：三层喷出物（火粉 → 连续白热段；木炭金火星：对数正态寿命、出喷口 T0 很热 → tc 秒降到空气中燃烧温度 Tb → 快烧完才暗；
//    落火），向后喷出 + 线性阻力 + 重力 + 风 + 冻结湍流 + 弹体自转的螺旋横向速度 + 弹体摆动，星头 = 泪滴形燃气焰。
//  真循环：每层每个周期正好 M 颗、编号取模决定随机量；自转、湍流、摆动都取整数个周期 → 第 64 帧与第 0 帧相同。
//  接口和 makeTrailRenderer 一样（draw / stop / fadeK / fadeEnd / bot / frameT / pops / slots），bakeTrail、实时模拟、导出直接复用。
//  开关：尾缀序列的参数 trPhys = 1（其余 ph* 参数和物理尾缀同名）。
// =====================================================================
const isPhysBody = P => isTrail(P) && +P.trPhys > 0;
function trailRendererFor(P) { return isPhysBody(P) ? makePhysBodyRenderer(P) : makeTrailRenderer(P); }

// 整数哈希 → [0,1)
function phh(k, s) { let x = (Math.imul(k | 0, 0x9E3779B1) ^ Math.imul(s | 0, 0x85EBCA77)) >>> 0; x ^= x >>> 15; x = Math.imul(x, 0x2C1B3C6D) >>> 0; x ^= x >>> 12; x = Math.imul(x, 0x297A2D39) >>> 0; x ^= x >>> 15; return (x >>> 0) / 4294967296; }
function phn(k, s) { const u = Math.max(1e-7, phh(k, s)), v = phh(k, s + 101); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }

function makePhysBodyRenderer(P) {
  const Tp = trailPeriod(P), V = P.trV, sd = P.seed | 0, lifeCap = P.phLifeCap || 5;
  // 周期性的波：n 取整数圈 / 周期（按波长换算：一个周期里弹体走 V·Tp 米）
  const waves = (lam, amp, ampExp, salt) => {
    const r = new RNG(sd * 13 + salt), l0 = Math.log(lam[0]), l1 = Math.log(lam[lam.length - 1]), n = lam.length > 2 ? lam.length : Math.max(2, lam.length), out = [];
    for (let i = 0; i < n; i++) { const L = Math.exp(n > 1 ? l0 + (l1 - l0) * i / (n - 1) : l0); out.push([Math.max(1, Math.round(V * Tp / L)), Math.pow(L, ampExp), r.u() * 6.2832]); }
    const s = Math.sqrt(0.5 * out.reduce((q, w) => q + w[1] * w[1], 0)) || 1; out.forEach(w => { w[1] = w[1] / s * amp; }); return out;
  };
  const wob = waves(P.phWobL || [45, 67, 97], P.phWob || 0, 0, 1), tur = waves(P.phTurbL || [6, 67], P.phTurb || 0, 1 / 3, 3);
  const wv = (ws, t) => { let s = 0; for (const [n, a, ph] of ws) s += a * Math.sin(6.2831853 * n * t / Tp + ph); return s; };
  const spinF = Math.round((P.phSpinF || 0) * Tp) / Tp;
  const pops = ['A', 'B', 'C'].map((c, i) => {
    const g = k => P['ph' + c + k], rate0 = g('Rate') || 0; if (rate0 <= 0) return null;
    const M = Math.max(1, Math.round(rate0 * Tp)), rate = M / Tp, puff = Math.max(1, Math.round(g('Puff') || 1));
    const lmax = Math.min(lifeCap, g('Life') * Math.exp((g('Lsig') || 0) * 2.2));
    return { c, salt: 31 * (i + 1) + sd * 7, M, rate, puff, g, life: lmax, Mw: Math.ceil(rate * lmax) + 2 };
  }).filter(Boolean);
  const R = {
    Tp, pops, waves: [], slots: pops.reduce((s, q) => s + q.Mw, 0), frameT: null, bot: [0, 0], fadeEnd: [0, 0], stop: -1, stopE: -1, fadeK: 1, hx: () => 0,
    draw(ts, view, ppm, w, tw, f) {
      setParticleProfile(P);
      const tf = R.frameT && !P.trFollow ? R.frameT(f) : ts, anchorT = R.stop >= 0 ? (P.trFollow ? Math.min(ts, R.stopE) : R.stop) : tf, anchorY = V * anchorT;
      const x0 = wv(wob, anchorT);   // 星头固定在面片中线：火星的横向位置相对「这一帧的星头」
      const fadeAll = R.fadeEnd[1] > R.fadeEnd[0] ? 1 - smoothstepJS(R.fadeEnd[0], R.fadeEnd[1], ts) : 1;
      // 星头燃气焰：沿身后一串点（泪滴：头部最亮、向后变细变暗）；快门内跟着星头走
      if (R.stopE < 0 || ts <= R.stopE + 1e-6) {
        const L = (P.phFlL0 || 0) + (P.phFlLv || 0) * V, n = 32, fl = 1 + 0.12 * Math.sin(6.2831853 * 7 * ts / Tp) * Math.sin(6.2831853 * 3 * ts / Tp + 1.1);
        let ws = 0; const ww = []; for (let i = 0; i < n; i++) { const q = (i + 0.5) / n, v = Math.exp(-3 * q) * (1 - Math.exp(-q * 18)); ww.push(v); ws += v; }
        const yh = V * ts - anchorY; let k = 0;
        for (let i = 0; i < n; i++) { const q = (i + 0.5) / n; bufH[k++] = 0; bufH[k++] = yh - q * L; bufH[k++] = ww[i] / ws * (P.phFlI || 1) * fl; bufH[k++] = 2 * (P.phFlW || 0.15) * (0.55 + 0.9 * q); }
        PT_SPAN = 10; drawPoints(bufH, k / 4, view, ppm, [1, 0, 0, 0], w); PT_SPAN = 0;
      }
      // 火星
      const te = R.stopE >= 0 ? Math.min(ts, R.stopE) : ts, cap = bufT.length / 4; let k = 0;
      for (const q of pops) {
        const g = q.g, Kd = g('Kd'), Jet = g('Jet'), Cone = g('Cone') || 0, Life = g('Life'), Lsig = g('Lsig') || 0, T0 = g('T0'), Tb = g('Tb') == null ? T0 : g('Tb'),
          Tc = g('Tc') || 1000, Tend = g('Tend') || 1300, Pt = g('Pt') || 2, Pm = g('Pm') || 1, I0 = g('I'), Tw = g('Tw') || 0, Rg = g('R');
        for (let gi = Math.floor(te * q.rate); ; gi--) {
          const key = ((gi % q.M) + q.M) % q.M, K = key * 7919 + q.salt;
          const tb = (gi + phh(K, 1)) / q.rate; if (tb > te) continue;
          const a = ts - tb; if (a > q.life + 0.05) break; if (a < 0) continue;
          const lnz = clamp(phn(K, 2), -3, 2.2), life = Math.min(lifeCap, Life * Math.exp(Lsig * lnz)), size = Math.exp(0.5 * Lsig * lnz);
          const aE = R.stop >= 0 && ts > R.stop ? (R.stop - tb) + (ts - R.stop) * R.fadeK : a;
          if (aE >= life) continue;
          // 出生速度（世界坐标，z 向上）：弹体速度 V − 向后喷出 + 横向散开（同一簇共享一部分方向）+ 自转带出的横向速度
          const pk = Math.floor(gi / q.puff), PK = (((pk % q.M) + q.M) % q.M) * 104729 + q.salt;
          const jet = Jet * (0.75 + 0.5 * phh(K, 3)), ang = 6.2831853 * spinF * tb;
          const vx0 = Cone * (0.7 * phn(PK, 4) + 0.7 * phn(K, 5)) + (P.phSpinA || 0) * Math.cos(ang), vz0 = V - jet + Cone * 0.5 * phn(K, 6);
          const kd = Kd / size, e = Math.exp(-kd * a), s1 = (1 - e) / kd;
          const air = (P.phWind || 0) + wv(tur, tb) + phn(K, 7) * (P.phJit || 0), vtz = -G / kd;
          const x = wv(wob, tb) - x0 + air * a + (vx0 - air) * s1, z = V * tb + vtz * a + (vz0 - vtz) * s1, y = z - anchorY;
          const u = aE / life, T = Tb + (T0 - Tb) * Math.exp(-aE / Tc) - (Tb - Tend) * Math.pow(u, Pt);
          const wf = 7 + 9 * phh(K, 8), wp = phh(K, 9) * 6.28, twk = 1 + Tw * Math.sin(wf * aE * 6.283 + wp) * Math.sin(wf * 0.37 * aE * 6.283 + 1.3 * wp);
          let I = I0 * size * size * Math.pow(Math.max(0, 1 - u), Pm) * Math.min(1, a / 0.03) * twk * physLum(T) / PHYS_LUM_REF * fadeAll;
          if (R.bot[1] > R.bot[0]) I *= smoothstepJS(R.bot[0], R.bot[1], y);
          if (I <= 0 || k >= cap) continue;
          bufT[k * 4] = x; bufT[k * 4 + 1] = y; bufT[k * 4 + 2] = I; bufT[k * 4 + 3] = 2 * Rg * size; k++;
        }
      }
      drawPoints(bufT, k, view, ppm, [0, 1, 0, 0], w);
    },
    dispose() { }
  };
  return R;
}
function smoothstepJS(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
