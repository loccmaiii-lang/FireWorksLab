// 隔离样板的纯函数桥接；以下定义逐字摘自源码。生成器维护，不手改。
const state = {tab:"master", repId:null};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const G = 9.81;
const isPhysBody = P => isTrail(P) && +P.trPhys > 0;
const rtVtOf = P => +P.rtVt > 0 ? +P.rtVt : Math.sqrt(4 / 3 * 600 * Math.max(0.03, +P.rtD || 0.15) * G / (1.2 * 0.47));
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
  if (x) return { e: x[0], m: x[1], n: x[2], i: x[3], c: x[4] || '', u: x[5] || '' };
  return { e: /输出|导出|画质|曝光|规格|入点/.test(sec && sec.sec || '') ? '输出' : '效果', m: nm && nm.mcn || (sec && sec.sec) || '其它', n: nm ? nm.cn : '', i: 9999 };
}
// 「××随机」挂在哪个本体参数下面（没列的按「键名去掉 Jit」找；找不到就照常单独一行）
const RAND_OF = { speedJit: 'v0', dirJit: 'v0', burnJit: 'burn', ignJit: 'ignDelay', afterJit: 'afterBurn', sparkRampJit: 'sparkRamp', sparkLifeJit: 'sparkLife',
  sparkInhJit: 'sparkInherit',     /* 4.9.50 sparkSpread 改成「线条宽度」（火花 › 大小），不再收在「跟随星体」的随机下面 */ twinkle: 'sparkBright', twinkleHz: 'sparkBright', starBright: 'sparkBright', subJit: 'subDelay', subSpeedJit: 'subSpeed', subScaleJit: 'subSpeed' };
