// =====================================================================
//  4.3 参数面板（用户 2026-10-03 12:59 #2 #3 #4、命名表审阅意见；4.3.0 起是唯一的面板，旧布局和旧名字去掉了）
//  - 名字 / 说明来自 analysis/命名/参数名称表.json（build.py 生成 PNAMES，唯一来源）：默认中文，开「英文名」显示 Niagara 风格英文；
//    说明条第一行「English · 中文 — 一句话说明」，下面「调大 / 调小」「随机怎么取」「UE 里对应」「注意」。
//  - 按 Niagara 发射器的模块顺序排：发射器 → 生成 / 寿命 / 形状 / 初速 → 受力 / 外观 / 烟花特性 / 子花 → 尾迹 → 尾缀各层 → 烘焙输出。
//  - 随机折叠（用户审阅意见「每个参数的随机都折叠一下，我需要就点开填」）：「××随机」收在本体参数行的「随机」按钮下，点开才显示。
//  - 不起作用的参数（参数有效性检查实测 + 渲染基础问题清单 H13）：不藏起来，变灰并写原因（例：点火延迟是 0 时「点火延迟随机」不起作用）。
//  - 每个模块先放「第一眼」的参数（命名表 tier = core），其余收在模块里的「更多」；搜索认新名字 / 英文名 / 说明。
// =====================================================================
const PNAME = (() => { const m = new Map(); for (const r of (typeof PNAMES !== 'undefined' ? PNAMES : [])) { const k = r.sec + '|' + r.key; if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return m; })();
// 同一节里同一个键可能有两行（例：形状里「开花图案」和地面的「灯芯图案」都是 pattern）：按旧名对上
function pnameOf(sec, key, label) { const a = PNAME.get(sec + '|' + key); if (!a) return null; if (a.length > 1 && label != null) { const L = String(label); return a.find(r => r.old === L || L.startsWith(r.old) || r.old.startsWith(L.split('（')[0])) || a[0]; } return a[0]; }
// 4.4：面板按「发射器 → 模块 → 参数」排（用户 2026-10-04 16:17 / 17:13：按 Niagara 的发射器分层，父级 / 子级清楚、名字不带重复前缀）。
// 归属和短名只看 analysis/命名/发射器表.json（build.py → PEMIT，唯一来源）；「全名」仍是参数名称表的 cn，用在搜索、说明条。
// 顶上一排发射器标签（效果 / 星 / 火花 / 余烬 / 爆裂 / 子花 / 开花闪光 / 输出 …），一次看一个发射器；搜索、只看改过的跨所有发射器。
const EMIT_DEF = (() => { const m = {}; (typeof PEMIT !== 'undefined' ? PEMIT.E : []).forEach((e, i) => { m[e.n] = { ...e, i }; }); return m; })();
// 这一行归哪：{ e: 发射器, m: 模块, n: 面板上的短名 }。表里没有的（不该有，P1 检查会报）按节名猜一个
function emitOf(nm, sec) {
  const x = nm && nm.id && typeof PEMIT !== 'undefined' ? PEMIT.P[nm.id] : null;
  if (x) return { e: x[0], m: x[1], n: x[2], i: x[3] };
  return { e: /输出|导出|画质|曝光|规格|入点/.test(sec && sec.sec || '') ? '输出' : '效果', m: nm && nm.mcn || (sec && sec.sec) || '其它', n: nm ? nm.cn : '', i: 9999 };
}
// 「××随机」挂在哪个本体参数下面（没列的按「键名去掉 Jit」找；找不到就照常单独一行）
const RAND_OF = { speedJit: 'v0', dirJit: 'v0', burnJit: 'burn', ignJit: 'ignDelay', afterJit: 'afterBurn', sparkRampJit: 'sparkRamp', sparkLifeJit: 'sparkLife',
  sparkSpread: 'sparkInherit', sparkInhJit: 'sparkInherit', twinkle: 'sparkBright', twinkleHz: 'sparkBright', starBright: 'sparkBright', tailJit: 'sparkSize', subJit: 'subDelay', subSpeedJit: 'subSpeed', subScaleJit: 'subSpeed' };
function randBaseOf(key, keys) { const b = RAND_OF[key] || (/Jit$/.test(key) ? key.slice(0, -3) : ''); return b && keys.has(b) ? b : ''; }
const isCarrierType = P => P.type === 'senrin' || P.type === 'crossette';
const SPARK_KEYS = ['sparkRateEnd', 'sparkStop', 'sparkStart', 'sparkRamp', 'sparkRampJit', 'sparkLife', 'sparkLifeEnd', 'sparkLifeJit', 'sparkSpread', 'sparkSize', 'sparkInherit', 'sparkDrag', 'sparkGrav',
  'T0', 'cooling', 'sparkBright', 'twinkle', 'twinkleHz', 'emberFrac', 'tailJit', 'tailShoulder', 'tailWidth', 'tailPinchHead', 'tailPinchTail', 'tailBellyAt', 'sparkRise', 'starBright', 'tailHaze', 'tailHazeR', 'branch', 'branchAt', 'tailDiffuse', 'tailDiffuseScale'];
// 不起作用的条件（空中类）：[键, 条件, 原因]。依据：analysis/probe/参数有效性/（云端：拨了曲线 / 帧计划都不变）+ analysis/results/SMOKE15/参数有效性/（本机：再加 4 个时刻的定帧画面也不变）+ 代码（20_sim.js、40_gl.js）
const INERT = [
  [['coreProfile'], P => isTrail(P), 'V5尾缀沿用已通过的高斯核；本选项不改变它和开花闪光'],
  [['exposureTarget'], P => isTrail(P) || isPhys(P) || isEmit(P), '这类产物目前不使用「建议曝光」；可直接调贴图曝光'],
  [['ignJit', 'ignSeed'], P => !(+P.ignDelay > 0) && !isCarrierType(P), '「点火延迟」是 0 时不起作用（随机的是点火延迟的长短）'],
  [['headDim'], P => +P.headDim < 1 && !(+P.headDimUntil > 0), '「前段结束」是 0 时不起作用：先设前段到第几秒结束'],
  [['turbScale'], P => !(+P.turb > 0), '「湍流强度」是 0 时不起作用'],
  [['burn', 'ignDelay', 'ignJit', 'ignSeed', 'afterBurn', 'afterJit'], P => isCarrierType(P), '千轮 / 分裂的星是子弹：子弹飞多久看「子花开花时刻」，子星看「子花 › 燃烧时间」；这一项对它们不起作用'],
  [['sparkRate'], P => isCarrierType(P), '千轮 / 分裂：子弹的火花看「子弹火花率」，子星的火花看「子星火花率」；这一项不起作用'],
  [SPARK_KEYS, P => !isCarrierType(P) && !(+P.sparkRate > 0), '「火花生成率」是 0（这一层没有火花）时不起作用'],
  [SPARK_KEYS, P => isCarrierType(P) && !(+P.carrierTail > 0) && !(+P.subTail > 0), '「子弹火花率」「子星火花率」都是 0（这一层没有火花）时不起作用'],
  [['emberAll'], P => !(+P.sparkStop > 0), '「火花停止时刻」是 0 时不起作用（火花本来就全程都有，余烬也一样）'],
  // 4.3（H13 / 渲染基础问题清单审计 4.4）：
  [['headDimUntil'], P => !(+P.headDim < 1), '「前段亮度」是 1（不压暗）时不起作用：先把前段亮度调到 1 以下'],
  [['preRoll', 'preScale0', 'prePivot'], P => P.zoom === 'on', '「面片取景」是「随开花放大」时不起作用（Zoom 本来就从小放大）'],
  [['emberFrac', 'emberLife', 'emberBright', 'emberFollow', 'emberSize', 'emberEnd', 'emberAll'], P => +P.branch > 0, '「松叶分叉数」> 0 时不出余烬（分叉的火花占了余烬那一路）'],
  [['chaos'], P => !(+P.spin > 0), '「旋转速度」是 0 时不起作用'],
  // 地面：只有 1 个喷口时，喷口之间的间距、彗星扇面没有意义（喷泉的扇面角度是喷射张角，照样起作用）
  [['fanAngle'], P => typeof hasComets === 'function' && hasComets(P) && Math.round(+P.nozzles || 1) <= 1, '「喷口数」是 1 时不起作用（扇面角度是几个喷口之间张开的角度）'],
  [['spacing'], P => familyOf(P.type) === 'ground' && P.type !== 'shikake' && Math.round(+P.nozzles || 1) <= 1, '「喷口数」是 1 时不起作用'],
  [['fade', 'lastFlare', 'flicker', 'headSize', 'headTear', 'headDim', 'headDimUntil', 'strobeHz', 'strobeDuty', 'strobeStart', 'carrierHead'], P => !(+P.headBright > 0), '「星头亮度」是 0（星头不发光，只有尾迹 / 火花）时不起作用'],
  // 4.9.4：地面的喷口 / 灯芯亮点一直亮着、没有寿命；只有扇形 / 连发的彗星按「彗星燃烧」算寿命
  [['starSizeCurve', 'starBrightCurve'], P => familyOf(P.type) === 'ground' && !(typeof hasComets === 'function' && hasComets(P)), '地面的喷口 / 灯芯亮点一直亮着，没有寿命；只有扇形、连发的彗星按「彗星燃烧」算寿命'],
];
// 4.9.0（5.0 第 3 步，参数宪章 + 参数表「删」「改成常量」，用户 19:40「全按推荐」）：代码先不删——你的配方、待验收效果里用着的照旧算，画面不变。面板上：
// - 这个效果用着（值不等于「不用」时的值）→ 照常显示，名字后面一个「旧」标记，说明条写为什么要删、用什么代替；
// - 没用上 → 收进模块底下的「旧（待删）· N 项」，点开才显示；搜索、只看改过的照样找得到。
// [为什么要删 / 用什么代替, 不用时的值（不写 = BASE 的默认值）, 用着没有（不写 = 值 ≠ 不用时的值）]
const LG_SHAPE = '直接捏尾迹外形的旋钮；5.0 用火花「大小随寿命」曲线（梭形）代替';
const LG_V5 = 'V5 尾缀的旧旋钮（RT6 起不用）';
const LG_PRE = '入点前另做从小放大（旧取景）；5.0 固定机位不用';
const LEGACY = {
  headDim: ['按一段时间压暗星头；5.0 用星「亮度随寿命」曲线代替'], headDimUntil: ['按一段时间压暗星头；5.0 用星「亮度随寿命」曲线代替', null, P => +P.headDim < 1],
  sparkLifeEnd: ['出生越晚的火花寿命再乘一次；5.0 一套燃烧模型，不分出生早晚'],
  emberFollow: ['按母星熄灭再把余烬整体淡掉；5.0 余烬按自己的年龄燃尽'], emberEnd: ['到某个时刻把余烬整体熄掉；5.0 余烬按自己的年龄燃尽'],
  tailJit: [LG_SHAPE], tailShoulder: [LG_SHAPE], tailWidth: [LG_SHAPE], tailPinchHead: [LG_SHAPE], tailPinchTail: [LG_SHAPE],
  tailBellyAt: [LG_SHAPE, null, P => +P.tailPinchHead > 0 || +P.tailPinchTail > 0],
  headTear: ['沿速度补点造泪滴星头，和快门拖影重复'],
  tailHaze: ['线间底光是后期模糊加回来的，不是发光颗粒'], tailHazeR: ['线间底光是后期模糊加回来的，不是发光颗粒', null, P => +P.tailHaze > 0],
  trPhys: [LG_V5], trTwist: [LG_V5], trTwistN: [LG_V5, null, P => +P.trTwist > 0], trWiggle: [LG_V5], trTwistLag: [LG_V5, null, P => +P.trTwist > 0],
  rtBall: ['线性阻力弹道（旧）；RT6 用平方阻力，升空时间是算出来的', 1], rtT: ['线性阻力弹道（旧）才用的升空时间；平方阻力时是算出来的', null, P => +P.rtBall !== 1],
  rtConeSoft: ['散开分布开关；5.0 固定一种', 0], rtGpuSafe: ['旧写法 GPU 发射器也写 Acceleration，UE 4.24 里标红', 1], rtTexCal: ['旧的贴图亮度口径（跟温度偏移漂）', 1],
  rtFdT: ['每档温度偏移；5.0 白黄对比由粒径决定'], rtMdT: ['每档温度偏移；5.0 白黄对比由粒径决定'], rtCdT: ['每档温度偏移；5.0 白黄对比由粒径决定'],
  rtStreakMax: ['拖影上限只夹外观；5.0 拖影由速度 × 快门决定'], rtLoopSize: ['固定长循环层（4.4 旧做法）', 1], rtLoopMin: ['循环层的人为最短长度；5.0 按星头可见长度自动算'],
  rtDotGain: ['粒子层另乘的总亮度（光晕、发射口不乘），名不副实'], rtDissolve: ['消散溶解终值；5.0 固定', 1],
  preRoll: [LG_PRE, 0, P => +P.cutIn > 0], preScale0: [LG_PRE, null, P => +P.preRoll > 0 && +P.preScale0 > 0], prePivot: [LG_PRE, null, P => +P.preRoll > 0 && +P.prePivot !== 0],
  fpsFloor: ['旧帧计划才读；固定机位 + 匀速帧不读'], trimLead: ['开头空白不烘；5.0 固定为裁掉', 1],
};
const legacyOf = k => LEGACY[k] || (/^ph[A-Z]/.test(k) ? ['物理尾缀（已归档）的参数'] : null);
function legacyInUse(k, P) {
  const L = legacyOf(k); if (!L || !P) return false;
  const off = L[1] != null ? L[1] : BASE[k], v = P[k];
  if (v == null || String(v) === String(off) || (typeof off === 'number' && +v === off)) return false;
  return L[2] ? !!L[2](P) : true;
}
// 面板建好以后：给旧参数行打标记，每个模块底下一个「旧（待删）· N 项」开关（refreshVisibility 里按用没用上收起 / 显示）
function p43Legacy() {
  for (const [row, it, , det] of panelRows) {
    const k = Array.isArray(it) ? it[0] : it.sel || ''; const L = k && legacyOf(k); if (!L) continue;
    row._legacy = L; row.classList.add('legacy');
    const nm = row.querySelector('.k, .fk'); if (nm && !nm.querySelector('.old-tag')) nm.insertAdjacentHTML('afterbegin', `<span class="old-tag" title="5.0 要删：${L[0]}">旧</span>`);
    if (!det._oldb) { const b = document.createElement('button'); b.type = 'button'; b.className = 'oldb'; b.hidden = true;
      b.addEventListener('click', e => { e.preventDefault(); pview.oopen = pview.oopen || {}; pview.oopen[det._key] = !pview.oopen[det._key]; refreshVisibility(); });
      det._oldb = b; det._oldRows = []; }
    det._oldRows.push(row);
  }
  for (const [, , , det] of panelRows) if (det._oldb && !det._oldb.parentElement) det.appendChild(det._oldb);
}
// 某行是不是被「旧（待删）」收起：旧参数、这个效果没用上、模块的开关没打开、没在搜索 / 只看改过的
function legacyFolded(row, det, P, q, chg) { return !!row._legacy && !legacyInUse(row._it && (Array.isArray(row._it) ? row._it[0] : row._it.sel), P) && !(pview.oopen && pview.oopen[det._key]) && !q && !(pview.changed && chg); }
function p43LegacySync(P) {
  const seen = new Set();
  for (const [, , , det] of panelRows) {
    if (!det._oldb || seen.has(det)) continue; seen.add(det);
    const open = !!(pview.oopen && pview.oopen[det._key]), idle = det._oldRows.filter(r => r._applies && !legacyInUse(Array.isArray(r._it) ? r._it[0] : r._it.sel, P));
    det._oldb.hidden = !idle.length || !!pview.q || pview.changed;
    det._oldb.textContent = open ? `旧（待删）▾ 收起 ${idle.length} 项` : `旧（待删）▸ ${idle.length} 项没用上`;
    det._oldb.title = (open ? '点一下收起。' : '点一下显示。') + '5.0 要删的参数（参数宪章）：这个效果没用上，所以收起来了；用着的照常显示、名字前有「旧」。' + idle.map(r => r._lab).join('、');
    det._oldb.classList.toggle('on', open);
  }
}
function inertWhy(key, P) {
  if (!P) return '';
  for (const [ks, f, why] of INERT) if (ks.includes(key) && f(P)) return why;
  return '';
}
function p43Label(nm, fallback) { if (!nm) return fallback; const x = nm.id && typeof PEMIT !== 'undefined' ? PEMIT.P[nm.id] : null; return pview.en ? nm.en || nm.cn : (x && x[2]) || nm.cn || nm.en; }
const PMODULE = (() => { const m = {}; for (const x of (typeof PMODULES !== 'undefined' ? PMODULES : [])) m[x.cn] = x; return m; })();
// 返回 place(sec, it, key, nm) → 这一行该放进的模块（发射器 section 里的 details.mod）。4.4 没有「更多」：模块默认展开，模块本身可以收起（记住）
function p43Skeleton(host) {
  const secs = {}, mods = {};
  const emitSec = e => {
    if (secs[e]) return secs[e];
    const d = EMIT_DEF[e] || { n: e, en: '', lv: '', what: '', mods: [], i: 99 }, s = document.createElement('section');
    s.className = 'egrp pgrp p43'; s.dataset.g = e; s._i = d.i;
    s.innerHTML = `<div class="ehead"><b class="pg-t">${e}</b>${d.en ? `<small class="men">${d.en}</small>` : ''}${d.lv ? `<span class="elv">${d.lv}</span>` : ''}<span class="pg-n" hidden></span><p class="ewhat">${d.what || ''}</p></div>`;
    const after = [...host.querySelectorAll(':scope > section.egrp')].find(x => x._i > d.i);
    host.insertBefore(s, after || null); secs[e] = s; return s;
  };
  return (sec, it, key, nm) => {
    const x = emitOf(nm, sec), k = x.e + '›' + x.m;
    if (!mods[k]) {
      const s = emitSec(x.e), order = (EMIT_DEF[x.e] || {}).mods || [], d = document.createElement('details');
      d.className = 'sec mod'; d._auto = true; d.open = pview.mopen[k] != null ? pview.mopen[k] : true; setTimeout(() => d._auto = false, 0);
      d.innerHTML = `<summary>${x.m}</summary>`;
      d.addEventListener('toggle', () => { if (d._auto) return; pview.mopen[k] = d.open; store.set('pModOpen', pview.mopen); });
      d._sec = { sec: x.m }; d._g = x.e; d._mod = x.m; d._key = k; d._oi = order.includes(x.m) ? order.indexOf(x.m) : 99;
      const after = [...s.querySelectorAll(':scope > details.mod')].find(m => m._oi > d._oi);
      s.insertBefore(d, after || null); mods[k] = d;
    }
    return mods[k];
  };
}
function addModHelp(d, text) {
  let p = d.querySelector(':scope > p.hint');
  if (!p) { const b = document.createElement('span'); b.className = 'shelp'; b.setAttribute('role', 'button'); b.tabIndex = 0; b.title = '这个模块的说明'; b.textContent = '？';
    d.querySelector('summary').appendChild(b); p = document.createElement('p'); p.className = 'hint'; p.hidden = true; d.querySelector('summary').after(p);
    const tog = e => { e.preventDefault(); e.stopPropagation(); p.hidden = !p.hidden; b.classList.toggle('on', !p.hidden); if (!d.open) d.open = true; };
    b.addEventListener('click', tog); b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') tog(e); }); }
  p.insertAdjacentHTML('beforeend', `<span class="hsec">${text}</span>`);
}
// 随机折叠：本体参数行上一个「随机」按钮（显示现在的随机量），点开 / 收起它下面的随机行
function p43RandLinks() {
  const byKey = new Map(), keys = new Set();
  for (const [row, it] of panelRows) if (Array.isArray(it)) { byKey.set(it[0], row); keys.add(it[0]); }
  for (const [row, it] of panelRows) {
    if (!Array.isArray(it)) continue;
    const b = randBaseOf(it[0], keys), base = b && byKey.get(b); if (!base) continue;
    row._randOf = b; row.classList.add('rnd-row'); const list = base._rands || (base._rands = []);
    (list.length ? list[list.length - 1][0] : base).after(row);      // 随机行紧跟本体（本体可能在别的模块），几个随机按顺序排
    list.push([row, it]);
  }
  for (const [row] of panelRows) {
    if (!row._rands) continue;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rndb';
    btn.addEventListener('click', e => { e.preventDefault(); const k = row._it[0]; pview.ropen[k] = !pview.ropen[k]; store.set('pRandOpen', pview.ropen); refreshVisibility(); });
    row.appendChild(btn); row._rndb = btn;            // 单独一行，在滑杆下面
  }
}
function p43RandSync(P) {
  for (const [row] of panelRows) {
    if (!row._rndb) continue;
    const open = !!pview.ropen[row._it[0]], vals = row._rands.map(([r, it]) => { const v = +P[it[0]]; return isFinite(v) && v !== 0 ? `±${+(+v).toFixed(2)}${it[2] === '%' ? '%' : it[2] ? ' ' + it[2] : ''}` : ''; }).filter(Boolean);
    row._rndb.textContent = (open ? '随机 ▾' : '随机 ▸') + (vals.length ? ' ' + vals.join(' ') : '');
    row._rndb.classList.toggle('on', open); row._rndb.classList.toggle('set', !!vals.length);
    row._rndb.title = row._rands.map(([r]) => r._lab).join('、') + (open ? '（点一下收起）' : '（点一下展开）');
  }
}
// 空白发射器（4.3；4.4 放在发射器标签下面一行）：没加的部分整块藏起来；「+ 火花」加上，已加的有「去掉」
function p43BlankControls(host, P) {
  if (!isBlank(P)) return;
  const box = document.createElement('div'); box.className = 'addmod'; box.id = 'blankAdd';
  box.innerHTML = '<span class="hint">空白发射器只有星。要火花、尾迹、点灭 / 爆裂这些就加上：</span><span class="addmod-btns"></span>';
  host.appendChild(box);
}
function p43BlankSync(P) {
  const box = $('#blankAdd'); if (!box) return;
  const btns = box.querySelector('.addmod-btns'), has = P.mods || [], todo = Object.keys(BLANK_MODS).filter(m => !has.includes(m));
  btns.innerHTML = todo.map(m => `<button type="button" class="btn mini" data-addmod="${m}" title="${BLANK_MODS[m].what}">+ ${m}</button>`).join('')
    + has.filter(m => BLANK_MODS[m]).map(m => `<span class="addmod-on">${m}<button type="button" class="btn mini ghost modrm" data-rmmod="${m}" title="去掉「${m}」（它的参数回到不起作用的值）">去掉</button></span>`).join('');
  btns.querySelectorAll('[data-addmod]').forEach(b => b.addEventListener('click', () => { if (blankAddModule(state.P, b.dataset.addmod)) { buildMasterPanel(); onParam(); } }));
  btns.querySelectorAll('[data-rmmod]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); if (blankRemoveModule(state.P, b.dataset.rmmod)) { buildMasterPanel(); onParam(); } }));
}
// 4.6.0（5.0 第 1 步，用户 10-05 20:22「每一个子发射器拥有的参数都是全的」）：每个发射器都列同一套 9 个模块。
// 有参数的照常；没有参数的也列出来，写明「跟谁」或「为什么没有」——看得出哪些是全的、哪些借父级、哪些是物理上没有
const STD_MODS = ['生成', '形状', '初速', '受力', '寿命', '大小', '颜色', '亮度', '闪烁'];
const MOD_EMPTY = {
  '星': { 颜色: '在下面「颜色」一节：这一层的渐变图 + 变色（一层只有一条颜色）', 闪烁: '在「亮度」里：闪烁强度；点灭在「点灭」' },
  '火花': { 形状: '从星身上喷出（位置 = 星走过的路），没有单独的形状', 闪烁: '在「亮度」的随机下面：火花闪烁 / 闪烁频率' },
  '余烬': { 形状: '跟火花：从星身上喷出', 初速: '跟火花：「火花 › 初速」（跟随星体 / 速度随机）', 受力: '跟火花：「火花 › 受力」（阻力 / 下坠）', 颜色: '出生时的温度（跟火花），之后不降温', 闪烁: '跟火花的闪烁' },
  '分叉火花': { 形状: '从分叉的那粒火花身上甩出', 闪烁: '跟火花的闪烁' },
  '爆裂': { 受力: '小闪只亮零点几秒，原地不动（位置在出生那一刻算好：范围 + 速度 × 延迟）', 颜色: '跟这一层的颜色（灰度贴图 + 渐变图）；要别的颜色就拆层', 闪烁: '小闪本身就是一闪' },
  '子花': { 颜色: '跟这一层的颜色', 闪烁: '跟主星的闪烁强度' },
  '开花闪光': { 生成: '开花那一刻，固定 1 团', 形状: '在开花点', 初速: '不动', 受力: '不动', 颜色: '跟这一层的颜色', 闪烁: '—' },
};
function p43StdModules(host) {
  for (const g of host.querySelectorAll(':scope > section.egrp')) {
    const e = g.dataset.g; if (e === '效果' || e === '输出' || !MOD_EMPTY[e] && !/^自定义/.test(e)) continue;
    const order = (EMIT_DEF[e] || {}).mods || STD_MODS, have = new Set([...g.querySelectorAll(':scope > details.mod')].map(d => d._mod));
    for (const m of STD_MODS) {
      if (have.has(m)) continue;
      const d = document.createElement('details'); d.className = 'sec mod mod-empty'; d._ph = true; d._mod = m; d._g = e; d._key = e + '›' + m; d._oi = order.includes(m) ? order.indexOf(m) : 99; d.open = true;
      d.innerHTML = `<summary>${m}</summary><div class="mod-note">${(MOD_EMPTY[e] || {})[m] || '这个发射器没有这一项'}</div>`;
      const after = [...g.querySelectorAll(':scope > details.mod')].find(x => x._oi > d._oi); g.insertBefore(d, after || null);
    }
  }
}
