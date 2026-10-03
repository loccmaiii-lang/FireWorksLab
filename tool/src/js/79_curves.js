// ---- 4.2.18 曲线视图（用户 2026-10-03 12:59 第 8 条：「把当前参数用曲线可视化给我观察……有影响就不做」）----
// 只读：把参数在时间上的结果画成几条曲线，放在时间轴的层轨道下面，和层轨道同一根时间轴、同一条播放头。
//   不改任何参数、不触发烘焙、不进素材；关掉就什么都不算。
//   对象 = 正在编辑的那一层（单层 = 当前效果；多层 = 选中的层；没选层时给提示）。
//   算法：用同一个模拟（星的轨迹、点火、燃烧、熄灭，和实时模拟 / 烘焙同一套），每 1/30 s 取一次；
//   火花生成 / 新火花寿命按显卡火花的规则算（实时模拟和烘焙画的就是它），不真的生成火花，所以很快。
//   实线 = 现在的参数，虚线 = 打开时（AI 版 / 你保存的版本）；色带 = 10%–90% 的星（每颗星不一样的量）。
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
const CURVE_KEY_LANES = (() => { const m = {}; for (const L of CURVE_LANES) for (const k of L.keys) (m[k] = m[k] || []).push(L.k); return m; })();
const curveSt = { on: null, data: null, base: null, busy: false, want: '', pendKey: '', pendAt: 0, drawSig: '', hot: null, baseSrc: '', baseP: null };