function randBaseOf(key, keys) { const b = RAND_OF[key] || (/Jit$/.test(key) ? key.slice(0, -3) : ''); return b && keys.has(b) ? b : ''; }
const isCarrierType = P => P.type === 'senrin' || P.type === 'crossette';
const SPARK_KEYS = ['sparkRateEnd', 'sparkStop', 'sparkStart', 'sparkRamp', 'sparkRampJit', 'sparkLife', 'sparkLifeEnd', 'sparkLifeJit', 'sparkSpread', 'sparkSize', 'sparkInherit', 'sparkDrag', 'sparkGrav',
  'T0', 'cooling', 'sparkBright', 'twinkle', 'twinkleHz', 'emberFrac', 'tailJit', 'tailShoulder', 'tailWidth', 'tailPinchHead', 'tailPinchTail', 'tailBellyAt', 'sparkRise', 'starBright', 'tailHaze', 'tailHazeR', 'branch', 'branchAt', 'tailDiffuse', 'tailDiffuseScale', 'sparkStretch', 'sparkStretchJit'];
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
  [['preRoll', 'preScale0'], P => P.zoom === 'on', '「面片取景」是「随开花放大」时不起作用（Zoom 本来就从小放大）'],
  [['emberFrac', 'emberLife', 'emberBright', 'emberFollow', 'emberSize', 'emberEnd', 'emberAll'], P => +P.branch > 0, '「松叶分叉数」> 0 时不出余烬（分叉的火花占了余烬那一路）'],
  [['chaos'], P => !(+P.spin > 0), '「旋转速度」是 0 时不起作用'],
  // 地面：只有 1 个喷口时，喷口之间的间距、彗星扇面没有意义（喷泉的扇面角度是喷射张角，照样起作用）
  [['fanAngle'], P => typeof hasComets === 'function' && hasComets(P) && Math.round(+P.nozzles || 1) <= 1, '「喷口数」是 1 时不起作用（扇面角度是几个喷口之间张开的角度）'],
  [['spacing'], P => familyOf(P.type) === 'ground' && P.type !== 'shikake' && Math.round(+P.nozzles || 1) <= 1, '「喷口数」是 1 时不起作用'],
  [['fade', 'lastFlare', 'flicker', 'headSize', 'headTear', 'headDim', 'headDimUntil', 'strobeHz', 'strobeDuty', 'strobeStart', 'carrierHead'], P => !(+P.headBright > 0), '「星头亮度」是 0（星头不发光，只有尾迹 / 火花）时不起作用'],
  // 4.9.4：地面的喷口 / 灯芯亮点一直亮着、没有寿命；只有扇形 / 连发的彗星按「彗星燃烧」算寿命
  // 4.9.51：配了尺寸标定的效果导出按标定倍数，手动的导出缩放不管用（只看表，不量花径，面板刷新不卡）
  [['exportScale', 'exportScaleRise'], P => { if (typeof sizeSpecOf !== 'function') return false; const sp = sizeSpecOf(); return !!(sp && !sp.off); }, '这个效果按「导出尺寸」那一档导出（交付清单顶上选、写了倍数；选「原大」或「这次不按标定」这里才管用）'],
  [['starSizeCurve', 'starBrightCurve'], P => familyOf(P.type) === 'ground' && !(typeof hasComets === 'function' && hasComets(P)), '地面的喷口 / 灯芯亮点一直亮着，没有寿命；只有扇形、连发的彗星按「彗星燃烧」算寿命'],
];
// 4.9.0（5.0 第 3 步，参数宪章 + 参数表「删」「改成常量」，用户 19:40「全按推荐」）：代码先不删——你的配方、待验收效果里用着的照旧算，画面不变。面板上：
// - 这个效果用着（值不等于「不用」时的值）→ 照常显示，名字后面一个「旧」标记，说明条写为什么要删、用什么代替；
// - 没用上 → 收进模块底下的「旧（待删）· N 项」，点开才显示；搜索、只看改过的照样找得到。
// [为什么要删 / 用什么代替, 不用时的值（不写 = BASE 的默认值）, 用着没有（不写 = 值 ≠ 不用时的值）]
const LG_V5 = 'V5 尾缀的旧旋钮（RT6 起不用）';
const LG_PRE = '入点前另做从小放大（旧取景）；5.0 固定机位不用';
const LEGACY = {
  trPhys: [LG_V5], trTwist: [LG_V5], trTwistN: [LG_V5, null, P => +P.trTwist > 0], trWiggle: [LG_V5], trTwistLag: [LG_V5, null, P => +P.trTwist > 0],
  rtBall: ['线性阻力弹道（旧）；RT6 用平方阻力，升空时间是算出来的', 1], rtT: ['线性阻力弹道（旧）才用的升空时间；平方阻力时是算出来的', null, P => +P.rtBall !== 1],
  rtConeSoft: ['散开分布开关；5.0 固定一种', 0], rtGpuSafe: ['旧写法 GPU 发射器也写 Acceleration，UE 4.24 里标红', 1], rtTexCal: ['旧的贴图亮度口径（跟温度偏移漂）', 1],
  rtFdT: ['每档温度偏移；5.0 白黄对比由粒径决定'], rtMdT: ['每档温度偏移；5.0 白黄对比由粒径决定'], rtCdT: ['每档温度偏移；5.0 白黄对比由粒径决定'],
  rtStreakMax: ['拖影上限只夹外观；5.0 拖影由速度 × 快门决定'], rtLoopSize: ['固定长循环层（4.4 旧做法）', 1], rtLoopMin: ['循环层的人为最短长度；5.0 按星头可见长度自动算'],
  rtDotGain: ['粒子层另乘的总亮度（光晕、发射口不乘），名不副实'], rtDissolve: ['消散溶解终值；5.0 固定', 1],
  preRoll: [LG_PRE, 0, P => +P.cutIn > 0], preScale0: [LG_PRE, null, P => +P.preRoll > 0 && +P.preScale0 > 0],
  fpsFloor: ['旧帧计划才读；固定机位 + 匀速帧不读'],
  // 4.9.13：开花段时长 burstSec、淡出起点 fadeAt 是按运动分的参数，帧数分配默认改回按运动分（用户 10-06 15:15）后不再是旧
  trimLead: ['开头空白不烘；5.0 固定为裁掉', 1],
  tailWidth: ['和「火花 › 大小」的线条宽度、颗粒大小重了（线宽 × 这个数、颗粒 × √）；新做的用那两个米数（4.9.50，用户 10-08 16:2x「按米重理」）', 1],
};
const legacyOf = k => LEGACY[k] || (/^ph[A-Z]/.test(k) ? ['物理尾缀（已归档）的参数'] : null);
function legacyInUse(k, P) {
  const L = legacyOf(k); if (!L || !P) return false;
  if (L[3]) return !!L[2](P);                     // 4.9.5：只看条件（例：帧数模式），不看值
  const off = L[1] != null ? L[1] : BASE[k], v = P[k];
  if (v == null || String(v) === String(off) || (typeof off === 'number' && +v === off)) return false;
  return L[2] ? !!L[2](P) : true;
}
// 面板建好以后：给旧参数行打标记，每个模块底下一个「旧（待删）· N 项」开关（refreshVisibility 里按用没用上收起 / 显示）
// 4.9.8（对话框23）：「旧（待删）」开关一个发射器一个，放在发射器末尾（以前每个模块底下一个，占行）
function p43Legacy() {
  for (const [row, it, , det] of panelRows) {
    const k = Array.isArray(it) ? it[0] : it.sel || ''; const L = k && legacyOf(k); if (!L) continue;
    row._legacy = L; row.classList.add('legacy');
    const nm = row.querySelector('.k, .fk'); if (nm && !nm.querySelector('.old-tag')) nm.insertAdjacentHTML('afterbegin', `<span class="old-tag" title="5.0 要删：${L[0]}">旧</span>`);
    const g = det.closest('section.egrp'); if (!g) continue;
    if (!g._oldb) { const b = document.createElement('button'); b.type = 'button'; b.className = 'oldb'; b.hidden = true;
      b.addEventListener('click', e => { e.preventDefault(); pview.oopen = pview.oopen || {}; pview.oopen[g.dataset.g] = !pview.oopen[g.dataset.g]; refreshVisibility(); });
      g._oldb = b; g._oldRows = []; }
    det._oldb = g._oldb; g._oldRows.push(row);
  }
  for (const g of document.querySelectorAll('#params > section.egrp')) if (g._oldb && !g._oldb.parentElement) { const me = g.querySelector(':scope > .mod-empties'); g.insertBefore(g._oldb, me || null); }
}
// 某行是不是被「旧（待删）」收起：旧参数、这个效果没用上、发射器的开关没打开、没在搜索 / 只看改过的
function legacyFolded(row, det, P, q, chg) { return !!row._legacy && !legacyInUse(row._it && (Array.isArray(row._it) ? row._it[0] : row._it.sel), P) && !(pview.oopen && pview.oopen[det._g]) && !q && !(pview.changed && chg); }
function p43LegacySync(P) {
  for (const g of document.querySelectorAll('#params > section.egrp')) {
    if (!g._oldb) continue;
    const open = !!(pview.oopen && pview.oopen[g.dataset.g]), idle = g._oldRows.filter(r => r._applies && !legacyInUse(Array.isArray(r._it) ? r._it[0] : r._it.sel, P));
    g._oldb.hidden = !idle.length || !!pview.q || pview.changed;
    g._oldb.textContent = open ? `旧（待删）▾ 收起 ${idle.length} 项` : `旧（待删）▸ ${idle.length} 项没用上`;
    g._oldb.title = (open ? '点一下收起。' : '点一下显示（显示在各自的模块里）。') + '5.0 要删的参数（参数宪章）：这个效果没用上，所以收起来了；用着的照常显示、名字前有「旧」。' + idle.map(r => r._lab).join('、');
    g._oldb.classList.toggle('on', open);
  }
}
// 4.9.14（对话框23，用户 10-06 15:15「回滚再来」，照 01_顺手调参_深化）：模块里不再收「更多」——模块默认收起、标题右边写摘要，点开整块参数都露出来。
// （4.4.0 去掉过「更多」；4.9.8 又加回来，结果 4.9.11 留下的 14 项看不见。）收起 / 展开按模块记住
function inertWhy(key, P) {
  if (!P) return '';
  for (const [ks, f, why] of INERT) if (ks.includes(key) && f(P)) return why;
  return '';
}

