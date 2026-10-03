// =====================================================================
//  4.3 参数面板（用户 2026-10-03 12:59 #2 #3 #4、命名表审阅意见；先做成「新面板（预览）」开关，命名审完再设为默认）
//  - 名字 / 说明来自 analysis/命名/参数名称表.json（build.py 生成 PNAMES，唯一来源）：默认中文，开「英文名」显示 Niagara 风格英文；
//    说明条第一行「English · 中文 — 一句话说明」，下面「调大 / 调小」「随机怎么取」「UE 里对应」「注意」。
//  - 按 Niagara 发射器的模块顺序排：发射器 → 生成 / 寿命 / 形状 / 初速 → 受力 / 外观 / 烟花特性 / 子花 → 尾迹 → 尾缀各层 → 烘焙输出。
//  - 随机折叠（用户审阅意见「每个参数的随机都折叠一下，我需要就点开填」）：「××随机」收在本体参数行的「随机」按钮下，点开才显示。
//  - 不起作用的参数（参数有效性检查实测 + 渲染基础问题清单 H13）：不藏起来，变灰并写原因（例：点火延迟是 0 时「点火延迟随机」不起作用）。
//  - 搜索认旧名 / 新名 / 英文名 / 字段名。
// =====================================================================
const PNAME = (() => { const m = new Map(); for (const r of (typeof PNAMES !== 'undefined' ? PNAMES : [])) { const k = r.sec + '|' + r.key; if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return m; })();
// 同一节里同一个键可能有两行（例：形状里「开花图案」和地面的「灯芯图案」都是 pattern）：按旧名对上
function pnameOf(sec, key, label) { const a = PNAME.get(sec + '|' + key); if (!a) return null; if (a.length > 1 && label != null) { const L = String(label); return a.find(r => r.old === L || L.startsWith(r.old) || r.old.startsWith(L.split('（')[0])) || a[0]; } return a[0]; }
// 阶段 → 模块（4.2.24：按 Cascade 发射器从上到下，analysis/命名/模块表.json；空中礼花 / 烘焙输出已按新模块，
// 尾缀 / 地面那几族的旧模块名（受力、外观、尾迹、各层、烘焙输出）先留着，等清理清单定了再改）
const P43_GROUPS = [
  ['发射', 'Emitter · 发射', ['发射器', '生成', '寿命', '形状', '初速', '上升', '弹道', '自转与喷射', '地面']],
  ['运动', 'Motion · 运动', ['阻力重力', '受力']],
  ['外观', 'Appearance · 外观', ['星头', '外观', '火花', '尾迹', '尾迹外形', '烟花特性', '子花', '蜂']],
  ['层', 'Layers · 尾缀各层', ['白热火粉', '金火花', '橙色火花', '丝状火花', '星头燃气焰', '落火', '烟带']],
  ['输出', 'Output · 输出', ['入点出点', '帧与贴图', '曝光光晕', '画质', '镜头', '引擎附加', '烘焙输出']],
];
const P43_MODULE_GROUP = (() => { const m = {}; for (const [g, , mods] of P43_GROUPS) for (const x of mods) m[x] = g; return m; })();
// 「××随机」挂在哪个本体参数下面（没列的按「键名去掉 Jit」找；找不到就照常单独一行）
const RAND_OF = { speedJit: 'v0', dirJit: 'v0', burnJit: 'burn', ignJit: 'ignDelay', afterJit: 'afterBurn', sparkRampJit: 'sparkRamp', sparkLifeJit: 'sparkLife',
  sparkSpread: 'sparkInherit', twinkle: 'sparkBright', starBright: 'sparkBright', tailJit: 'sparkSize', subJit: 'subDelay', subSpeedJit: 'subSpeed', subScaleJit: 'subSpeed' };
function randBaseOf(key, keys) { const b = RAND_OF[key] || (/Jit$/.test(key) ? key.slice(0, -3) : ''); return b && keys.has(b) ? b : ''; }
const isCarrierType = P => P.type === 'senrin' || P.type === 'crossette';
const SPARK_KEYS = ['sparkRateEnd', 'sparkStop', 'sparkStart', 'sparkRamp', 'sparkRampJit', 'sparkLife', 'sparkLifeEnd', 'sparkLifeJit', 'sparkSpread', 'sparkSize', 'sparkInherit', 'sparkDrag', 'sparkGrav',
  'T0', 'cooling', 'sparkBright', 'twinkle', 'emberFrac', 'tailJit', 'tailShoulder', 'tailWidth', 'tailPinchHead', 'tailPinchTail', 'tailBellyAt', 'sparkRise', 'starBright', 'tailHaze', 'tailHazeR', 'branch', 'branchAt', 'tailDiffuse', 'tailDiffuseScale'];
// 不起作用的条件（空中类）：[键, 条件, 原因]。依据：analysis/probe/参数有效性/（云端：拨了曲线 / 帧计划都不变）+ analysis/results/SMOKE15/参数有效性/（本机：再加 4 个时刻的定帧画面也不变）+ 代码（20_sim.js、40_gl.js）
const INERT = [
  [['ignJit', 'ignSeed'], P => !(+P.ignDelay > 0) && !isCarrierType(P), '「点火延迟」是 0 时不起作用（随机的是点火延迟的长短）'],
  [['headDim'], P => +P.headDim < 1 && !(+P.headDimUntil > 0), '「前段结束」是 0 时不起作用：先设前段到第几秒结束'],
  [['turbScale'], P => !(+P.turb > 0), '「湍流强度」是 0 时不起作用'],
  [['burn', 'ignDelay', 'ignJit', 'ignSeed', 'afterBurn', 'afterJit'], P => isCarrierType(P), '千轮 / 分裂的星是子弹：子弹飞多久看「子花开花时刻」，子星看「子星寿命」；这一项对它们不起作用'],
  [['sparkRate'], P => isCarrierType(P), '千轮 / 分裂：子弹的火花看「子弹火花率」，子星的火花看「子星火花率」；这一项不起作用'],
  [SPARK_KEYS, P => !isCarrierType(P) && !(+P.sparkRate > 0), '「火花生成率」是 0（这一层没有火花）时不起作用'],
  [SPARK_KEYS, P => isCarrierType(P) && !(+P.carrierTail > 0) && !(+P.subTail > 0), '「子弹火花率」「子星火花率」都是 0（这一层没有火花）时不起作用'],
  [['emberAll'], P => !(+P.sparkStop > 0), '「火花停止时刻」是 0 时不起作用（火花本来就全程都有，余烬也一样）'],
  [['fade', 'lastFlare', 'flicker', 'headSize', 'headTear', 'headDim', 'headDimUntil', 'strobeHz', 'strobeDuty', 'strobeStart', 'carrierHead'], P => !(+P.headBright > 0), '「星头亮度」是 0（星头不发光，只有尾迹 / 火花）时不起作用'],
];
function inertWhy(key, P) {
  if (!P || familyOf(P.type) !== 'aerial') return '';
  for (const [ks, f, why] of INERT) if (ks.includes(key) && f(P)) return why;
  return '';
}
function p43On() { pviewInit(); return !!pview.v43; }
function p43Label(nm, fallback) { return nm ? (pview.en ? nm.en || nm.cn : nm.cn || nm.en) : fallback; }
// 4.3 布局：阶段 → 模块。返回 place(sec, it, key) → 这一行该放进的模块 details
function p43Skeleton(host, grp) {
  const mods = {};
  const place = (sec, it, key) => {
    const nm = key ? pnameOf(sec.sec, key, Array.isArray(it) ? it[1] : it.label) : null;
    let mod = nm && nm.mcn || (/输出|导出|画质|曝光|规格|入点/.test(sec.sec) ? '烘焙输出' : '烟花特性');
    if (!P43_MODULE_GROUP[mod]) mod = '烟花特性';
    if (!mods[mod]) {
      const g = P43_MODULE_GROUP[mod], d = document.createElement('details'); d.className = 'sec mod'; d.open = pview.mopen[mod] !== false;
      const men = nm && nm.men || (PNAMES.find(r => r.mcn === mod) || {}).men || '';
      d.innerHTML = `<summary>${mod}${men ? `<small class="men">${men}</small>` : ''}</summary>`;
      d.addEventListener('toggle', () => { pview.mopen[mod] = d.open; store.set('pModOpen', pview.mopen); });
      d._sec = { sec: mod }; d._g = g; d._mod = mod;
      // 模块按 P43_GROUPS 里的顺序插：找后面第一个已经建好的模块，插在它前面
      const order = P43_GROUPS.find(x => x[0] === g)[2], after = order.slice(order.indexOf(mod) + 1).map(m => mods[m]).find(Boolean);
      grp[g].insertBefore(d, after || null); mods[mod] = d;
    }
    // 节的说明（以前每节一个「？」）挂到模块上：同一个模块收了几节，说明都在
    const d = mods[mod];
    if (sec.hint && !(d._hints || (d._hints = new Set())).has(sec.sec)) {
      d._hints.add(sec.sec);
      let p = d.querySelector(':scope > p.hint'); if (!p) { const b = document.createElement('span'); b.className = 'shelp'; b.setAttribute('role', 'button'); b.tabIndex = 0; b.title = '这个模块的说明'; b.textContent = '？';
        d.querySelector('summary').appendChild(b); p = document.createElement('p'); p.className = 'hint'; p.hidden = true; d.querySelector('summary').after(p);
        const tog = e => { e.preventDefault(); e.stopPropagation(); p.hidden = !p.hidden; b.classList.toggle('on', !p.hidden); if (!d.open) d.open = true; };
        b.addEventListener('click', tog); b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') tog(e); }); }
      p.insertAdjacentHTML('beforeend', `<span class="hsec"><b>${sec.sec}</b>：${sec.hint}</span>`);
    }
    return d;
  };
  return place;
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
