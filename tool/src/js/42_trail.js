// =====================================================================
//  升空尾缀序列（上升产物「尾缀序列」）：循环 + 消散
//  坐标：弹体随体坐标。弹体以 trV 竖直上升，星头在面片上端，横向按「螺旋扭动」周期性摆动；
//  火花从星头喷出（带一部分弹体速度 + 随机散开，线性阻力 + 重力），在空中几乎不动，于是在随体坐标里向下拖成尾迹。
//  真循环：每层火花每个周期正好 Mp 颗，编号取模决定随机量；扭动的周期数是整数 → 第 64 帧与第 0 帧逐像素相同。
//  相机快门：子帧按世界时刻取位置，但都画在「这一帧的星头」坐标下（火花在空中基本不动，只有星头被拖出一小段亮线）。
//  消散：从上升结束那一帧开始停止喷火花、星头熄灭；已有火花继续飞、按放慢的时钟冷却熄灭（离星头越远越老，越早灭）。
// =====================================================================
const TRAIL_POPS = [
  // 键前缀, 随机盐, 初温 K, 冷却, 是否星头丝火花
  ['trF', 1, 2520, 0.46, false],   // 白热细火花：星头后面连续的白亮段
  ['trM', 2, 2260, 0.42, false],   // 金色火星：中段团块
  ['trC', 3, 2090, 0.34, false],   // 橙色大火星：末段一颗颗的点
  ['trW', 4, 2620, 0.6, true]      // 星头丝火花：从星头甩出的细丝（大型礼花）
];
const VS_TRAIL = `#version 300 es
precision highp float; precision highp int;
uniform float uT, uStop, uFadeK, uAnchorY, uV, uTp, uRate, uLife, uInh, uSpread, uK, uG, uT0, uCool, uBright, uSize, uWhisk, uIgn, uLag, uStreak;
uniform int uMp, uSeed, uPop;
uniform vec3 uWave[6]; uniform vec2 uBot, uFadeEnd;
uniform vec4 uView; uniform float uPPM, uPPMY, uMax;
out float vI; out vec2 vSig; out float vPS;
${GLSL_HASH}
vec2 headX(float t){ float x=0., vx=0.; for(int i=0;i<6;i++){ float w=6.2831853*uWave[i].x/uTp; x+=uWave[i].y*sin(w*t+uWave[i].z); vx+=uWave[i].y*w*cos(w*t+uWave[i].z); } return vec2(x,vx); }
void main(){
  float te = uStop>=0. ? min(uT,uStop) : uT;
  int gi=int(floor(te*uRate))-gl_VertexID;
  int gm=(gi+uMp*4096)%uMp; uint key=uint(gm)*7919u+uint(uPop)*1000003u;
  float tb=(float(gi)+hsh(key,1u))/uRate; if(tb>te){ cull(); return; }
  float age=uT-tb; if(age<0.){ cull(); return; }
  float ageE=(uStop>=0.&&uT>uStop)?(uStop-tb)+(uT-uStop)*uFadeK:age;
  float life=uLife*clamp(exp(.3*gss(key,2u)),.55,1.35); if(ageE>=life){ cull(); return; }
  // 星头走直线（真实弹道平滑，不左右甩）；扭动是火花离开星头后被带出的横向漂移：按出生时刻取波形，离开越久漂得越满
  vec2 h=headX(tb); vec3 dir=vec3(gss(key,5u),gss(key,7u),gss(key,9u)), vel;
  if(uWhisk>.5){ vel=vec3(0.,uV,0.)*uInh+normalize(dir+1e-4)*uSpread*(.5+.9*hsh(key,13u)); }
  else vel=vec3(0.,uV,0.)*uInh*(.6+.8*hsh(key,4u))+dir*uSpread;
  vec3 p=mot(vec3(0.,uV*tb,0.),vel,vec3(0.),vec3(0.,-uG,0.),uK,age);
  p.x+=h.x*(uLag>1e-4?1.-exp(-age/uLag):1.);
  float x=ageE/life, T=(uT0+90.*gss(key,11u))*(1.-uCool*x);
  float I=glowOf(T)*uBright*(.55+.9*hsh(key,15u))*pow(clamp((1.-x)/.3,0.,1.),1.5);
  if(uIgn>0.&&uWhisk<.5) I*=smoothstep(0.,uIgn*(.6+.8*hsh(key,19u)),ageE);   // 火花离开星头后才烧旺
  if(uFadeEnd.y>uFadeEnd.x) I*=1.-smoothstep(uFadeEnd.x,uFadeEnd.y,uT);   // 消散最后 30% 整体收到全黑，末帧干净
  float yy=p.y-uAnchorY; if(uBot.y>uBot.x) I*=smoothstep(uBot.x,uBot.y,yy);   // 面片底端柔和收尾，不在格子边上硬切
  if(I<=0.){ cull(); return; }
  emitPtW(vec2(p.x,yy),I,uSize*(.7+.6*hsh(key,17u)),10.,uStreak*uPPMY*.2887);   // 跟拍：子帧内相对星头下落的一段，按匀速拖影（方差 = 长度²/12）
}`;
PR40.trail = compile(point40GpuSource(VS_TRAIL, true), POINT40_FS);    // 4.3：V5 的火星是高斯点 + 跟拍拖影（和 3.7 一样的点形）

