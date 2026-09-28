// =====================================================================
//  Cascade 参数表（按产物类型分别生成）
// =====================================================================
const EVENT_NAMES = { launch: '发射', whistle: '笛音（持续到到顶）', burst: '开花爆响', pop: '子花爆响', crack: '分裂爆响', crackle: '噼啪（爆裂星）', apex: '到顶', split: '分砲', shot: '彗星发射', loop: '持续声（循环）' };
function soundEvents(b) {
  if (b._events) return b._events;
  const P = b.P, fam = familyOf(P.type); let ev = [];
  if (fam === 'ground') {
    if (P.type === 'fan' || P.type === 'barrage') {
      const n = Math.max(1, Math.round(P.shotRate * P.loopT));
      for (let k = 0; k < n; k++) { ev.push([k / n * P.loopT, 'shot']); if (P.burstStars > 0) ev.push([k / n * P.loopT + P.cometBurn, 'pop']); }
    } else ev.push([0, 'loop']);
  } else {
    const s = new Sim({ ...P, engine: 'gpu', _unit: false }), n = Math.ceil(P.duration / H_STEP);
    for (let i = 0; i < n; i++) s.step(H_STEP);
    ev = s.events.slice();
  }
  ev.sort((a, c) => a[0] - c[0]);
  const out = [];
  for (const [t, k] of ev) { const last = out.find(e => e.type === k && Math.abs(e.t - t) < 0.06); if (last) last.count++; else out.push({ t: +t.toFixed(3), type: k, name: EVENT_NAMES[k] || k, count: 1 }); }
  b._events = out; return out;
}
const cm = v => (v * 100).toFixed(0);
const fx = (v, d = 2) => (+v).toFixed(d);
function keyLines(keys) { return keys.map(([u, v]) => `  ${fx(u, 4)}      ${Array.isArray(v) ? v.join('  ') : fx(v, 3)}`).join('\n'); }
// Cascade 曲线：新加的关键点常是 CurveAuto（平滑、会冲过头），尺寸、位置、帧号都必须逐点改成 Linear
const CURVE_NOTE = '所有曲线（Size By Life、Dynamic Parameter 帧号、Color Over Life、Location / Velocity 等）：每个关键点的 Interp Mode = Linear。CurveAuto 会在关键点之间冲过头：尺寸来回抖、帧号倒退一抖一抖。Size By Life 勾选 Multiply X、Multiply Y。';
// ---- 可直接粘贴进 UE4 细节面板的文本（属性右键 → 粘贴；格式同属性右键 → 复制导出的文本）----
const ue6 = v => (+v).toFixed(6);
const ueVec = (x, y, z) => `(X=${ue6(x)},Y=${ue6(y)},Z=${ue6(z)})`;
function ueFloatPts(keys) { return '(' + keys.map(([u, v]) => `(InVal=${ue6(u)},OutVal=${ue6(v)},ArriveTangent=0.000000,LeaveTangent=0.000000,InterpMode=CIM_Linear)`).join(',') + ')'; }
function ueVecPts(keys) { return '(' + keys.map(([u, v]) => `(InVal=${ue6(u)},OutVal=${ueVec(...v)},ArriveTangent=${ueVec(0, 0, 0)},LeaveTangent=${ueVec(0, 0, 0)},InterpMode=CIM_Linear)`).join(',') + ')'; }
// X、Y 两条关键帧时刻不同的曲线合成一条向量曲线（取并集时刻，各自线性插值）
function mergeXY(kx, ky) { const us = [...new Set([...kx, ...ky].map(k => +k[0].toFixed(5)))].sort((a, b) => a - b); return us.map(u => [u, [evalKeys(kx, u), evalKeys(ky, u), 1]]); }
function pasteSection(items) {
  return `【可直接粘贴】在 Cascade 细节面板里：先把 Distribution 类型选成下面写的曲线类型，展开到 Points（或 Constant）那一行，右键 → 粘贴。
  所有曲线点已是 Linear。粘贴不进去时，右键一条现有曲线的 Points → 复制，把文本发给 Claude 对格式。
${items.map(([where, txt]) => `▸ ${where}\n${txt}`).join('\n')}
`;
}
function texSection(name, b) {
  const P = b.P, L = b.meta.L, parts = [];
  if (b.form === 'trail') return `【贴图】
T_${name}_Loop.png（上升循环）${b.fades.map(f => `、T_${name}_Fade${f.fps}.png（消散，${f.fps} fps）`).join('')}${P.trExport4K ? '；另有 _4K 母版（4096×4096，单格 256×4096）' : ''}
尺寸 ${P.texW}×${P.texH}，灰度线性，RGBA 接力：先填满 R 的 ${L.per} 格（第 0–${L.per - 1} 帧），再接 G、B、A，共 ${L.F} 帧
格子 ${L.cols} 列 × ${L.rows} 行，单格 ${L.cellW}×${L.cellH}（1:${Math.round(L.cellH / L.cellW)}，贴合细长的尾迹）；格子四周留空 ${P.cellPad} 像素
导入：sRGB 关闭，压缩 BC7
T_${name}_Ramp.png：渐变图 256×8（sRGB），暗 → 亮 = 冷却的橙红火星 → 金色火星 → 白热段与星头

【材质实例】
项目现有的 RGBA 序列帧材质；列 = ${L.cols}，行 = ${L.rows}；Ramp = T_${name}_Ramp；循环、消散各一个材质实例（只换贴图）
`;
  for (let s = b, i = 0; s; s = s.next, i++) {
    const sx = b.next ? '_' + 'AB'[i] : '';
    parts.push(s.tail ? `T_${name}${sx}_Head.png（星头与闪光）、T_${name}${sx}_Tail.png（拖尾火花）` : `T_${name}${sx}.png（星头、闪光、拖尾合并）`);
  }
  const chanTxt = L.chans === 4 ? `RGBA 接力：先填满 R 的 ${L.per} 格（第 0–${L.per - 1} 帧），再接 G（${L.per}–${2 * L.per - 1}）、B（${2 * L.per}–${3 * L.per - 1}）、A（${3 * L.per}–${4 * L.per - 1}）` : '单通道（RGB 相同）';
  return `【贴图】
${parts.join('\n')}
尺寸 ${P.texW}×${P.texH}，灰度（${P.encGamma === 1 ? '线性' : 'Gamma ' + P.encGamma}），${chanTxt}
格子 ${L.cols} 列 × ${L.rows} 行，行优先，左上为第 0 帧；单格 ${L.cellW}×${L.cellH} 像素；共 ${L.F} 帧；格子四周留空 ${P.cellPad} 像素
导入：sRGB 关闭，压缩 BC7；1K 版本在引擎里复制一张，把最大尺寸设为 1024 即可
T_${name}_帧号测试.png：排查用。格子、接力、取景与正式贴图完全相同，内容是帧号 + 以爆点为中心的固定大小圆和网格。
  把材质实例的贴图临时换成它播放：帧号应连续递增不倒退，圆应不动、不胀缩、不变扁。
  帧号乱跳 / 倒退 → 帧号曲线或材质的接力解码不对；圆胀缩、晃动 → Size By Life / 位置曲线不对；圆变扁 → 对齐方式或 Initial Size 不对
T_${name}_Ramp.png：渐变图 256×8（sRGB），灰度从暗到亮依次取：拖尾冷却色 → 拖尾高温色 → 星头高温色

【材质实例】
项目现有的 RGBA 序列帧材质；列 = ${L.cols}，行 = ${L.rows}；Ramp = T_${name}_Ramp
${b.tail ? '星头、拖尾各一个材质实例和发射器，两个发射器除贴图和颜色外参数相同。\n' : ''}`;
}
function colorSection(M, D, t0, split) {
  return `Color Over Life（线性 RGB；Alpha 恒为 1${(M.stages || []).length > 1 ? `；${M.stages.length} 段变色` : ''}）
${keyLines(colorKeys(M, D, t0))}
  亮度倍数：星头 ${M.headInt}${split ? `，拖尾 ${M.tailInt}` : ''}（乘在颜色上，按项目曝光再调）`;
}
// 紧凑取景：面片中心沿「线性阻力 + 恒定加速度」曲线移动，横竖 Size By Life 分开
function tightLines(m) {
  const p = m.path, f = m.fill;
  return `Initial Location：X = ${cm(p.x0)} cm，Z = ${cm(p.y0)} cm${m.t0 ? '（本段开始时面片中心相对爆点的位置）' : '（从爆点开始）'}
Initial Velocity：X = ${cm(p.vx)} cm/s，Z = ${cm(p.vy)} cm/s（面片中心的运动，不是星的速度）
Drag：Drag Coefficient = ${fx(p.k, 3)}
Const Acceleration：X = ${cm(p.ax)} cm/s²，Z = ${cm(-p.ay)} cm/s²
Size By Life（X、Y 分开；线性插值）：面片中心跟着内容走，每帧内容占满格子
  相对时间    X 倍数
${keyLines(m.sizeKeysX)}
  相对时间    Y 倍数
${keyLines(m.sizeKeysY)}
  画面占比：平均 ${f ? Math.round(f.avg * 100) : '—'}%，最差 10% 的帧 ≥ ${f ? Math.round(f.p10 * 100) : '—'}%
  组合里缩放这一层时，Initial Size、Location、Velocity、Const Acceleration 按同一倍数缩放，Drag 不变。`;
}
function masterEmitter(s, M, label) {
  const m = s.meta, b = s;
  return `【Cascade 发射器${label || ''}】
Required：Screen Alignment = Rectangle（面向相机，X、Y 尺寸分开生效；不要用 Square——Square 只认 X，Y 方向会按错的比例缩放，画面变形、抖动）；Emitter Duration = ${fx(m.duration)} s；Emitter Loops = 1${m.t0 ? `；Emitter Delay = ${fx(m.t0)} s（接在上一段之后）` : ''}
${CURVE_NOTE}
Spawn：Rate = 0；Burst：Count = 1，Time = 0
Lifetime：${fx(m.duration)} s（常量）
Initial Size：X = ${cm(m.Ww)} cm，Y = ${cm(m.Wh)} cm（${m.tight ? '最大尺寸，横竖分开' : m.zoom ? '开花最大时的尺寸' : '常量'}）
${m.tight ? tightLines(m) : m.zoom ? `Initial Location：0（爆点就是精灵中心）
Size By Life（X、Y 相同；线性插值）：面片随开花放大，每帧贴图按同一条曲线烘焙
  相对时间    倍数
${keyLines(m.sizeKeys)}` : `Initial Location：Z = ${cm(m.cy)} cm（精灵中心相对爆点的高度，这样爆点正好在发射器原点）`}
Dynamic Parameter：第三通道 = 帧号；Use Emitter Time 不勾选；曲线插值 Linear
  相对时间    帧号
${keyLines(m.keys)}
  材质取整显示，不做帧间混合。烘焙时每一帧取的正是这条曲线上对应帧号的时刻，画面与引擎一致。
${colorSection(M, m.duration, m.t0 || 0, !!b.tail)}
Light（可选）：Brightness Over Life 相对值，乘以期望的峰值亮度
${keyLines(m.lightKeys)}
${m.tight ? 'Initial Rotation：不要加（面片中心在移动、横竖缩放不同，旋转会把下垂方向转歪）' : 'Initial Rotation（可选）：−15°～15° 随机，同一母版多发时增加差异'}
${pasteSection([
  ['Initial Size → Start Size → Distribution Vector Constant → Constant', ueVec(m.Ww * 100, m.Wh * 100, 1)],
  ...(m.tight ? [['Size By Life → Life Multiplier → Distribution Vector Constant Curve → Constant Curve → Points', ueVecPts(mergeXY(m.sizeKeysX, m.sizeKeysY))],
    ['Initial Location → Start Location → Distribution Vector Constant → Constant', ueVec(m.path.x0 * 100, 0, m.path.y0 * 100)],
    ['Initial Velocity → Start Velocity → Distribution Vector Constant → Constant', ueVec(m.path.vx * 100, 0, m.path.vy * 100)],
    ['Const Acceleration → Acceleration', ueVec(m.path.ax * 100, 0, -m.path.ay * 100)]]
   : m.zoom ? [['Size By Life → Life Multiplier → Distribution Vector Constant Curve → Constant Curve → Points', ueVecPts(m.sizeKeys.map(([u, v]) => [u, [v, v, 1]]))]]
   : [['Initial Location → Start Location → Distribution Vector Constant → Constant', ueVec(0, 0, m.cy * 100)]]),
  ['Dynamic Parameter → 第三个参数（帧号）→ Param Value → Distribution Float Constant Curve → Constant Curve → Points', ueFloatPts(m.keys)],
  ['Color Over Life → Color Over Life → Distribution Vector Constant Curve → Constant Curve → Points（已乘星头亮度倍数）', ueVecPts(colorKeys(M, m.duration, m.t0 || 0).map(([u, c]) => [u, c.map(x => x * (M.headInt || 1))]))]
])}【帧与流畅度${label || ''}】
平均 ${fx(m.avgFps, 1)} fps，最低 ${fx(m.minFps, 1)} fps，每帧最大位移 ${fx(m.maxDisp, 1)} 像素（建议 ≤ 3）
平均面片面积为最大尺寸的 ${Math.round(m.area * 100)}%（overdraw 按此折算）
`;
}
function unitEmitter(b, M) {
  const m = b.meta, P = b.P, f = m.fit, Du = m.duration, jit = P.burnJit / 100;
  const hb = m.hb, R = f.v0 / f.k * (1 - Math.exp(-f.k * Du));
  const unitArea = P.stars * m.Ww * m.Wh * m.area, burstArea = (2 * R + m.Wh) ** 2;
  const orbitA = P.turb > 0 ? P.turbScale / (2 * Math.PI) : 0, orbitF = P.turb > 0 ? P.turb / P.turbScale : 0;
  return `【Cascade 发射器（单元序列：每颗星一个粒子）】
Required：Screen Alignment = Velocity（面片沿速度方向拉长）；Emitter Duration = ${fx(Du)} s；Emitter Loops = 1
${CURVE_NOTE}
  Pivot Offset：星头在贴图里距底边 ${fx(hb * 100, 1)}% 处。默认 (−0.5, −0.5) 是面片中心；把 Y 改为 ${fx(-(1 - hb), 3)}，
  若星头跑到另一端就改为 ${fx(-hb, 3)}。以编辑器里单颗粒子星头落在粒子位置为准。若星头朝向反了（尾巴在前），勾选「星头朝下」重新导出。
Spawn：Rate = 0；Burst：Count = ${P.stars}（LOD 远处可减到一半），Time = 0
Lifetime：Min ${fx(Du * (1 - jit))} s，Max ${fx(Du * (1 + jit))} s（燃烧 ${fx(P.burn)} s + 尾迹消散）
Initial Size：X = ${cm(m.Ww)} cm，Y = ${cm(m.Wh)} cm（最大尺寸）
Size By Life（X、Y 分开；线性插值）：拖尾变短变窄时面片跟着缩小，每帧贴图按同一条曲线烘焙；星头就在缩放中心（Pivot）
  相对时间    X 倍数
${keyLines(m.sizeKeysX)}
  相对时间    Y 倍数
${keyLines(m.sizeKeysY)}
Location → Sphere：Start Radius = 10 cm；Surface Only 勾选；Velocity 勾选；Velocity Scale = ${fx(f.v0 * 100 / 10, 1)}
  （等价写法：Velocity Cone，Angle = 1（全方向），Velocity = ${cm(f.v0)} cm/s）
Drag：Drag Coefficient = ${fx(f.k, 3)}
Const Acceleration：Z = ${cm(-f.a)} cm/s²${P.wind ? `；X = ${cm(f.k * P.wind)} cm/s²（风：线性阻力下风速 × 阻力系数）` : ''}
${P.turb > 0 ? `Orbit（湍流近似）：Offset Amount X、Y 在 ±${cm(orbitA)} cm 内随机；Rotation Rate X、Y 在 ±${fx(orbitF, 2)} 圈/秒内随机\n` : ''}Dynamic Parameter：第三通道 = 帧号；曲线插值 Linear
  相对时间    帧号
${keyLines(m.keys)}
${colorSection(M, Du, 0, !!b.tail)}
${pasteSection([
  ['Initial Size → Start Size → Distribution Vector Constant → Constant', ueVec(m.Ww * 100, m.Wh * 100, 1)],
  ['Size By Life → Life Multiplier → Distribution Vector Constant Curve → Constant Curve → Points', ueVecPts(mergeXY(m.sizeKeysX, m.sizeKeysY))],
  ['Dynamic Parameter → 第三个参数（帧号）→ Param Value → Distribution Float Constant Curve → Constant Curve → Points', ueFloatPts(m.keys)],
  ['Color Over Life → Distribution Vector Constant Curve → Constant Curve → Points（已乘星头亮度倍数）', ueVecPts(colorKeys(M, Du, 0).map(([u, c]) => [u, c.map(x => x * (M.headInt || 1))]))]
])}轨迹拟合（线性阻力 + 恒定加速度 对 真实二次阻力）：初速 ${fx(f.v0, 1)} m/s，阻力 ${fx(f.k, 3)} /s，下坠加速度 ${fx(f.a, 2)} m/s²，
  位置误差约为花半径的 ${fx(f.err * 100, 1)}%。开花闪光请另挂一个短序列（母版模式导出前 0.3 s）或项目现有闪光贴图。
  贴图里的拖尾是直的（烘焙时去掉了重力弯曲），下垂由粒子轨迹体现；风、湍流也交给 Cascade（Const Acceleration、Orbit）。

【overdraw 对比】
单元序列：${P.stars} 个 × ${fx(m.Ww, 1)}×${fx(m.Wh, 1)} m × 平均 ${Math.round(m.area * 100)}%（Size By Life）≈ ${Math.round(unitArea).toLocaleString()} m²
大面片：约 ${fx(2 * R + m.Wh, 0)}×${fx(2 * R + m.Wh, 0)} m ≈ ${Math.round(burstArea).toLocaleString()} m²（未计 Size By Life）
单元序列约为大面片的 ${fx(unitArea / burstArea * 100, 0)}%${unitArea < burstArea ? '，更省' : '，星数太多时反而更费，改用大面片或减星'}
`;
}
function riseEmitter(b, M, name) {
  const m = b.meta, P = b.P, f = m.fit, ri = m.ri, se = sparkEff(P), T = f.T;
  const coolKeys = []; for (let i = 0; i <= 6; i++) { const u = i / 6, T0 = se.T0, g = x => Math.max(0, (x - 900) / 1150) ** 3; coolKeys.push([u, g(T0 * (1 - P.cooling * u)) / g(T0)]); }
  const orbit = P.riseStyle === 'spiral' ? `Orbit（螺旋）：Offset Amount X = ${cm(Math.max(P.wobble, 10) / (2 * Math.PI * P.wobbleHz))} cm；Rotation Rate Z = ${fx(P.wobbleHz, 2)} 圈/秒`
    : P.wobble > 0 ? `Orbit（曲导摆动）：Offset Amount X 在 ±${cm(P.wobble / (2 * Math.PI * P.wobbleHz))} cm 内随机；Rotation Rate Y 在 ±${fx(P.wobbleHz, 2)} 圈/秒内随机` : 'Orbit：不需要（直线上升）';
  return `【上升：三个发射器】
弹道（真实二次阻力）：出膛 ${fx(ri.v0, 1)} m/s，${fx(T, 2)} s 到达 ${fx(f.H, 0)} m
拟合成 Cascade 的线性阻力：Initial Velocity Z = ${cm(f.v0)} cm/s；Drag = ${fx(f.k, 3)}；Const Acceleration Z = −981 cm/s²（误差 ${fx(f.err * 100, 1)}%）

1）弹体 + 星头循环（本贴图）
Required：Screen Alignment = Velocity；Emitter Duration = ${fx(T)} s；Loops = 1
  Pivot Offset：星头在贴图里距底边 ${fx(m.hb * 100, 1)}% 处（Y 改为 ${fx(-(1 - m.hb), 3)}，反了就用 ${fx(-m.hb, 3)}）
Spawn：Burst Count = 1；Lifetime = ${fx(T)} s
Initial Size：X = ${cm(m.Ww)} cm，Y = ${cm(m.Wh)} cm
Initial Velocity：Z = ${cm(f.v0)} cm/s；Drag = ${fx(f.k, 3)}；Const Acceleration Z = −981
${orbit}
Dynamic Parameter 第三通道（${m.L.F} 帧循环，周期 ${fx(m.duration, 3)} s；锯齿曲线，Linear）
${keyLines(sawKeys(m, T))}
${colorSection(M, T, 0, !!b.tail)}

2）尾迹火花（用项目现有火花贴图）
Location → Emitter InitLoc：Emitter Name = 发射器 1；Inherit Source Velocity 勾选，Scale = ${fx(P.sparkInherit, 2)}
Spawn：Rate = ${Math.round(P.sparkRate * (P.riseStyle === 'silver' ? 1.6 : P.riseStyle === 'fue' ? 0.25 : P.riseStyle === 'dark' ? 0 : 1))} /s
Lifetime：Min ${fx(se.life * 0.64)} s，Max ${fx(se.life * 1.57)} s
Initial Velocity：X、Y、Z 在 ±${cm(P.sparkSpread * 1.5)} cm/s 内随机
Drag：${fx(P.sparkDrag, 2)}；Const Acceleration Z = ${cm(-G * P.sparkGrav)} cm/s²
Initial Size：${cm(P.sparkSize * 2.5)} cm
亮度随寿命（乘在颜色上，黑体冷却）
${keyLines(coolKeys)}

3）开花衔接
弹体发射器加 Event Generator（Death），开花发射器用 Event Receiver Spawn 接收；
或者开花发射器 Emitter Delay = ${fx(T)} s、Initial Location Z = ${cm(f.H)} cm。
`;
}
function trailEmitter(b, M, name) {
  const m = b.meta, P = b.P, f = m.fit, T = m.T, F = m.L.F, last = m.sizeKeysRise[m.sizeKeysRise.length - 1][1];
  const fades = b.fades.map(x => `T_${name}_Fade${x.fps}：${F} 帧，按 ${x.fps} fps 播放 = ${fx(F / x.fps, 2)} s`).join('\n  ');
  return `【升空尾缀：两个发射器接力】
弹道（真实二次阻力）：${fx(riseInfo(P).v0, 1)} m/s 出膛，${fx(T, 2)} s 到达 ${fx(f.H, 0)} m
Cascade 线性阻力拟合：Initial Velocity Z = ${cm(f.v0)} cm/s；Drag = ${fx(f.k, 3)}；Const Acceleration Z = −981 cm/s²（误差 ${fx(f.err * 100, 1)}%）
面片 ${fx(m.Ww, 2)} × ${fx(m.Wh, 2)} m 对应上升速度 ${fx(P.trV, 1)} m/s 时的尾迹（尾迹长约 ${fx(m.trailLen, 1)} m）

1）上升循环（T_${name}_Loop）
Required：Screen Alignment = Velocity；Emitter Duration = ${fx(T, 3)} s；Emitter Loops = 1
${CURVE_NOTE}
  Pivot Offset：星头在贴图里距底边 ${fx(m.hb * 100, 1)}% 处。默认 (−0.5, −0.5) 是面片中心；把 Y 改为 ${fx(-(1 - m.hb), 3)}，
  若星头跑到另一端就改为 ${fx(-m.hb, 3)}。以编辑器里星头落在粒子位置、尾巴拖在后面为准
Spawn：Rate = 0；Burst Count = 1，Time = 0；Lifetime = ${fx(T, 3)} s
Initial Size：X = ${cm(m.Ww)} cm，Y = ${cm(m.Wh)} cm
Initial Velocity：Z = ${cm(f.v0)} cm/s；Drag Coefficient = ${fx(f.k, 3)}；Const Acceleration：Z = −981 cm/s²
Size By Life（Y 单独，X 保持 1；尾迹长度跟着上升速度变：出膛快 → 长，到顶慢 → 短）
  相对时间    Y 倍数
${keyLines(m.sizeKeysRise)}
Dynamic Parameter 第三通道 = 帧号（锯齿，Linear；${F} 帧 / ${fx(m.Tp, 3)} s，即 ${m.fps} fps）
${keyLines(sawKeys(m, T))}
  真循环：火花按周期性编号生成，第 ${F} 帧就是第 0 帧，不做交叉淡化。
Color Over Life：${colorKeys(M, T, 0).length > 2 ? '见下表' : '白色常量'}；亮度倍数 ×${P.trBright}（三档：小 ×1、中 ×1.6、大 ×2.5，保留强弱差别）
摆动：螺旋扭动已经烘在贴图里（星头每帧固定在 Pivot，只有后面的尾迹成波浪摆动），不需要 Orbit

${pasteSection([
  ['Initial Size → Start Size → Distribution Vector Constant → Constant', ueVec(m.Ww * 100, m.Wh * 100, 1)],
  ['Initial Velocity → Start Velocity → Distribution Vector Constant → Constant', ueVec(0, 0, f.v0 * 100)],
  ['Const Acceleration → Acceleration', ueVec(0, 0, -981)],
  ['Size By Life → Life Multiplier → Distribution Vector Constant Curve → Constant Curve → Points', ueVecPts(m.sizeKeysRise.map(([u, v]) => [u, [1, v, 1]]))],
  ['Dynamic Parameter → 第三个参数（帧号）→ Param Value → Distribution Float Constant Curve → Constant Curve → Points', ueFloatPts(sawKeys(m, T))],
  ['Color Over Life → Distribution Vector Constant Curve → Constant Curve → Points（已乘亮度倍数 ×' + P.trBright + '）', ueVecPts(colorKeys(M, T, 0).map(([u, c]) => [u, c.map(x => x * P.trBright)]))]
])}
2）开花后消散（二选一）
  ${fades}
Required：Screen Alignment = Velocity；Emitter Delay = ${fx(T, 3)} s；Emitter Duration = 消散时长；Loops = 1；Pivot Offset 同上
Spawn：Burst Count = 1；Lifetime = 消散时长
Initial Location：Z = ${cm(f.H)} cm（开花点）
Initial Velocity：Z = 1 cm/s（只给面片定方向；不要 Drag、Const Acceleration）。斜着发射时改成与上升末段相同的方向
Initial Size：X = ${cm(m.Ww)} cm，Y = ${cm(m.Wh * last)} cm（= 上升最后的 Y 倍数 ${fx(last, 3)} × ${cm(m.Wh)} cm）
Dynamic Parameter 第三通道 = 帧号（Linear）：0 → ${F}
Color Over Life：同上
${pasteSection([
  ['Initial Location → Start Location → Distribution Vector Constant → Constant', ueVec(0, 0, f.H * 100)],
  ['Initial Size → Start Size → Distribution Vector Constant → Constant', ueVec(m.Ww * 100, m.Wh * last * 100, 1)],
  ['Dynamic Parameter → 第三个参数（帧号）→ Param Value → Distribution Float Constant Curve → Constant Curve → Points', ueFloatPts([[0, 0], [1, F - 0.001]])]
])}
接力：上升结束时循环正好播到第 ${m.fEnd} 帧；消散第 0 帧就是这一帧（逐像素差值 ${m.relay.join(' / ')}），
  之后星头熄灭，火花不再喷出，已有的火星从下往上逐颗冷却熄灭。
  改了开花高度、弹体终端速度或帧率，要重新导出（结束帧会变）。
`;
}
function loopEmitter(b, M) {
  const m = b.meta, P = b.P;
  return `【Cascade 发射器（地面循环）】
Required：Screen Alignment = Square；Emitter Duration = ${fx(m.duration, 3)} s；Emitter Loops = 0（无限循环）
Spawn：Rate = 0；Burst：Count = 1，Time = 0（每个循环一发，上一发结束时下一发正好接上）
Lifetime：${fx(m.duration, 3)} s（常量，必须等于循环周期）
Initial Size：X = ${cm(m.Ww)} cm，Y = ${cm(m.Wh)} cm
Initial Location：Z = ${cm(m.cy)} cm（精灵中心离地高度；发射器放在地面喷口处）
Dynamic Parameter：第三通道 = 帧号；Linear
${keyLines(m.keys)}
  ${m.L.F} 帧均匀分布，第 ${m.L.F} 帧就是下一循环的第 0 帧，所以首尾无缝。
${colorSection(M, m.duration, 0, !!b.tail)}
Light（可选）：常量亮度，按项目曝光设
${m.check && m.check.seam != null ? `接缝校验：首尾变化量是相邻帧平均变化量的 ${fx(m.check.seam, 2)} 倍（≈1 表示无缝）\n` : ''}`;
}
function smokeSection(b) {
  const P = b.P, fam = familyOf(P.type), m = b.meta;
  if (fam === 'ground') return `【烟（用项目现有烟雾贴图）】
Spawn Rate ${P.type === 'fan' || P.type === 'barrage' ? Math.round(P.shotRate * 2) : 6} /s；Lifetime 4–7 s；Initial Size ${cm(Math.max(2, m.Ww * 0.15))} cm，Size By Life 1 → 3.5
Initial Velocity Z 100–250 cm/s（热气上升）${P.wind ? `；风：Const Acceleration X = ${cm(P.wind * 0.3)}` : ''}；Drag 0.4
Alpha Over Life：0 → 0.35（0.1）→ 0；颜色取火光色乘 0.3，远处按场景雾色`;
  if (fam === 'rise') return `【烟（上升尾烟）】
挂在弹体上：Location → Emitter InitLoc；Spawn Rate 25 /s；Lifetime 3–5 s；Initial Size 150 cm，Size By Life 1 → 4；Drag 1.5；Alpha 0.25 → 0`;
  const R = m.fit ? m.fit.v0 / m.fit.k : Math.max(m.Ww, m.Wh) / 2, burn = P.burn;
  return `【烟（开花烟，用项目现有烟雾贴图）】
Spawn：Burst Count = ${clamp(Math.round(P.stars / 5), 8, 48)}；Lifetime ${fx(burn + 4)}–${fx(burn + 9)} s
Location → Sphere：Velocity 勾选，速度约 ${cm(R * 0.9 / Math.max(0.5, burn))} cm/s；Drag = ${fx(2 / Math.max(0.5, burn), 2)}（烟团很快停在星走过的地方）
Initial Size ${cm(Math.max(6, R * 0.12))} cm，Size By Life 1 → 3（扩散）${P.wind ? `；风：Const Acceleration X = ${cm(P.wind * 0.5)} cm/s²` : ''}
Alpha Over Life：0 → 0.3（在 ${fx(Math.min(0.9, burn / (burn + 6)), 2)}）→ 0
颜色：前 ${fx(burn)} s 被火光照亮，乘本母版 Color Over Life 与 Light 曲线；之后转为场景夜空灰`;
}
function soundSection(b) {
  const ev = soundEvents(b);
  return `【声音节点（${familyOf(b.P.type) === 'rise' ? '相对发射' : '相对开花'}，秒）】
${ev.map(e => `  ${fx(e.t, 3)}  ${e.name}${e.count > 1 ? ` ×${e.count}` : ''}`).join('\n')}
  玩家听到的时刻 = 事件时刻 + 距离 ÷ 343 m/s（800 m 约晚 2.3 s）`;
}
function lodSection(b) {
  const m = b.meta, P = b.P, cellW = m.L.cellW, w = m.Ww * (m.zoom ? 1 : 1), k = 1080 / (2 * Math.tan(Math.PI / 6));
  const d = px => Math.round(w * k / px);
  return `【LOD 建议（1080p、竖直视角 60°）】
LOD 0：0–${d(cellW).toLocaleString()} m，全部层，2K 贴图
LOD 1：${d(cellW).toLocaleString()}–${d(cellW / 2).toLocaleString()} m，屏幕上已小于单格像素：1K 贴图即可；粒子数/火花发射率减半；关闭 Light
LOD 2：${d(cellW / 2).toLocaleString()} m 以外：${b.tail ? '去掉拖尾层，只留星头层' : '只留本层'}；去掉芯（小缩放的牡丹层）和烟
（Cascade：粒子系统的 LOD Distances 依次填 0、${d(cellW)}00、${d(cellW / 2)}00，单位 cm）`;
}
function checkSection(b) {
  const lines = [];
  for (let s = b, i = 0; s; s = s.next, i++) {
    const c = s.meta.check, m = s.meta, L = m.L, pre = b.next ? `段 ${'AB'[i]}：` : '';
    if (!c) continue;
    if (m.fill) lines.push(`${pre}画面占比：平均 ${Math.round(m.fill.avg * 100)}%，最差 10% 的帧 ≥ ${Math.round(m.fill.p10 * 100)}%${m.fill.avg < 0.9 ? (m.tight ? '' : '；面片取景改「紧凑」可提高到 90% 以上') : ''}`);
    lines.push(`${pre}过曝：${c.clipFrames.length ? `第 ${c.clipFrames.slice(0, 8).map(f => f + 1).join('、')}${c.clipFrames.length > 8 ? '…' : ''} 帧超过 2% 像素顶到 255，可降低星头亮度或改 Gamma 2.2` : '无'}`);
    lines.push(`${pre}边缘渗色：${c.edgeFrames.length ? `${c.edgeFrames.length} 帧内容碰到格子边缘，mip 或压缩时会串到相邻格子；加大「格子留边」或序列时长内缩小取景` : `无（留边 ${s.P.cellPad} 像素）`}`);
    if (L.chans === 4) lines.push(`${pre}通道布局：${c.chanUse.map((u, k) => 'RGBA'[k] + (u ? ' 有内容' : ' 空')).join('，')}${c.chanUse.some(u => !u) ? '；有空通道，可减少帧数或改单通道' : ''}`);
    if (c.emptyMid.length) lines.push(`${pre}中间有 ${c.emptyMid.length} 帧全黑（如延时点火的暗段），属正常，可考虑缩短`);
    lines.push(`${pre}近似帧：${c.similar} 对相邻帧几乎相同${c.similar > L.F * 0.15 ? `，可把「取帧」改成「按画面变化」自动合并` : ''}`);
    if (m.darkTail > L.F * 0.05) lines.push(`${pre}末尾 ${m.darkTail} 帧接近全黑，可把序列时长缩短到约 ${fx(m.times[L.F - m.darkTail])} s`);
    if (m.minFps < 24 && !m.loop) lines.push(`${pre}最低帧率 ${fx(m.minFps, 1)} fps，尾段可能发卡：可增加格子数或缩短序列时长`);
    if (m.maxDisp > 3) lines.push(`${pre}每帧最大位移 ${fx(m.maxDisp, 1)} 像素，开花初期可能跳帧：可增加格子数或调高最低帧率`);
    if (c.seam != null) lines.push(`${pre}循环接缝：${fx(c.seam, 2)}（≈1 无缝）`);
  }
  return `【自检】\n${lines.map(l => '  ' + l).join('\n')}`;
}
function bigShellSection(b) {
  const P = b.P; if (!(P.shellNo >= 20) || familyOf(P.type) !== 'aerial') return '';
  const r = shellRow(P.shellNo), slots = b.meta.sparkSlots || 0;
  return `
【大型礼花（${P.shellNo} 号）分层方案】
开花直径约 ${Math.round(r[1])} m，星 ${P.stars} 颗，本次模拟的火花槽位约 ${slots.toLocaleString()} 颗（远超同屏 3 万的预算）。
  第 1 层 大面片母版（本贴图，2K）：负责整体轮廓与全部火花，远景只用这一层，overdraw = 1 张面片；
  第 2 层 单元序列（同一套参数改「单元序列」导出）：近景时每颗星一个粒子（${P.stars} 个，CPU 粒子），让星头清晰、有视差；
  第 3 层 GPU 火花（Cascade GPU Sprites，≤ ${Math.min(30000, slots).toLocaleString()} 颗，按显卡测速结果定）：只在近景补颗粒感，
          Sphere 速度 ${Math.round(P.v0 * 0.7)} m/s、Drag ${fx(1 / Math.max(0.5, P.burn), 2)}、Lifetime ${fx(P.sparkLife)} s、Spawn Rate 随 Emitter Time 从大到小；
  芯：再叠 1–2 层缩小的牡丹母版（组合页「四尺玉」预设）。
  距离 1.5 km 以外只留第 1 层，1K 贴图。`;
}
// Cutout：裁掉面片空白（Required 的 Cutout Texture）
function cutoutSection(name, b) {
  const one = (label, base, cut, keys) => cut ? `${label}
  方式一（简单，所有帧共用一个轮廓）：Required → Cutout Texture = ${base}_Cutout_Union；Sub Images Horizontal = 1，Vertical = 1；
    Bounding Mode = Eight Vertices；Opacity Source Mode = Alpha；Alpha Threshold = 0.1。面片剩下约 ${Math.round(cut.unionCover * 100)}%（按轮廓外接八边形会略大一点）
  方式二（逐帧轮廓，省得更多）：Cutout Texture = ${base}_Cutout；Sub Images Horizontal = ${cut.grid}，Vertical = ${cut.grid}；Bounding Mode = Eight Vertices；
    Opacity Source Mode = Alpha；Alpha Threshold = 0.1；Required → Interpolation Method = Linear（只用来按帧挑轮廓，不做帧间混合）；
    再加一个 SubUV 模块：Sub Image Index 用和帧号完全相同的曲线（下面可直接粘贴），Use Real Time 不勾选。平均每帧剩约 ${Math.round(cut.avgCover * 100)}%
    材质照旧用 Dynamic Parameter 第三通道取帧；如果材质里用了 Particle SubUV 节点，只能用方式一。
  ▸ SubUV → Sub Image Index → Distribution Float Constant Curve → Constant Curve → Points
${ueFloatPts(keys)}` : '';
  const parts = [];
  if (b.form === 'trail') {
    parts.push(one('上升循环', `T_${name}_Loop`, b.meta.cutout, sawKeys(b.meta, b.meta.T)));
    for (const f of b.fades || []) parts.push(one(`消散 ${f.fps} fps`, `T_${name}_Fade${f.fps}`, f.cutout, [[0, 0], [1, b.meta.L.F - 0.001]]));
  } else for (let x = b, i = 0; x; x = x.next, i++) parts.push(one(b.next ? `段 ${'AB'[i]}` : '', `T_${name}${b.next ? '_' + 'AB'[i] : ''}`, x.meta.cutout, x.meta.keys));
  const t = parts.filter(Boolean).join('\n');
  return t ? `【Cutout：裁掉面片上的空白，减少 overdraw】\n${t}\n` : '';
}
function cascadeText(name, b, M) {
  const P = b.P, head = `烟花母版：${name}（${TYPE_NAMES[P.type]}${P.shellNo ? ' · ' + P.shellNo + ' 号' : ''}）
工具：烟花母版烘焙器 ${VERSION}（模拟内核：${P.engine === 'gpu' ? 'GPU' : 'CPU'}；产物：${FORM_NAMES[b.form] || b.form}）
`;
  let body = '';
  if (b.form === 'unit') body = unitEmitter(b, M);
  else if (b.form === 'riseLoop') body = riseEmitter(b, M, name);
  else if (b.form === 'trail') body = trailEmitter(b, M, name);
  else if (b.form === 'loop') body = loopEmitter(b, M);
  else if (b.next) body = masterEmitter(b, M, ' · 段 A（开花）') + '\n' + masterEmitter(b.next, M, ' · 段 B（下垂）') +
    `\n两段各一个发射器，材质、颜色相同；段 B 的 Emitter Delay = ${fx(b.meta.split)} s，两段在该时刻无缝衔接。\n`;
  else body = masterEmitter(b, M);
  return `${head}
${texSection(name, b)}
${cutoutSection(name, b)}
${body}
${checkSection(b)}

${smokeSection(b)}

${soundSection(b)}

${lodSection(b)}
${bigShellSection(b)}

【说明】
${b.form === 'master' || b.form === 'segments' ? (b.meta.zoom ? 'Size By Life 以精灵中心缩放，爆点就在中心，所以面片放大时爆点位置不变。' : '面向相机的精灵用 Initial Location 的 Z 偏移对齐爆点；从很陡的仰角看时会有轻微偏差。') + '\n' : ''}${name}.json 保存了全部参数，用烘焙器「导入参数 JSON」即可继续修改。
`;
}
const FORM_NAMES = { trail: '升空尾缀序列（循环 + 消散）', master: '大面片母版', segments: '分段母版（开花段 + 下垂段）', unit: '单元序列', riseLoop: '上升星头循环', loop: '地面循环' };