const AUTO_DEF = {
  subKeep: [0, P => P.subPattern === 'cross' ? 0.25 : 0.35, '按子花样式：千轮 0.35，分裂 0.25', -1],
  subSpeedJit: [0, P => +P.speedJit || 0, '同主层的「初速随机」', -1],
  subGrav: [0, P => P.grav == null ? 1 : +P.grav, '同主层的「重力倍率」', -1],
  subFlash: [0, P => +(+P.flash * 0.3).toFixed(3), '主层开花闪光的 0.3 倍', -1],
  // 4.6.0（5.0 第 1 步）：以前藏在代码里的联动，现在看得见、能断开
  flashR: [0.5, P => +Math.max(2, (+P.v0 || 0) * 0.045).toFixed(2), '按初速：初速 × 0.045，至少 2 m', -1],
  subSize: [0.05, P => +(+P.headSize || 1).toFixed(2), '同主星的大小', -1],
  subBright: [0, P => +(+P.headBright).toFixed(2), '同主星的亮度', -1],
  subFlashR: [0.1, P => +Math.max(1, (+P.subSpeed || 0) * 0.05).toFixed(2), '按子花初速：子花初速 × 0.05，至少 1 m', -1],
  // 4.9.0：「0 = 跟谁」的几项也换成链条
  subVt: [1, P => +(+P.vt || 0).toFixed(1), '同主层的「终端速度」', 0],
  rtVt: [1, P => +(typeof rtVtOf === 'function' ? rtVtOf({ ...P, rtVt: 0 }) : 0).toFixed(1), '按弹径算（球形弹体在空气中的终端速度）', 0],
  rtFadeFps: [1, () => 30, '自动 30 fps', 0],
  // 4.9.5（宪章遗漏 1，输出栏收口）：「算出来的」帧率 / 张数也用链条——接着 = 灰字显示这次烘焙算出来的，改了就用你填的
  holdTicks: [1, () => outCalc().hold, '放得下的最快（1 = 30 fps、2 = 15、3 = 10）', 0],
  pageTarget: [1, () => outCalc().pages, '从 1 张起，放不下自动加', 1, v => !(+v > 1)],
};
const autoLinked = (k, v) => { const a = AUTO_DEF[k]; return !!a && (a[4] ? a[4](v) : a[3] === 0 ? !(+v > 0) : !(+v >= 0)); };

