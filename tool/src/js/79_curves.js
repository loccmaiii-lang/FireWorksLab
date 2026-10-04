// ---- 曲线计算（只给分析脚本 / 「火花灭完」用；4.5.0 起没有曲线视图了）----
// 4.2.18 的曲线视图（时间轴下面几条曲线）用户 10-05 01:28 #4 要求删掉（「没什么用，影响笔记本画布屏占比」），界面部分已去掉。
// 留下来的是纯计算：curveCompute（analysis/scripts/参数有效性检查.py 用来判断参数改了有没有效果）、
// sparkTailEnd / endInfoHTML（效果 › 规格「火花灭完」只读行，结尾选「不淡出」时加长序列）。不画、不碰界面。
const CURVE_LANES = [
  { k: 'light', lab: '星头亮度', en: 'Head Brightness', unit: '', c: '#f2d58a',
    tip: '燃烧中的星，星头有多亮（实线 = 平均，色带 = 10%–90% 的星；一直是 0 = 这一层星头不发光，只有尾迹 / 火花）。渐隐、熄灭前闪亮、前段亮度、闪烁、频闪都改这条',
    keys: ['headBright', 'fade', 'lastFlare', 'headDim', 'headDimUntil', 'strobeHz', 'strobeDuty', 'strobeStart', 'flicker', 'flutter', 'flutterHz', 'carrierHead'] },
  { k: 'lit', lab: '燃烧中的星', en: 'Burning Stars', unit: '颗', c: '#9fd3c7',
    tip: '这一刻有多少颗星在燃烧（点着了、还没熄灭；星头亮不亮看上一条）。星数、寿命、寿命随机、点火延迟、点火延迟随机、发光星比例、第二段都改这条',
    keys: ['stars', 'burn', 'burnJit', 'ignDelay', 'ignJit', 'keepFrac', 'afterBurn', 'afterJit', 'subDelay', 'subJit', 'subStars', 'subBurn', 'crossN', 'bunpoN', 'kobanaN'] },
  { k: 'spark', lab: '火花生成', en: 'Spark Spawn Rate', unit: '粒/秒', c: '#ffad5a',
    tip: '这一刻所有星加起来每秒新生多少粒火花（尾迹的密度）。火花数量、开始、停、起势、末段密度、余烬都改这条',
    keys: ['sparkRate', 'sparkStart', 'sparkStop', 'sparkRamp', 'sparkRampJit', 'sparkRateEnd', 'emberFrac', 'emberAll', 'carrierTail', 'subTail', 'ignDelay', 'ignJit'] },
  { k: 'life', lab: '新火花寿命', en: 'Spark Lifetime', unit: 's', c: '#d9a3ff',
    tip: '这一刻新生的火花能活多久（= 尾迹有多长；实线 = 中位数，色带 = 10%–90% 的火花）。火花寿命、末段寿命、寿命随机改这条',
    keys: ['sparkLife', 'sparkLifeEnd', 'sparkLifeJit'] },
  { k: 'speed', lab: '星速度', en: 'Star Speed', unit: 'm/s', c: '#7fb7ff',
    tip: '燃烧中的星飞多快（实线 = 中位数，色带 = 10%–90% 的星）。初速、初速随机、终端速度（阻力）、重力、燃烧减质量、风改这条',
    keys: ['v0', 'speedJit', 'vt', 'grav', 'massLoss', 'wind', 'shellVx', 'shellVy', 'shellSpin', 'subSpeed', 'subSpeedJit', 'subVt', 'subGrav', 'beeSpeed'] },
  { k: 'color', lab: '颜色', en: 'Color Over Life', unit: '', c: '#ffffff',
    tip: '条带 = 这一层的颜色随时间（= 导出的 Color Over Life，乘在星头上）；名字旁的小色块 = Ramp（火花 / 尾迹按亮度从暗到亮的颜色，不随时间）。在「颜色」一节改',
    keys: [] },
];
const curvePct = (a, q) => { if (!a.length) return 0; const x = q * (a.length - 1), i = Math.floor(x), f = x - i; return i + 1 < a.length ? a[i] + (a[i + 1] - a[i]) * f : a[i]; };
// 一颗星在 t 时刻的火花发射：[每秒几粒, 燃烧进度 0–1]；不发火花返回 null。和 40_gl.js 的星轨道 info（出生 / 停止 / 末段密度）+ VS_SPK（起势、余烬）同一套规则
function curveSparkAt(P, s, t, D) {
  if (!(s.rate > 0)) return null;
  const ig = s.birth + (s.ign || 0), s0 = P.sparkStart > 0 && s.kind !== 5 ? P.sparkStart : 0, born = ig + s0, end = s.birth + (s.vis != null ? s.vis : s.burn);
  const embAll = P.emberFrac > 0 && P.emberAll;
  let death = Math.min(end, D, P.sparkStop > 0 && s.kind !== 5 && !embAll ? ig + P.sparkStop : 1e9);
  if (s.tDead != null) death = Math.min(death, s.tDead);
  if (t < born || t >= death) return null;
  const e = s.kind === 5 ? 1 : (P.sparkRateEnd == null ? 1 : P.sparkRateEnd), tau = t - born;
  let r = s.rate * (1 + (e - 1) * tau / Math.max(0.05, end - born));
  if (+P.sparkRamp > 0) r *= sparkRampAt(P, s.id, tau);
  const hot = embAll && P.sparkStop > 0 ? P.sparkStop : 0;
  if (hot > 0 && tau > hot) r *= P.emberFrac;          // 火花停之后只剩余烬
  return [Math.max(0, r), clamp(tau / Math.max(0.05, death - born), 0, 1)];
}
// 4.4（用户 10-04 16:17「火星到最后没完全消失就切掉了」）：最后一批火花约 98% 灭完的时刻（秒，从开花算）。
// 每颗星（含子花）：火花停的时刻 + 火花寿命 × 末段寿命 × 寿命随机（对数正态 +1.64σ，约 95%；寿命末尾本来就只剩百分之几的亮度）；余烬按余烬寿命（+2.05 × 0.2）；爆裂星加爆裂延迟。
// 星本身用 CPU 星模拟走到全灭（便宜：只有星，没有火花）。按参数缓存
const tailEndCache = new Map();
function sparkTailEnd(P0) {
  const P = derive({ ...structuredClone(P0), engine: 'gpu' }), key = JSON.stringify(P);
  if (tailEndCache.has(key)) return tailEndCache.get(key);
  const rise = familyOf(P.type) === 'rise', le = rise || P.sparkLifeEnd == null ? 1 : +P.sparkLifeEnd, lj = rise || P.sparkLifeJit == null ? 0.45 : P.sparkLifeJit / 100;
  const tail = sparkEff(P).life * Math.max(1, le) * Math.exp(1.64 * lj), embAll = P.emberFrac > 0 && P.emberAll;
  let etail = P.emberFrac > 0 && !(+P.branch > 0) ? (+P.emberLife || 3) * Math.exp(0.41) : 0;
  const sim = new Sim(P), H = Math.max(8, (+P.duration || 3) * 3 + 4);
  let quiet = 0; while (sim.t < H) { sim.step(1 / 30); if (sim.t > 0.5 && !sim.all.some(s => s.alive)) { if (++quiet > 30) break; } else quiet = 0; }
  let end = 0;
  for (const s of sim.all) {
    const ig = s.birth + (s.ign || 0), dead = s.birth + (s.vis != null ? s.vis : s.burn);
    end = Math.max(end, dead);
    if (s.rate > 0) {
      const stop = P.sparkStop > 0 && s.kind !== 5 && !embAll ? Math.min(dead, ig + P.sparkStop) : dead;
      end = Math.max(end, stop + tail, etail > 0 ? (embAll ? dead : stop) + etail : 0);
    }
    if (P.crackle > 0 && !s.dark) end = Math.max(end, dead + (+P.crackleDelay || 0) * 1.7 + 0.25);
  }
  if (P.emberEnd > 0) end = Math.min(end, Math.max(P.emberEnd + 0.3, ...sim.all.map(s => s.birth + (s.vis != null ? s.vis : s.burn))));
  const v = Math.ceil(end / 0.05) * 0.05;
  if (tailEndCache.size > 64) tailEndCache.delete(tailEndCache.keys().next().value);
  tailEndCache.set(key, +v.toFixed(2)); return +v.toFixed(2);
}
// 「效果 › 规格」里的只读行：最后一批火花什么时候灭完、和序列时长比
function endInfoHTML() {
  const P = state.P; if (!P || familyOf(P.type) !== 'aerial') return '';
  let e; try { e = sparkTailEnd(P); } catch (err) { return ''; }
  const D = +P.cutOut > 0 ? +P.cutOut : +P.duration, short = e - D;
  const fade = P.endMode !== 'natural' ? '现在最后 0.3 s 整体淡出' : '不淡出';
  if (short > 0.04) return `<p class="hint endinfo warn">最后一批火花约 <b>${e.toFixed(2)} s</b> 灭完，序列到 ${D.toFixed(2)} s，差 ${short.toFixed(2)} s（${fade}，看着像被切掉）。<button type="button" class="btn mini" data-endfit="${e}">序列时长设成 ${e.toFixed(2)} s</button></p>`;
  return `<p class="hint endinfo">最后一批火花约 ${e.toFixed(2)} s 灭完，序列 ${D.toFixed(2)} s 盖得住（${fade}）。</p>`;
}
async function curveCompute(P0, key, live, tid = '') {
  const t0 = performance.now(), P = derive({ ...structuredClone(P0), engine: 'gpu' }), D = Math.max(0.1, +P.duration || 3);
  // 步长：星多的（千轮子花几千颗）放粗一点，曲线是看趋势的，不用和烘焙一样细；取样仍是每 1/30 s
  const est = (+P.stars || 0) * (P.type === 'senrin' || P.type === 'crossette' ? 1 + (+P.subStars || 0) : 1), h = est > 4000 ? 1 / 30 : est > 1500 ? 1 / 60 : 1 / 120;
  const sim = new Sim(P), dt = 1 / 30, n = Math.floor(D / dt + 1e-6) + 1, rise = familyOf(P.type) === 'rise';
  const out = { key, tid, dt, n, D, ms: 0 }; for (const L of CURVE_LANES) if (L.k !== 'color') out[L.k] = { mid: new Float32Array(n), lo: new Float32Array(n), hi: new Float32Array(n) };
  const life0 = sparkEff(P).life, le = rise || P.sparkLifeEnd == null ? 1 : +P.sparkLifeEnd, lj = rise || P.sparkLifeJit == null ? 0.45 : P.sparkLifeJit / 100, band = Math.exp(1.2816 * lj);
  let tick = performance.now(), Lb = new Float32Array(1024), Vb = new Float32Array(1024);
  for (let i = 0; i < n; i++) {
    const t = i * dt; while (sim.t < t - 1e-9) sim.step(h);
    if (Lb.length < sim.all.length) { Lb = new Float32Array(sim.all.length * 2); Vb = new Float32Array(sim.all.length * 2); }
    let lit = 0, rate = 0, lw = 0, nv = 0;
    for (const s of sim.all) {
      const sp = curveSparkAt(P, s, t, D); if (sp) { rate += sp[0]; lw += sp[0] * (1 + (le - 1) * sp[1]); }
      if (!s.alive || s.dark || s.age < (s.ign || 0) || s.age >= (s.vis != null ? s.vis : s.burn)) continue;
      Lb[lit++] = sim.headI(s); Vb[nv++] = Math.hypot(s.vx, s.vy, s.vz);
    }
    const Ls = Lb.subarray(0, lit).sort(), Vs = Vb.subarray(0, nv).sort();     // 类型数组按数值排序（比普通数组快得多）
    let sum = 0; for (let j = 0; j < lit; j++) sum += Ls[j];
    out.light.mid[i] = lit ? sum / lit : 0; out.light.lo[i] = curvePct(Ls, 0.1); out.light.hi[i] = curvePct(Ls, 0.9);
    out.lit.mid[i] = out.lit.lo[i] = out.lit.hi[i] = lit;
    out.spark.mid[i] = out.spark.lo[i] = out.spark.hi[i] = rate;
    const lm = rate > 0 ? life0 * lw / rate : 0; out.life.mid[i] = lm; out.life.lo[i] = lm / band; out.life.hi[i] = lm * band;
    out.speed.mid[i] = curvePct(Vs, 0.5); out.speed.lo[i] = curvePct(Vs, 0.1); out.speed.hi[i] = curvePct(Vs, 0.9);
    if (performance.now() - tick > 12) { await new Promise(r => setTimeout(r, 0)); if (!live()) return null; tick = performance.now(); }
  }
  out.ms = Math.round(performance.now() - t0);
  return out;
}
