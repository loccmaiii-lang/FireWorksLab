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
function pnameOf(sec, key, label) { const a = PNAME.get(sec + '|' + key); if (!a) return /^sparkGraph\..*\.\d+$/.test(key) ? pnameOf(sec, key.replace(/\.\d+$/, ''), label) : null;     /* 4.9.87 分层粒子图：三个数 / 向量的每一项用这个字段的那一行 */ if (a.length > 1 && label != null) { const L = String(label); return a.find(r => r.old === L || L.startsWith(r.old) || r.old.startsWith(L.split('（')[0])) || a[0]; } return a[0]; }
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
// 4.9.88（对话框相机渲染，用户 10-14 13:09「我新创建的金曜菊-B调没有效果……旧的存好了的文件，都没有接入」）：
// 4.9.50 以后加的星头 / 火花参数一直没进「这一层没有星头 / 没有火花」两条规则——没有火花的层（点灭星、星头层）上火花形状 / 亮度随机 / 燃尽后气流……
// 照样亮着、拖了没反应；星头不亮的层上星头拉长 / 六边形 / 星头光晕也一样。实测：analysis/scripts/存档逐层体检.py（你的 20 个存档 35 层）。
// 火花：「尾缀（炭火火花）」这一节里除了生成率本身，全部跟「火花生成率 = 0」走——按节取，以后这一节加的参数自动带上，不用再记得往名单里加。
const sectionKeys43 = name => SCHEMA.filter(s => s.sec === name).flatMap(s => (s.items || []).map(it => Array.isArray(it) ? it[0] : it.sel || it.curve).filter(Boolean));
const SPARK_KEYS_ALL = [...new Set([...SPARK_KEYS, ...sectionKeys43('尾缀（炭火火花）').filter(k => k !== 'sparkRate')])];
// 星头：4.9.50 / 4.9.58 的星头形状、星头光晕，星头亮度 0 时不起作用——但自定义发射器放出来的「星」也是星头（20_sim.js gather [0, gHead)），
// 六边形还画在爆裂小闪 / 落水闪光 / 自定义发射器的光点上（40_gl.js drawHeads 整批 PT_HEXON），这些开着时照样起作用（存档逐层体检：扇形彗星 · 我的 第 2 层开着自定义发射器 1，六边形改了画面变）。
// 星头大小、大小随机：「火花 › 跟星头大小」开着时还管火花从多大的范围出生
const exLit43 = P => +P.x1On > 0 || +P.x2On > 0;
const HEAD_SHAPE_KEYS = ['headStretch', 'headStretchJit', 'headKnots', 'headLumpy', 'headDouble', 'headHaloOwn', 'headHaloFrac', 'headHaloR'];
// 「光点与曝光」的光晕除了星头，还画在：火花（千轮 / 分裂是子弹尾、子星尾）、爆裂小闪、落水闪光、自定义发射器的光点（20_sim.js gather、40_gl.js drawHeads / drawSparksGPU）。
// 星头设了「星头单独」、这些又都没有 → 这一层的光晕占比 / 半径管不到任何东西（金曜菊-B 第 3 层点灭星：星头单独、占比 0、没有火花 → 改光晕画面一个像素都不变）
const headHaloFracOf = P => P.headHaloFrac == null ? .22 : +P.headHaloFrac;
const headOwnHalo = P => +P.headHaloOwn === 1 && familyOf(P.type || 'kiku') === 'aerial';     // 和 05_quality.js qualityOf 的 headHalo 同一个条件
const layerHaloOthers = P => (isCarrierType(P) ? +P.carrierTail > 0 || +P.subTail > 0 : +P.sparkRate > 0) || +P.crackle > 0 || +P.waterRefl > 0 || +P.x1On > 0 || +P.x2On > 0;
// 不起作用的条件（空中类）：[键, 条件, 原因]。依据：analysis/probe/参数有效性/（云端：拨了曲线 / 帧计划都不变）+ analysis/results/SMOKE15/参数有效性/（本机：再加 4 个时刻的定帧画面也不变）+ 代码（20_sim.js、40_gl.js）
// 4.9.86：尾缀「合成一张」时只在实时模拟里画的行（GPU 粒子、引擎里加的效果、烟带、粒子层亮度）
// 4.9.89（导出排查 B4）：分成两组——这几项还决定贴图里留多少火花（GPU 那份从贴图里扣，手机近段的贴图也按它），只有两个平台都合成一张时才不起作用：
const RT_GPU_SPLIT_KEYS = ['rtGpuC', 'rtGpuM', 'rtGpuF', 'rtGpuMax', 'rtPopRate'];
//   别的只在 GPU 粒子 / 引擎里加的效果里：PC 合成一张时哪份导出都没有（手机 _M 的尾缀本来只有近段循环）
const RT_LIVE_KEYS = ['rtGpuTw', 'rtGpuDisp', 'rtGpuGain', 'rtDotGain',
  'rtGlow', 'rtGlowSize', 'rtGlowSizeCurve', 'rtGlowBrightCurve', 'rtPopI', 'rtPopSize', 'rtPopAt', 'rtPopSizeCurve', 'rtPopBrightCurve',
  'rtLaunch', 'rtLaunchSize', 'rtLaunchN', 'rtLaunchV', 'rtLaunchCone', 'rtLaunchI', 'rtLaunchSizeCurve', 'rtLaunchBrightCurve', 'rtLaunchSparkSizeCurve', 'rtLaunchSparkBrightCurve',
  'rtSmoke', 'rtSmokeRate', 'rtSmokeLife', 'rtSmokeSize', 'rtSmokeGrow', 'rtSmokeSizeCurve', 'rtSmokeBrightCurve'];