// 循环周期（秒）= 循环帧数 / 帧率
function trailPeriod(P) { return layoutOf(P).F / (P.trFps || 30); }
// 扭动：主扭动（整数圈/循环）+ 半频 + 细碎抖动（两组高频），全部是周期的整数倍
function trailWaves(P) {
  const n = Math.max(1, Math.round(P.trTwistN)), a = P.trTwist, w = P.trWiggle, r = new RNG(P.seed * 31 + 5);
  const ph = () => r.u() * 6.2832;
  return [[n, a, ph()], [Math.max(1, Math.round(n / 2)), a * 0.45, ph()], [n * 2 + 1, a * 0.12, ph()], [11 + n, w, ph()], [17 + n, w * 0.7, ph()], [29, w * 0.4, ph()]];
}
function trailPops(P) {
  const Tp = trailPeriod(P), cool = P.trCool || 1;
  return TRAIL_POPS.map(([k, salt, T0, cl, whisk]) => {
    const rate0 = P[k + 'Rate'] || 0; if (rate0 <= 0) return null;
    const Mp = Math.max(1, Math.round(rate0 * Tp)), rate = Mp / Tp, life = P[k + 'Life'];
    return { salt, T0, cool: clamp(cl * cool, 0.02, 0.95), whisk, Mp, rate, life, Mw: Math.ceil(rate * life * 1.4) + 2,
      spread: P[k + 'Spread'], size: P[k + 'Size'], bright: P[k + 'Bright'] };
  }).filter(Boolean);
}
// V5 星头：核心 + 光晕（周期性闪烁）；物理尾缀（45_physbody.js）也用它
let TRAIL_RAW = false;     // trailBounds 量取景时 = true：星头不乘 trHeadExpo
function drawTrailHead(R, P, ts, anchorY, view, ppm, w) {
  if (R.stopE >= 0 && ts > R.stopE + 1e-6) return;
  const Tp = R.Tp;
  // 星头固定在面片中线上（x = 0）；快门内按星头移动距离细分，拖出连续的亮线而不是一串珠子
  const sw = R.subW || 0, n = sw > 0 ? clamp(Math.ceil(P.trV * sw / (0.25 * P.trHeadSize)), 1, 48) : 1;
  let k = 0;
  for (let i = 0; i < n; i++) {
    const tt = ts + (n > 1 ? ((i + 0.5) / n - 0.5) * sw : 0);
    if (R.stopE >= 0 && tt > R.stopE + 1e-6) continue;
    const fl = 1 + 0.12 * Math.sin(6.2831853 * 7 * tt / Tp) * Math.sin(6.2831853 * 3 * tt / Tp + 1.1), y = P.trV * tt - anchorY;
    const hb = P.trHeadBright * (TRAIL_RAW ? 1 : +P.trHeadExpo || 1);     // 星头曝光（trHeadExpo）只在烘焙 / 实时里乘；量取景时按原始亮度（和 3.7 一样）
    bufH[k++] = 0; bufH[k++] = y; bufH[k++] = hb * fl / n; bufH[k++] = P.trHeadSize;
    // 光晕：3.7 光点核按总光量写，要乘光晕倍数²（和 TR2 烘焙时一样）
    if (P.trHalo > 0) { bufH[k++] = 0; bufH[k++] = y; bufH[k++] = hb * P.trHaloBright * fl * P.trHalo * P.trHalo / n; bufH[k++] = P.trHeadSize * P.trHalo; }
  }
  PT_SPAN = 10; PT_GAUSS = 1; try { drawPoints(bufH, k / 4, view, ppm, [1, 0, 0, 0], w); } finally { PT_SPAN = 0; PT_GAUSS = 0; }
}
// 渲染器：draw(ts, view, ppm, w, tw, f) —— 与烘焙流程通用的接口；星头画进 R，火花画进 G
function makeTrailRenderer(P) {
  const Tp = trailPeriod(P), pops = trailPops(P), waves = trailWaves(P), wv = new Float32Array(18);
  waves.forEach((q, i) => { wv[i * 3] = q[0]; wv[i * 3 + 1] = q[1]; wv[i * 3 + 2] = q[2]; });
  const hx = t => waves.reduce((s, [n, a, ph]) => s + a * Math.sin(6.2831853 * n / Tp * t + ph), 0);
  const R = {
    Tp, pops, waves, slots: pops.reduce((s, q) => s + q.Mw, 0),
    frameT: null,        // f → 这一帧的时刻（星头锚点）；null 时锚点 = 子帧时刻
    bot: [0, 0],         // 底端渐隐区间（随体坐标 y，米）
    fadeEnd: [0, 0],     // 消散末段整体渐隐 [开始, 结束]（秒）
    stop: -1, stopE: -1, fadeK: 1,
    hx,
    draw(ts, view, ppm, w, tw, f) {
      setParticleProfile(P);
      // 快门参照：固定机位（默认）= 子帧都画在这一帧的星头坐标下，火星近乎不动、是圆点；
      // 跟拍（trFollow）= 每个子帧跟着星头走，火星相对星头下落，拖成短竖线（尾缀3.0 实拍就是跟拍）
      const tf = R.frameT && !P.trFollow ? R.frameT(f) : ts, anchorT = R.stop >= 0 ? (P.trFollow ? Math.min(ts, R.stopE) : R.stop) : tf, anchorY = P.trV * anchorT;
      // 星头：核心 + 光晕（周期性闪烁）
      drawTrailHead(R, P, ts, anchorY, view, ppm, w);
      const modern = true, pr = PR40.trail; gl.useProgram(pr.p);
      gl.uniform1f(pr.u.uT, ts); gl.uniform1f(pr.u.uStop, R.stopE); gl.uniform1f(pr.u.uFadeK, R.fadeK); gl.uniform1f(pr.u.uAnchorY, anchorY);
      gl.uniform1f(pr.u.uV, P.trV); gl.uniform1f(pr.u.uIgn, P.trIgnite || 0); gl.uniform1f(pr.u.uLag, P.trTwistLag == null ? 0.35 : P.trTwistLag); gl.uniform1f(pr.u.uStreak, P.trFollow ? P.trV * (R.subW || 0) : 0); gl.uniform1f(pr.u.uTp, Tp); gl.uniform1f(pr.u.uInh, P.trInh); gl.uniform1f(pr.u.uK, P.trDrag); gl.uniform1f(pr.u.uG, G * P.trGrav);
      gl.uniform3fv(pr.u['uWave[0]'], wv); gl.uniform1i(pr.u.uSeed, P.seed | 0); gl.uniform2fv(pr.u.uBot, R.bot); gl.uniform2fv(pr.u.uFadeEnd, R.fadeEnd);
      gl.uniform4fv(pr.u.uView, view); gl.uniform1f(pr.u.uPPM, ppm); gl.uniform1f(pr.u.uPPMY, PPMY || ppm); gl.uniform1f(pr.u.uMax, PT_MAX);
      setParticleUniforms(pr, [0, 1, 0, 0]); gl.uniform4fv(pr.u.uChan, [0, 1, 0, 0]); gl.uniform1f(pr.u.uW, w); gl.uniform1f(pr.u.uGauss, 1);
      gl.bindVertexArray(emptyVAO);
      for (const q of pops) {
        gl.uniform1f(pr.u.uRate, q.rate); gl.uniform1i(pr.u.uMp, q.Mp); gl.uniform1i(pr.u.uPop, q.salt); gl.uniform1f(pr.u.uLife, q.life);
        gl.uniform1f(pr.u.uSpread, q.spread); gl.uniform1f(pr.u.uT0, q.T0); gl.uniform1f(pr.u.uCool, q.cool); gl.uniform1f(pr.u.uBright, q.bright);
        gl.uniform1f(pr.u.uSize, q.size); gl.uniform1f(pr.u.uWhisk, q.whisk ? 1 : 0);
        drawParticleBatch(q.Mw,modern);
      }
      gl.bindVertexArray(null);
    },
    dispose() { }
  };
  return R;
}
// 消散：从循环第 fEnd 帧开始（该帧的快门结束时停止喷火花）；aging 时钟放慢，让最新的火星正好在 dur 秒内熄灭
function trailFadeSetup(R, P, fEnd, dur) {
  const F = layoutOf(P).F, Tp = R.Tp, W = Math.max(P.shutter * Tp / F, 1e-4), stop = fEnd * Tp / F;
  // 火星冷却到寿命的 80% 左右就看不见了：让最新的大火星在 dur 秒时正好走到这里（下面较老的火星更早熄灭）
  const lifeMax = Math.max(...R.pops.map(q => q.life)) * 1.35;
  R.stop = stop; R.stopE = stop + W / 2; R.fadeK = Math.min(1, 0.42 * lifeMax / dur); R.fadeEnd = [stop + 0.7 * dur, stop + dur];
  return { stop, W };
}
// 取景：低分辨率先渲几个相位（含消散末段），按与烘焙相同的曝光口径找「看得见」的范围；星头固定在面片上端
function trailBounds(P, extraR) {
  const R = trailRendererFor(P), Tp = R.Tp, N = 160, NHt = 1280;
  const guess = Math.max(8, P.trV * Math.max(...R.pops.map(q => q.life)) * 1.3);
  const view = [0, -guess / 2 + guess * 0.02, guess * N / NHt / 2 * 4, guess / 2 + guess * 0.04];
  const t = new Target(N, NHt, gl.RGBA16F), buf = new Float32Array(N * NHt * 4);
  const acc = new Float32Array(N * NHt);
  const pass = (RR, times) => { TRAIL_RAW = true; try {
    for (const ts of times) {
      t.clear(); t.bind(); additive(true); RR.draw(ts, view, N / (2 * view[2]), 1, 0, 0); additive(false);
      PPMY = 0; gl.readPixels(0, 0, N, NHt, gl.RGBA, gl.FLOAT, buf);
      for (let i = 0; i < acc.length; i++) acc[i] = Math.max(acc[i], buf[i * 4] + buf[i * 4 + 1]);
    }
  } finally { TRAIL_RAW = false; } };
  // 与烘焙相同的纵横像素比
  PPMY = NHt / (2 * view[3]);
  const times = []; for (let i = 0; i < 8; i++) times.push(i / 8 * Tp);
  pass(R, times);
  if (extraR) { PPMY = NHt / (2 * view[3]); pass(extraR.R, extraR.times); }
  PPMY = 0; t.dispose();
  // 曝光：火花部分 99.8 分位 → 0.55（与合并输出一致），看得见 = 编码后 ≥ 3/255
  const vals = Array.from(acc).filter(v => v > 1e-6).sort((a, b) => a - b);
  const p = vals.length ? vals[Math.floor(vals.length * 0.998)] : 1, E = -Math.log(1 - 0.55) / p, thr = -Math.log(1 - 3 / 255) / E;
  let x0 = N, x1 = -1, y0 = NHt, y1 = -1;
  for (let y = 0; y < NHt; y++) for (let x = 0; x < N; x++) if (acc[y * N + x] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  R.dispose();
  const pxX = 2 * view[2] / N, pxY = 2 * view[3] / NHt, X = i => view[0] - view[2] + (i + 0.5) * pxX, Y = j => view[1] - view[3] + (j + 0.5) * pxY;
  if (x1 < 0) return [-1, 1, -10, 1];
  // 横向：按亮度加权取 99.6% 的内容（偶尔飞出去的单颗暗火星不撑宽面片，被格子留边柔和收掉）
  const colW = new Float64Array(N); let tot = 0;
  for (let y = 0; y < NHt; y++) for (let x = 0; x < N; x++) { const v = acc[y * N + x]; if (v > thr) { colW[x] += v; tot += v; } }
  const ci = Math.round((0 - (view[0] - view[2])) / pxX - 0.5); let inner = colW[ci] || 0, r = 0;
  while (inner < 0.99 * tot && r < N) { r++; inner += (colW[ci - r] || 0) + (colW[ci + r] || 0); }
  const half = Math.min(Math.max(Math.abs(X(x0)), Math.abs(X(x1))), (r + 1.5) * pxX) + pxX;
  return [-half, half, Y(y0) - pxY, Math.max(Y(y1) + pxY, P.trHeadSize * P.trHalo * 0.9)];
}
// 计划：面片横竖分开铺满格子（1:16 的细长格子），星头在上端；帧 f 的时刻 = f × 周期 / 帧数
function trailPlan(P, box, times, dur, extra = {}) {
  const L = layoutOf(P), W0 = 2 * Math.max(-box[0], box[1]), H0 = box[3] - box[2];
  const HX = W0 / 2 * 1.03, HY = H0 / 2 * 1.015, cy = (box[2] + box[3]) / 2;
  return { L, HX, HY, Ww: 2 * HX, Wh: 2 * HY, cy, ppm: L.cellW / (2 * HX), zoom: false, aniso: true, sizeKeys: [[0, 1], [1, 1]], sizeKeysX: [[0, 1], [1, 1]], sizeKeysY: [[0, 1], [1, 1]],
    area: 1, px: 0.5, py: (cy + HY) / (2 * HY), keys: [[0, 0], [1, L.F]], times, dur, avgFps: L.F / (times.length * dur[dur.length - 1]), minFps: 1 / Math.max(...dur), maxDisp: 0, t0: 0,
    duration: dur.reduce((a, c) => a + c, 0), ...extra };
}
// 上升全程：尾迹长度随速度变（出膛快 → 长；到顶慢 → 短）；Lvis = 面片长度对应的「可见时长」
function trailSizeKeys(path, V, Lm) {
  const T = path[path.length - 1][0], yAt = t => { if (t <= 0) return 0; let i = Math.min(path.length - 1, Math.floor(t / T * (path.length - 1))); return path[i][1]; };
  const Lvis = Lm / V, out = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10 * T; out.push([+(i / 10).toFixed(2), +clamp((yAt(t) - yAt(t - Lvis)) / Lm, 0.35, 2).toFixed(3)]); }
  return out;
}
// 烘焙：循环 + 两个消散版本（30 fps / 20 fps，各 64 帧）
async function bakeTrail(P, scale, onProg) {
  P = { ...P, form: 'trail', outMode: 'combined', frameMode: 'uniform', zoom: 'off', autoGrid: 0 };
  const L = layoutOf(P), F = L.F, fps = P.trFps || 30, R = trailRendererFor(P), Tp = R.Tp;
  const path = risePath(P), fit = fitRise(path), T = fit.T, fEnd = Math.floor(((T % Tp) / Tp) * F + 1e-6) % F;
  // 取景：把两个消散版本的末段也算进去（火花会慢慢下坠、散开）
  const Rf = trailRendererFor(P); trailFadeSetup(Rf, P, fEnd, F / 20);
  const ftimes = []; for (let i = 0; i < 6; i++) ftimes.push(Rf.stop + i / 5 * F / 20);
  // trBox：固定的取景 [左, 右, 下, 上]（米）。V5 新画法的候选（V5S/M/L）用用户通过的 TR2 当时量出来的取景，面片大小和 TR2 一样
  // （3.7 的 trailBounds 第二个时刻起纵向按横向的每米像素画，新核的四边形光点不再有这个偏差，量出来会差几成）
  const box = Array.isArray(P.trBox) && P.trBox.length === 4 ? P.trBox.slice() : trailBounds(P, { R: Rf, times: ftimes });
  if (P.autoGridTrail !== 0) {
    const ca = 2 * Math.max(-box[0], box[1]) / (box[3] - box[2]); let best = null;
    for (const [c, r] of [[16, 1], [8, 2], [4, 4]]) { const a = (P.texW / c) / (P.texH / r), sc = Math.abs(Math.log(a / ca)); if (!best || sc < best.sc) best = { c, r, sc }; }
    P.cols = best.c; P.rows = best.r;
  }
  const lt = [], ld = []; for (let f = 0; f < F; f++) { lt.push(f * Tp / F); ld.push(Tp / F); }
  const pl = trailPlan(P, box, lt, ld, { loop: true, duration: Tp });
  const onP = (a, b) => p => onProg && onProg(a + p * (b - a));
  const bot = [pl.cy - pl.HY + 0.004 * pl.Wh, pl.cy - pl.HY + 0.06 * pl.Wh];
  R.frameT = f => lt[f]; R.bot = bot;
  const b = await bakeFrames(P, scale, onP(0, 0.4), pl, R);
  const expo = [b.meta.expoH, b.meta.expoT];
  b.fades = [];
  for (const [k, fr] of P._loopOnly ? [] : [[0, 30], [1, 20]]) {
    const Rd = trailRendererFor(P), { stop } = trailFadeSetup(Rd, P, fEnd, F / fr);
    const tt = [], dd = []; for (let f = 0; f < F; f++) { tt.push(f / fr); dd.push(f === 0 ? Tp / F : 1 / fr); }
    const pf = trailPlan(P, box, tt, dd, { loop: false, t0: stop, duration: F / fr });
    Rd.frameT = f => stop + tt[f]; Rd.bot = bot;
    const bf = await bakeFrames(P, scale, onP(0.4 + k * 0.3, 0.7 + k * 0.3), pf, Rd, { expo, noFade: true });
    bf.form = 'trailFade'; bf.fps = fr; b.fades.push(bf);
  }
  const Lm = -box[2];                       // 星头到尾迹末端的长度（米）
  Object.assign(b.meta, { trail: true, fit, T, fEnd, fps, Tp, hb: (0 - (pl.cy - pl.HY)) / (2 * pl.HY), sizeKeysRise: trailSizeKeys(path, P.trV, Lm), trailLen: Lm });
  b.meta.relay = b.fades.length ? trailRelayDiff(b, b.fades) : [];
  b.form = 'trail'; b.P = P; return b;
}
// 接力检查：消散第 0 帧 vs 循环第 fEnd 帧（编码后逐像素平均差，0–255）
function trailRelayDiff(b, fades) {
  const L = b.meta.L, fEnd = b.meta.fEnd || 0, a = readRGBA8(b.head);
  const cell = (im, f, N, NH, cw, chh) => { const c = Math.floor(f / L.per), k = f % L.per, col = k % L.cols, row = Math.floor(k / L.cols), x0 = col * cw, y0 = NH - (row + 1) * chh, o = []; for (let y = y0; y < y0 + chh; y++) for (let x = x0; x < x0 + cw; x++) o.push(im[(y * N + x) * 4 + c]); return o; };
  const A = cell(a, b.meta.fEnd, b.N, b.NH, b.cw, b.chh);
  return fades.map(f => { const B = cell(readRGBA8(f.head), 0, f.N, f.NH, f.cw, f.chh); let d = 0; for (let i = 0; i < A.length; i++) d += Math.abs(A[i] - B[i]); return +(d / A.length).toFixed(3); });
}
function disposeTrail(b) { if (b && b.fades) b.fades.forEach(f => { f.head.dispose(); f.tail && f.tail.dispose(); }); if (b && b.far) { b.far.head.dispose(); b.far.tail && b.far.tail.dispose(); } }     // 4.5.1 升空尾缀远段