const GRID_OPTS = [1, 2, 4, 8, 16, 32];
function formOptions(P) {
  const fam = familyOf(P.type);
  if (fam === 'ground') return [['loop', '地面循环（周期性烘焙，首尾无缝）']];
  // 4.3（清理清单 A6）：升空尾缀只留 V5 形式（尾缀序列）。打开的条目本身是别的形式（RT4 循环层 + 粒子、旧的物理 / 单元）时，保留它自己那一种，免得改坏
  if (fam === 'rise') {
    const ALL = { trail: '尾缀序列（V5：循环 + 消散，速度朝向）', emitset: '循环层 + 粒子发射器（RT4 用的形式）', phys: '实时物理模拟（旧，贴图用 trail_phys_bake.py 导出）', unit: '星头循环 + 弹道与火花发射器参数（旧）', master: '整段大面片（旧）' };
    const o = [['trail', ALL.trail]]; if (P.form && P.form !== 'trail' && ALL[P.form]) o.push([P.form, ALL[P.form]]); return o;
  }
  // 4.9.25：单束不在这里选了——在「导出方案」（交付清单的产物表 / 输出 › 直接调 / 层页头）里选 PC 单束
  return [['master', '大面片母版'], ['segments', '分段母版（按实际帧数分配贴图）']];
}

function bakeKind(P) {
  const fam = familyOf(P.type);
  if (fam === 'ground') return 'loop';
  if (fam === 'rise') return P.form === 'master' ? 'master' : P.form === 'trail' ? 'trail' : P.form === 'emitset' ? 'emitset' : 'riseLoop';
  if (P.form === 'unit' && unitAllowed(P)) return 'unit';
  if (P.form === 'segments') return 'segments';
  return 'master';
}
function unitAllowed(P) { return familyOf(P.type) === 'aerial' && !['senrin', 'crossette', 'hachi'].includes(P.type) && (P.pattern === 'sphere' || P.pattern === 'half'); }

window.ParameterSource = {version:VERSION, schema:SCHEMA, defaultsFor, typeNames:TYPE_NAMES, typeGroups:TYPE_GROUPS, auto:AUTO_DEF, autoLinked, inertWhy, legacyOf, legacyInUse, spread:SPREAD_VIEW, applyShellNo, retimeP, retimeM, tempoOf, shellCompact:tempoShellCompact, tierTypes:TYPES, familyOf, blankHas, formOptions,gridOptions:GRID_OPTS,bakeKind,usesTickPlan40,isSeq,unitAllowed};