// 4.9.89（导出排查 A4）：纯星头 = 一颗粒子沿弹道走（PC 单帧小面片、手机软圆点），没有序列帧
const RT_HEAD_INERT = ['zoom', 'frameBudget', 'holdTicks', 'maxHold', 'maxHoldBurn', 'rtGrid', 'outMode', 'rtLoopMin', 'rtLoopSize', 'rtMobileTex', 'shutter'];
const INERT = [
  [['sparkGraph.scaleCone','sparkGraph.scaleWidth','sparkGraph.scaleLife','sparkGraph.scaleGain'], P => !!P.sparkGraph && !P.sparkGraph.emitters.some(e=>!e.parent&&Math.round(e.count*(P.sparkGraph.scaleCount??1))>0), '整体数量与根层数量相乘后为0，没有粒子；先增加粒子数量倍率或根层每周期粒子数'],
  [['sparkGraph.scaleCone'], P => !!P.sparkGraph && !P.sparkGraph.emitters.some(e=>e.directionMode==='cone'&&e.cone>0&&e.speed[1]>0), '当前图没有非零半锥角的锥形运动层；球形散射不受半锥角倍率影响'],
  [['coreProfile'], P => isTrail(P), 'V5尾缀沿用已通过的高斯核；本选项不改变它和开花闪光'],
  [['exposureTarget'], P => isTrail(P) || isPhys(P) || isEmit(P), '这类产物目前不使用「建议曝光」；可直接调贴图曝光'],
  [['ignJit', 'ignSeed'], P => !(+P.ignDelay > 0) && !isCarrierType(P), '「点火延迟」是 0 时不起作用（随机的是点火延迟的长短）'],
  [['headDim'], P => +P.headDim < 1 && !(+P.headDimUntil > 0), '「前段结束」是 0 时不起作用：先设前段到第几秒结束'],
  [['turbScale'], P => !(+P.turb > 0), '「湍流强度」是 0 时不起作用'],
  [['burn', 'ignDelay', 'ignJit', 'ignSeed', 'afterBurn', 'afterJit'], P => isCarrierType(P), '千轮 / 分裂的星是子弹：子弹飞多久看「子花开花时刻」，子星看「子花 › 燃烧时间」；这一项对它们不起作用'],
  [['sparkRate'], P => isCarrierType(P), '千轮 / 分裂：子弹的火花看「子弹火花率」，子星的火花看「子星火花率」；这一项不起作用'],
  [SPARK_KEYS_ALL, P => !isCarrierType(P) && !(+P.sparkRate > 0), '「火花生成率」是 0（这一层没有火花）时不起作用'],
  [SPARK_KEYS_ALL, P => isCarrierType(P) && !(+P.carrierTail > 0) && !(+P.subTail > 0), '「子弹火花率」「子星火花率」都是 0（这一层没有火花）时不起作用'],
  // 4.9.88 光晕被「星头单独」盖住
  [['haloFrac', 'haloR'], P => headOwnHalo(P) && !layerHaloOthers(P), '这一层的星头用自己的光晕（星 › 大小 › 星头光晕 = 星头单独设），这一行只管火花、爆裂小闪、落水闪光和自定义发射器的光点，这一层都没有。要星头跟这里走：把「星头光晕」改回「跟这一层」'],
  [['haloShape', 'haloBeta'], P => headOwnHalo(P) && !(headHaloFracOf(P) > 0) && !layerHaloOthers(P), '星头单独设光晕、星头光晕占比又是 0（星 › 大小），这一层也没有火花 / 爆裂小闪 / 自定义发射器的光点：光晕形状没有东西可画'],
  [['headHaloR'], P => headOwnHalo(P) && !(headHaloFracOf(P) > 0), '「星头光晕占比」是 0（星头没有光晕）时不起作用'],
  [['emberAll'], P => !(+P.sparkStop > 0), '「火花停止时刻」是 0 时不起作用（火花本来就全程都有，余烬也一样）'],
  // 4.3（H13 / 渲染基础问题清单审计 4.4）：
  [['headDimUntil'], P => !(+P.headDim < 1), '「前段亮度」是 1（不压暗）时不起作用：先把前段亮度调到 1 以下'],
  [['preRoll', 'preScale0'], P => P.zoom === 'on' || P.zoom === 'anchor', '「面片取景」是「随开花放大」时不起作用（Zoom 本来就从小放大）'],
  [['emberFrac', 'emberLife', 'emberBright', 'emberFollow', 'emberSize', 'emberEnd', 'emberAll'], P => +P.branch > 0, '「松叶分叉数」> 0 时不出余烬（分叉的火花占了余烬那一路）'],
  [['chaos'], P => !(+P.spin > 0), '「旋转速度」是 0 时不起作用'],
  // 地面：只有 1 个喷口时，喷口之间的间距、彗星扇面没有意义（喷泉的扇面角度是喷射张角，照样起作用）
  [['fanAngle'], P => typeof hasComets === 'function' && hasComets(P) && Math.round(+P.nozzles || 1) <= 1, '「喷口数」是 1 时不起作用（扇面角度是几个喷口之间张开的角度）'],
  [['spacing'], P => familyOf(P.type) === 'ground' && P.type !== 'shikake' && Math.round(+P.nozzles || 1) <= 1, '「喷口数」是 1 时不起作用'],
  [['fade', 'lastFlare', 'flicker', 'headTear', 'headDim', 'headDimUntil', 'strobeHz', 'strobeDuty', 'strobeStart', 'carrierHead'], P => !(+P.headBright > 0), '「星头亮度」是 0（星头不发光，只有尾迹 / 火花）时不起作用'],
  // 4.9.88：headSize 从上一条挪出来（跟星头大小开着时它管火花出生范围）；4.9.50 / 4.9.58 的星头参数补上
  [['headSize'], P => !(+P.headBright > 0) && !(+P.sparkSpawnHead > 0), '「星头亮度」是 0（星头不发光）时不起作用；「火花 › 跟星头大小」开着时它还管火花出生的范围，那时照样起作用'],
  [HEAD_SHAPE_KEYS, P => !(+P.headBright > 0) && !exLit43(P), '「星头亮度」是 0（星头不发光）、也没开自定义发射器时不起作用'],
  [['headSizeJit'], P => !(+P.headBright > 0) && !exLit43(P) && !(+P.sparkSpawnHead > 0), '「星头亮度」是 0（星头不发光）、也没开自定义发射器时不起作用；「火花 › 跟星头大小」开着时它还管火花出生的范围'],
  [['headHex', 'headHexRot'], P => !(+P.headBright > 0) && !exLit43(P) && !(+P.crackle > 0) && !(+P.waterRefl > 0), '「星头亮度」是 0，也没有爆裂小闪 / 落水闪光 / 自定义发射器（六边形画在这一层所有星头式的光点上）时不起作用'],
  // 4.9.4：地面的喷口 / 灯芯亮点一直亮着、没有寿命；只有扇形 / 连发的彗星按「彗星燃烧」算寿命
  // 4.9.51：配了尺寸标定的效果导出按标定倍数，手动的导出缩放不管用（只看表，不量花径，面板刷新不卡）
  // 4.9.80（导出排查 ⑥）：多层效果导出不看每层的导出缩放（大小按层页头「缩放」+ 交付清单顶上的「导出尺寸」），以前这一行照样能选、导出却没用
  [['exportScale', 'exportScaleRise'], P => typeof state !== 'undefined' && state.tab === 'combo', '多层效果：大小按层页头「这一层在整朵里 › 缩放」和交付清单顶上的「导出尺寸」；这一行只管单层导出'],
  [['exportScale', 'exportScaleRise'], P => { if (typeof sizeSpecOf !== 'function') return false; const sp = sizeSpecOf(); return !!(sp && !sp.off); }, '这个效果按「导出尺寸」那一档导出（交付清单顶上选、写了倍数；选「原大」或「这次不按标定」这里才管用）'],
  [['starSizeCurve', 'starBrightCurve'], P => familyOf(P.type) === 'ground' && !(typeof hasComets === 'function' && hasComets(P)), '地面的喷口 / 灯芯亮点一直亮着，没有寿命；只有扇形、连发的彗星按「彗星燃烧」算寿命'],
  // 4.9.86（导出（23）审查 4.9.82–4.9.85，用户 10-14 10:29「有些效果加了我好像调了也没什么用」）：依据是代码（47_risetail.js bakeRiseTailFull 把 GPU 颗数清零、
  //   fwlEmitSetFull 只写 1 个发射器、rtLayoutFar 合成时不按交接年龄、近段 + 远段时不烘消散序列）+ 审查时的拨参对照（同一帧贴图不变）
  // 4.9.102（导出排查 V5）：「合成一张时烘进贴图」（rtFullFx）开着时引擎里加的效果 / 落火 / 远看直径 / 粒子层亮度都烘进那一张，只剩 GPU 火花自己的几项不起作用
  [RT_LIVE_KEYS, P => isEmit(P) && typeof rtPcFull === 'function' && rtPcFull(P) && !rtFxOn(P), 'PC「近段 + 远段合成一张」：哪份导出里都没有这一项（GPU 粒子 / 引擎里加的效果；手机 _M 的尾缀只有近段循环）；4.9.89 起实时模拟也不画它，看到的 = 导出的。要烘进去：「尾缀 · 引擎里加的效果 › 合成一张时烘进贴图」选「烘进」'],
  [['rtGpuTw'], P => isEmit(P) && typeof rtPcFull === 'function' && rtPcFull(P) && rtFxOn(P), 'PC「近段 + 远段合成一张」：火花全烘进那一张，没有 GPU 闪烁火花，这一项不起作用'],
  [RT_GPU_SPLIT_KEYS, P => isEmit(P) && typeof rtFullOnly === 'function' && rtFullOnly(P) && !rtFxOn(P), '两个平台都「近段 + 远段合成一张」：火花全烘进那一张，GPU 粒子预算不起作用'],
  [['rtGpuC', 'rtGpuM', 'rtGpuF'], P => isEmit(P) && typeof rtFullOnly === 'function' && rtFullOnly(P) && rtFxOn(P), '两个平台都「近段 + 远段合成一张」：火花全烘进那一张，GPU 粒子预算不起作用'],
  [RT_HEAD_INERT, P => isEmit(P) && typeof rtHeadOnly === 'function' && rtHeadOnly(P), '纯星头：一颗粒子沿弹道走（PC 单帧小面片、手机软圆点），没有序列帧可分配、没有循环层；入点 / 出点、亮度照样起作用'],
  [['rtLoopMin', 'rtLoopSize'], P => isEmit(P) && typeof rtFullOnly === 'function' && rtFullOnly(P), '两个平台都「近段 + 远段合成一张」：没有循环层，这一项不起作用'],
  [['rtMobileTex'], P => isEmit(P) && P.outMobile === 'off', '手机选了「不出」：手机贴图边长不起作用'],
  [['rtMobile'], P => isEmit(P) && typeof RT_MOBILE_PARTICLES !== 'undefined' && !RT_MOBILE_PARTICLES, '手机 _M 的尾缀只留近段循环（4.9.69，用户 10-12 21:34「手机尾缀不要cpu火花粒子了」）：手机粒子比例不起作用'],
  // 4.9.89（导出排查 A8 / A9）：「星头火花输出 · 分开」只有单层、PC 合成一张时才导出两张
  [['outMode'], P => typeof state !== 'undefined' && state.tab === 'combo', '多层效果：素材包一律星头火花合并（4.9.89 起预览也合并，看到的 = 导出的）；要分开只能单层导出'],
  [['outMode'], P => typeof emitFullOut === 'function' && emitFullOut(P) && typeof rtPcFull === 'function' && !rtPcFull(P), '只有 PC 选「合成一张」时能分开（PC 两张、两个发射器）；手机一律合一张'],
  [['rtERate', 'rtELife', 'rtESize', 'rtEI', 'rtEKd', 'rtESizeCurve', 'rtEBrightCurve'], P => isEmit(P) && typeof rtFullOnly === 'function' && rtFullOnly(P) && +P.rtETex !== 1 && !rtFxOn(P), '合成一张时落火是 GPU 粒子，不进贴图：只有单层「实时模拟」还画它，「引擎回放」和多层效果里都没有；要进贴图先把「落火进入合并贴图」或「合成一张时烘进贴图」打开'],
  [['rtNearA0', 'rtNearA1', 'rtNearExpo'], P => isEmit(P) && typeof rtFullOnly === 'function' && rtFullOnly(P), '两个平台都「近段 + 远段合成一张」时不起作用（没有近段 / 远段交接）'],
  [['rtFadeFps', 'rtDissolve'], P => isEmit(P) && +P.rtFar === 1, '「近段 + 远段」没有消散序列（开花后的火花都在远段里），这一项不起作用'],
  // 4.9.102（导出排查 V5 ③，用户 10-14 14:14 按推荐「燃尽门只作用在曲线上」）：落火不再另乘燃尽门，进没进贴图都一样只看曲线
  [['rtTailAfterBurn'], P => isEmit(P) && !['F', 'M', 'C', 'E'].some(k => parseCurve(P['rt' + k + 'SizeCurve']) || parseCurve(P['rt' + k + 'BrightCurve'])),
    '火星 / 落火的「大小 / 亮度随寿命」曲线都没填时不起作用：燃尽后渐入的只是这些曲线（4.9.102 起落火上升段照常可见），先填曲线'],
  [['sparkTailAfterBurn'], P => !['sparkSizeCurve', 'sparkBrightCurve', 'emberSizeCurve', 'emberBrightCurve'].some(k => parseCurve(P[k])) && !(+P.waterRefl > 0),
    '火花 / 余烬的「大小 / 亮度随寿命」曲线都没填时不起作用：燃尽后按剩余寿命走的是这些曲线，先填曲线'],
  [['shutter'], P => !!P.cameraMotion && typeof cameraApplies === 'function' && cameraApplies(P), '「镜头成像 › 快门运动模糊」开着：运动模糊按那里的曝光时间算，这一项不起作用'],
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
function p43Label(nm, fallback) { if (!nm) return fallback; const x = nm.id && typeof PEMIT !== 'undefined' ? PEMIT.P[nm.id] : null; return pview.en ? nm.en || nm.cn : (x && x[2]) || nm.cn || nm.en; }
const PMODULE = (() => { const m = {}; for (const x of (typeof PMODULES !== 'undefined' ? PMODULES : [])) m[x.cn] = x; return m; })();
// 4.9.5（宪章遗漏 1，输出栏收口）：大面片 / 分段 / 地面循环的「输出」只展开「直接调」「算出来的」，别的模块默认收起（点开会记住）
const OUT_FIRST = ['直接调', '算出来的'];
// 4.9.14：模块默认收起（标题右边写摘要，一眼看完一个发射器有哪些模块、各是多少）；每个发射器第一个有参数的模块默认展开，示范怎么调；
// 序列效果的「输出」照旧先展开「直接调」「算出来的」（交互宪章第 2 节输出栏收口）。你开合过的按你的（pModOpen）
function modDefaultOpen(key) {
  const [e, m] = String(key).split('›');
  if (e === '输出' && typeof isSeq === 'function' && isSeq(state.P)) return OUT_FIRST.includes(m);
  return !!(pview.defOpen && pview.defOpen[key]);
}
// 程序开 / 关模块（默认、搜索时自动展开）不算你开合过：记下要的样子，toggle 事件来了对得上就不存。
// （4.9.13 以前用「_auto + setTimeout 0」挡：details 的 toggle 事件和定时器不是同一个任务队列，定时器先跑时程序的开合被当成你点的存下来——
// 4.9.14 改成默认收起后，换花型时会把「生成」记成你收起的）
function modSetOpen(d, v) { v = !!v; if (d.open === v) return; d._prog = v; d.open = v; }
function modProgToggle(d) { if (d._prog === undefined) return false; const p = d._prog; d._prog = undefined; return p === d.open; }
// 面板建好、按适用的行显示 / 隐藏以后：每个发射器第一个有适用参数的模块记为「默认展开」；你没开合过的模块按默认开 / 关
function p43DefaultOpen() {
  pview.defOpen = {};
  for (const g of document.querySelectorAll('#params > section.egrp')) {
    // 按「这个花型有没有这一项」挑（_applies），不按现在显不显示——搜索 / 仅改动时模块都可能藏着，清掉以后要回到默认
    const first = [...g.querySelectorAll(':scope > details.mod')].find(d => [...d.children].some(r => r._applies && !r._randOf)); if (first) pview.defOpen[first._key] = true;
  }
  for (const d of document.querySelectorAll('#params details.mod')) {
    if (pview.mopen[d._key] != null || d._autoOpen) continue;
    modSetOpen(d, modDefaultOpen(d._key));
  }
}

// 4.9.8（对话框23，用户 10-06 12:30「放到发射器的框右上角，鼠标停留1.5s出现一个x，我点就删除，不要放在颜色模块中」）：
// 只有能去掉的发射器（自定义发射器）有 ×：鼠标在发射器框里停 1.5 秒出现，移开收起；键盘 Tab 进这个框马上出现。点了 = 去掉（Ctrl+Z 撤回）
const EDEL_DELAY = 1500;
function edelBind(sec) {
  let t = 0; const show = on => { const b = sec.querySelector('.edel'); if (b) b.classList.toggle('on', on); };
  sec.addEventListener('pointerenter', () => { clearTimeout(t); t = setTimeout(() => show(true), EDEL_DELAY); });
  sec.addEventListener('pointerleave', () => { clearTimeout(t); if (!sec.contains(document.activeElement)) show(false); });
  sec.addEventListener('focusin', () => { clearTimeout(t); show(true); });
  sec.addEventListener('focusout', e => { if (!sec.contains(e.relatedTarget) && !sec.matches(':hover')) show(false); });
}
// 返回 place(sec, it, key, nm) → 这一行该放进的模块（发射器 section 里的 details.mod）。4.4 没有「更多」：模块默认展开，模块本身可以收起（记住）
function p43Skeleton(host) {
  const secs = {}, mods = {};
  const emitSec = e => {
    if (secs[e]) return secs[e];
    const d = EMIT_DEF[e] || { n: e, en: '', lv: '', what: '', mods: [], i: 99 }, s = document.createElement('section');
    s.className = 'egrp pgrp p43'; s.dataset.g = e; s._i = d.i;
    const xi = /^自定义 (\d+)$/.exec(e);
    s.innerHTML = `<div class="ehead"><b class="pg-t">${e}</b>${d.en ? `<small class="men">${d.en}</small>` : ''}${d.lv ? `<span class="elv">${d.lv}</span>` : ''}<span class="pg-n" hidden></span>`
      + (xi ? `<button type="button" class="edel" data-exoff="${xi[1]}" aria-label="去掉「${e}」" title="去掉「${e}」（Ctrl+Z 能撤回）">×</button>` : '')
      + `<button type="button" class="ewhat" title="点一下看完整说明" aria-expanded="false">${d.what || ''}</button></div>`;
    if (xi) edelBind(s);
    const ew = s.querySelector('.ewhat'); ew.addEventListener('click', () => { const open = ew.classList.toggle('full'); ew.setAttribute('aria-expanded', String(open)); });
    const after = [...host.querySelectorAll(':scope > section.egrp')].find(x => x._i > d.i);
    host.insertBefore(s, after || null); secs[e] = s; return s;
  };
  return (sec, it, key, nm, ov) => {
    const x = ov ? { ...emitOf(nm, sec), ...ov } : emitOf(nm, sec), k = x.e + '›' + x.m;     // 4.9.87 ov：分层粒子图每层一个发射器（层名），模块按行指定
    if (!mods[k]) {
      const s = emitSec(x.e), order = (EMIT_DEF[x.e] || {}).mods || [], d = document.createElement('details');
      d.className = 'sec mod'; modSetOpen(d, pview.mopen[k] != null ? pview.mopen[k] : modDefaultOpen(k));
      d.innerHTML = `<summary>${x.m}</summary>`;
      d.addEventListener('toggle', () => { if (typeof modSummarySync === 'function') modSummarySync(); if (modProgToggle(d)) return; pview.mopen[k] = d.open; store.set('pModOpen', pview.mopen); });
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
    const txt = [open ? '随机 ▾' : '随机 ▸', vals.length ? ' ' + vals.join(' ') : ''];     // 4.9.14：左「随机」右边随机量（一行子项）
    if (row._rndb.textContent !== txt.join('')) row._rndb.innerHTML = `<span class="rk">随机<span class="ra">${txt[0].slice(2)}</span></span><span class="rv">${txt[1]}</span>`;
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
// 4.9.8（对话框23，用户 10-06 12:30「尽量精简描述，描述用词专业点……可以书面化精简些」）：没有参数的模块不再一个个占位，
// 在发射器末尾合成一块灰字，原因相同的合成一行（例：「形状 · 初速 · 受力：开花点单次闪光，无位移」）。模块照样都在，看得出哪些是全的、哪些借父级、哪些物理上没有
const STD_MODS = ['生成', '形状', '初速', '受力', '寿命', '大小', '颜色', '亮度', '闪烁'];
const MOD_EMPTY = {
  '星': { 颜色: '随本层颜色（见下方「本层颜色」）', 闪烁: '见「亮度」的闪烁强度；点灭见「点灭」' },
  '火花': { 形状: '沿星体轨迹发射，无独立形状', 闪烁: '见「亮度」的随机项（闪烁强度、闪烁频率）' },
  '余烬': { 形状: '同火花', 初速: '同火花', 受力: '同火花', 闪烁: '同火花', 颜色: '取出生时的火花温度，此后不再冷却' },
  '分叉火花': { 形状: '自母火花的分叉点发射', 闪烁: '同火花' },
  '爆裂': { 受力: '寿命极短，于出生位置静止发光', 颜色: '随本层颜色', 闪烁: '本身即单次闪光' },
  '子花': { 颜色: '随本层颜色', 闪烁: '同主星闪烁强度' },
  '开花闪光': { 生成: '开花瞬间生成 1 次', 形状: '开花点单次闪光，无位移', 初速: '开花点单次闪光，无位移', 受力: '开花点单次闪光，无位移', 颜色: '随本层颜色', 闪烁: '不适用' },
};
// 这个发射器没参数的模块 → [[模块, …], 原因]（按 9 个模块的顺序，原因相同的合一行）
function emptyModGroups(e, have) {
  const g = new Map();
  for (const m of STD_MODS) { if (have.has(m)) continue; const why = (MOD_EMPTY[e] || {})[m] || '不适用'; if (!g.has(why)) g.set(why, []); g.get(why).push(m); }
  return [...g.entries()].map(([why, ms]) => [ms, why]);
}
function p43StdModules(host) {
  for (const g of host.querySelectorAll(':scope > section.egrp')) {
    const e = g.dataset.g; if (e === '效果' || e === '输出' || !MOD_EMPTY[e] && !/^自定义/.test(e)) continue;
    const have = new Set([...g.querySelectorAll(':scope > details.mod')].map(d => d._mod)), rows = emptyModGroups(e, have);
    if (!rows.length) continue;
    const box = document.createElement('div'); box.className = 'mod-empties'; box._ph = true; box.setAttribute('role', 'note');
    box.title = '这些模块在这个发射器上没有可调的参数（模块照样都在：9 个标准模块 = 生成 / 形状 / 初速 / 受力 / 寿命 / 大小 / 颜色 / 亮度 / 闪烁）';
    box.innerHTML = rows.map(([ms, why]) => `<p class="me-row">${ms.map(m => `<span class="me-m" data-m="${m}">${m}</span>`).join('<span class="me-dot"> · </span>')}<span class="me-why">：${why}</span></p>`).join('');
    g.appendChild(box);
  }
}