function curvesOn() { if (curveSt.on == null) curveSt.on = typeof store === 'undefined' ? true : !!store.get('curvesOn', true); return curveSt.on; }
function curvesShow(on) { curveSt.on = !!on; if (typeof store !== 'undefined') store.set('curvesOn', curveSt.on); curveSt.drawSig = ''; curvesMount(); }
// 正在编辑的那一层：{ P, M, d, r, name } / { hint } / null
function curveTarget() {
  if (state.showcase || state.tab === 'asset') return null;
  let P, M, d = 0, r = 1, name = '';
  if (state.tab === 'combo') {
    const i = state.comboSel, L = state.layers[i], e = L && layerEntryOf(L);
    if (!e) return { hint: '多层：点上面的层名选一层，这里画那一层的曲线' };
    P = e.P; M = L; d = +L.delay || 0; r = +L.rate || 1; name = layerName(i);
  } else { P = state.P; M = state.M; name = TYPE_NAMES[P && P.type] || ''; }
  if (!P) return null;
  const tid = [typeof lib !== 'undefined' ? lib.key : '', state.tab, state.tab === 'combo' ? state.comboSel : '', P.type].join('|');
  const fam = familyOf(P.type);
  if (!(fam === 'aerial' && P.form !== 'phys') && !(fam === 'rise' && ['master', 'segments'].includes(P.form))) return { hint: '这一类（尾缀 / 地面 / 物理）还没有曲线' };
  return { P, M, d, r, name, tid };
}
function curveBaseP() {
  const src = (typeof wb !== 'undefined' && wb.sig || '') + '|' + state.comboSel + '|' + (state.P && state.P.type);
  if (src !== curveSt.baseSrc) { curveSt.baseSrc = src; try { curveSt.baseP = panelBaseP(); } catch (e) { curveSt.baseP = null; } }
  return curveSt.baseP;
}
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
// 每 1/4 秒（stageTick）：参数停手 0.25 s 后算一次；算完画
function curvesTick() {
  const host = $('#tlCurves'); if (!host) return;
  if (!curvesOn()) { curvesMount(); return; }
  const tg = curveTarget();
  if (!tg || !tg.P) { curvesMount(); return; }
  const key = JSON.stringify(tg.P), B = curveBaseP(), bkey = B ? JSON.stringify(B) : '';
  curveSt.want = key;
  const need = !(curveSt.data && curveSt.data.key === key), needB = bkey && bkey !== key && !(curveSt.base && curveSt.base.key === bkey);
  if ((need || needB) && !curveSt.busy) {
    const now = performance.now();
    if (curveSt.pendKey !== key + '#' + bkey) { curveSt.pendKey = key + '#' + bkey; curveSt.pendAt = now; }
    else if (now - curveSt.pendAt >= 240) {
      curveSt.busy = true;
      (async () => {
        try {
          if (need) { const d = await curveCompute(tg.P, key, () => curveSt.want === key && curvesOn(), tg.tid); if (d) curveSt.data = d; }
          if (needB && curveSt.want === key) { const b = await curveCompute(B, bkey, () => curveSt.want === key && curvesOn()); if (b) curveSt.base = b; }
        } catch (e) { console.error('曲线视图', e); curveSt.data = { key, err: String(e && e.message || e) }; }
        finally { curveSt.busy = false; curveSt.drawSig = ''; curvesMount(); }
      })();
    }
  }
  curvesMount();
}
function curveInfo() {
  const tg = curveTarget(), key = tg && tg.P ? JSON.stringify(tg.P) : '', B = tg && tg.P ? curveBaseP() : null, bkey = B ? JSON.stringify(B) : '';
  const ready = !!(curvesOn() && tg && tg.P && curveSt.data && curveSt.data.key === key && !curveSt.data.err && (!bkey || bkey === key || (curveSt.base && curveSt.base.key === bkey)));
  const max = {}; if (curveSt.data && !curveSt.data.err) for (const L of CURVE_LANES) if (curveSt.data[L.k]) max[L.k] = +Math.max(...curveSt.data[L.k].hi).toFixed(3);
  return { on: curvesOn(), ready, hint: tg && tg.hint || '', lanes: CURVE_LANES.map(L => L.k), ms: curveSt.data ? curveSt.data.ms : null, max, x0: tg && tg.P ? tg.d / curDuration() : null, err: curveSt.data && curveSt.data.err || '' };
}
function curveData() {
  const d = curveSt.data; if (!d || d.err) return null;
  const o = { dt: d.dt, n: d.n, base: !!(curveSt.base && curveSt.base.key !== d.key && curveSt.base.key === (curveBaseP() ? JSON.stringify(curveBaseP()) : '')) };
  for (const L of CURVE_LANES) if (d[L.k]) o[L.k] = Array.from(d[L.k].mid, v => +v.toFixed(4));
  return o;
}
// 悬停参数 → 高亮对应曲线；返回曲线名（给说明栏）
function curvesHot(k) {
  curveSt.hot = k ? CURVE_KEY_LANES[k] || null : null;
  document.querySelectorAll('#tlCurves .cvl').forEach(l => l.classList.toggle('hot', !!(curveSt.hot && curveSt.hot.includes(l.dataset.k))));
  if (!curveSt.hot || !curvesOn() || !$('#tlCurves .cvl')) return '';
  return curveSt.hot.map(x => '「' + CURVE_LANES.find(L => L.k === x).lab + '」').join('');
}
const curveSrgb = x => Math.round(255 * clamp(lin2s(x), 0, 1));
const fmtCurve = (v, u) => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + (u ? ' ' + u : '');
// 建 / 更新曲线区（buildTlBars 重建时间轴后、每 1/4 秒都会调；没变化就不重画）
function curvesMount() {
  const host = $('#tlCurves'); if (!host) return;
  const on = curvesOn(), tg = on ? curveTarget() : null, D = curDuration();
  const head = `<div class="cvh"><button type="button" class="cvtog" aria-pressed="${on}" title="${on ? '收起曲线' : '展开曲线：把参数的结果按时间画出来（只看，不改参数、不烘焙）'}">曲线${on ? ' ▾' : ' ▸'}</button>`;
  if (!on || !tg || !tg.P) {
    const sig = 'h|' + on + '|' + (tg && tg.hint || '');
    if (curveSt.drawSig === sig) return; curveSt.drawSig = sig;
    host.innerHTML = head + (on && tg && tg.hint ? `<span class="cvlg">${tg.hint}</span>` : '') + '</div>';
    host.querySelector('.cvtog').addEventListener('click', () => curvesShow(!curvesOn()));
    return;
  }
  const d = curveSt.data && curveSt.data.tid === tg.tid ? curveSt.data : null;   // 同一层新的还没算好时先画旧的（不闪）；换了层不画别的层的
  const B = curveSt.base && d && curveSt.base.key !== d.key && curveBaseP() && curveSt.base.key === JSON.stringify(curveBaseP()) ? curveSt.base : null;
  const w = (host.querySelector('.cvt') || {}).clientWidth || 0;
  const sig = [d && d.key, d && d.err, B && B.key, tg.d, tg.r, D.toFixed(3), w, tg.name, (curveSt.hot || []).join(), JSON.stringify(tg.M && tg.M.stages), tg.M && tg.M.xw, tg.M && [tg.M.ramp0, tg.M.ramp1, tg.M.ramp2, tg.M.ramp3].join()].join('|');
  if (sig === curveSt.drawSig && host.querySelector('.cvl')) return; curveSt.drawSig = sig;
  if (!host.querySelector('.cvl')) {
    host.innerHTML = head + `<span class="cvlg"><b class="cvname"></b> · 实线 = 现在，虚线 = 打开时，色带 = 10%–90% 的星；只看，不改参数、不烘焙</span></div>`
      + CURVE_LANES.map(L => `<div class="cvl" data-k="${L.k}"><span class="cvn" title="${L.en} · ${L.lab}：${L.tip}">${L.lab}${L.k === 'color' ? '<i class="cvramp"></i>' : ''}</span><span class="cvt"><canvas></canvas><b class="cvm"></b></span></div>`).join('');
    host.querySelector('.cvtog').addEventListener('click', () => curvesShow(!curvesOn()));
    host.querySelectorAll('.cvt').forEach(t => {
      const L = CURVE_LANES.find(x => x.k === t.parentElement.dataset.k);
      t.addEventListener('pointermove', ev => { const r = t.getBoundingClientRect(), gt = clamp((ev.clientX - r.left) / r.width, 0, 1) * curDuration(), q = curveTarget(); if (!q || !q.P || !curveSt.data || curveSt.data.err) return;
        const lt = (gt - q.d) * q.r, i = Math.round(lt / curveSt.data.dt);
        if (L.k === 'color') { t.title = `${L.lab} · ${gt.toFixed(2)} s`; return; }
        t.title = i < 0 || i >= curveSt.data.n ? `${L.lab}：这一层这时还没开始 / 已经结束` : `${L.lab} ${fmtCurve(curveSt.data[L.k].mid[i], L.unit)}${L.k === 'lit' || L.k === 'spark' ? '' : `（10%–90%：${fmtCurve(curveSt.data[L.k].lo[i], '')}–${fmtCurve(curveSt.data[L.k].hi[i], L.unit)}）`} · 总时间 ${gt.toFixed(2)} s${q.d || q.r !== 1 ? `（这一层 ${lt.toFixed(2)} s）` : ''}`; });
      t.addEventListener('pointerdown', ev => { const r = t.getBoundingClientRect(); state.t = clamp((ev.clientX - r.left) / r.width, 0, 1) * curDuration(); });
    });
  }
  host.querySelector('.cvname').textContent = tg.name + (d && d.err ? ' · 曲线出错：' + d.err : '') + (!d || d.key !== JSON.stringify(tg.P) ? ' · 计算中…' : '');
  host.querySelectorAll('.cvl').forEach(l => l.classList.toggle('hot', !!(curveSt.hot && curveSt.hot.includes(l.dataset.k))));
  const dpr = devicePixelRatio || 1, X = t => (tg.d + t / tg.r) / D;
  for (const L of CURVE_LANES) {
    const lane = host.querySelector(`.cvl[data-k="${L.k}"]`), cvs = lane.querySelector('canvas'), tr = lane.querySelector('.cvt');
    const W = Math.max(1, Math.round(tr.clientWidth * dpr)), H = Math.max(1, Math.round(tr.clientHeight * dpr));
    if (cvs.width !== W) cvs.width = W; if (cvs.height !== H) cvs.height = H;
    const g = cvs.getContext('2d'); g.clearRect(0, 0, W, H);
    if (L.k === 'color') {
      if (!tg.M) continue;
      const rp = lane.querySelector('.cvramp'); if (rp) rp.style.background = `linear-gradient(90deg,${tg.M.ramp0 || '#000'} 0%,${tg.M.ramp1 || '#000'} 30%,${tg.M.ramp2 || '#fff'} 65%,${tg.M.ramp3 || '#fff'} 100%)`;
      const a = Math.max(0, Math.floor(X(0) * W)), b = Math.min(W, Math.ceil(X(+tg.P.duration || 0) * W));
      for (let x = a; x < b; x += 2) { const lt = ((x + 1) / W * D - tg.d) * tg.r, c = tintAt(tg.M, lt); g.fillStyle = `rgb(${curveSrgb(c[0])},${curveSrgb(c[1])},${curveSrgb(c[2])})`; g.fillRect(x, 0, 2, H); }
      lane.querySelector('.cvm').textContent = ''; continue;
    }
    if (!d || d.err || !d[L.k]) continue;
    const cur = d[L.k], bas = B && B[L.k];
    let m = 0; for (const s of [cur, bas]) if (s) for (let i = 0; i < s.hi.length; i++) m = Math.max(m, s.hi[i], s.mid[i]);
    lane.querySelector('.cvm').textContent = m > 0 ? fmtCurve(m, L.unit) : '0';
    const pad = 2 * dpr, Y = v => H - pad - (m > 0 ? v / m : 0) * (H - 2 * pad);
    const path = (s, arr, n) => { g.beginPath(); for (let i = 0; i < n; i++) { const x = X(i * s.dt) * W, y = Y(arr[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); } };
    if (L.k !== 'lit' && L.k !== 'spark') {   // 色带：10%–90%
      g.beginPath(); for (let i = 0; i < d.n; i++) { const x = X(i * d.dt) * W; i ? g.lineTo(x, Y(cur.hi[i])) : g.moveTo(x, Y(cur.hi[i])); }
      for (let i = d.n - 1; i >= 0; i--) g.lineTo(X(i * d.dt) * W, Y(cur.lo[i]));
      g.closePath(); g.globalAlpha = 0.22; g.fillStyle = L.c; g.fill(); g.globalAlpha = 1;
    }
    if (bas) { g.setLineDash([4 * dpr, 3 * dpr]); g.lineWidth = 1.2 * dpr; g.strokeStyle = '#8b979a'; path(B, bas.mid, B.n); g.stroke(); g.setLineDash([]); }
    g.lineWidth = 1.5 * dpr; g.strokeStyle = L.c; path(d, cur.mid, d.n); g.stroke();
  }
}
