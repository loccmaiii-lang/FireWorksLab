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
// 阶段 → 模块（按 Cascade 发射器从上到下，analysis/命名/模块表.json）。4.3：尾缀那几族原来的「受力 / 外观 / 尾迹」并进
// 「阻力重力 / 星头 / 火花 / 曝光光晕」（和空中礼花同一个词）；尾缀各层、上升、弹道、地面、烘焙输出是那几族自己的模块
const P43_GROUPS = [
  ['发射', 'Emitter · 发射', ['发射器', '生成', '寿命', '形状', '初速', '上升', '弹道', '自转与喷射', '地面']],
  ['运动', 'Motion · 运动', ['阻力重力']],
  ['外观', 'Appearance · 外观', ['星头', '火花', '尾迹外形', '烟花特性', '子花', '蜂']],
  ['层', 'Layers · 尾缀各层', ['白热火花', '金火花', '橙色火花', '丝状火花', '星头燃气焰', '落火', '烟带']],
  ['输出', 'Render · 渲染输出', ['入点出点', '帧与贴图', '曝光光晕', '画质', '镜头', '引擎附加', '烘焙输出']],
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
  // 4.3（H13 / 渲染基础问题清单审计 4.4）：
  [['headDimUntil'], P => !(+P.headDim < 1), '「前段亮度」是 1（不压暗）时不起作用：先把前段亮度调到 1 以下'],
  [['preRoll', 'preScale0', 'prePivot'], P => P.zoom === 'on', '「面片取景」是「随开花放大」时不起作用（Zoom 本来就从小放大）'],
  [['emberFrac', 'emberLife', 'emberBright', 'emberFollow', 'emberSize', 'emberEnd', 'emberAll'], P => +P.branch > 0, '「松叶分叉数」> 0 时不出余烬（分叉的火花占了余烬那一路）'],
  [['tailWidth', 'tailPinchHead', 'tailPinchTail', 'tailBellyAt', 'tailShoulder', 'tailJit', 'tailHaze', 'tailHazeR', 'sparkRise', 'starBright', 'tailDiffuse', 'tailDiffuseScale', 'branch', 'branchAt'], P => P.engine === 'cpu', '「模拟内核」是 CPU 时不起作用（尾迹外形只在 GPU 内核里算）'],
  [['chaos'], P => !(+P.spin > 0), '「旋转速度」是 0 时不起作用'],
  [['fade', 'lastFlare', 'flicker', 'headSize', 'headTear', 'headDim', 'headDimUntil', 'strobeHz', 'strobeDuty', 'strobeStart', 'carrierHead'], P => !(+P.headBright > 0), '「星头亮度」是 0（星头不发光，只有尾迹 / 火花）时不起作用'],
];
function inertWhy(key, P) {
  if (!P) return '';
  for (const [ks, f, why] of INERT) if (ks.includes(key) && f(P)) return why;
  return '';
}
function p43Label(nm, fallback) { return nm ? (pview.en ? nm.en || nm.cn : nm.cn || nm.en) : fallback; }
// 烟花特性里「开了才展开」：这几个开关不是 0 时，模块打开时自动展开（爆裂星、点灭星、带余烬的锦冠……一打开就看得到起作用的那几项）
const FX_SWITCH = ['strobeHz', 'glitter', 'crackle', 'branch', 'flutter', 'emberFrac'];
const fxOn = P => FX_SWITCH.some(k => +P[k] > 0);
const PMODULE = (() => { const m = {}; for (const x of (typeof PMODULES !== 'undefined' ? PMODULES : [])) m[x.cn] = x; return m; })();
// 阶段 → 模块。返回 place(sec, it, key, nm) → 这一行该放进的地方（模块，或模块里的「更多」）
function p43Skeleton(host, grp, P) {
  const mods = {};
  // 每个模块有没有「第一眼」的行：全是「更多」的模块（尾迹外形、烟花特性、渲染输出那几个）不再套一层「更多」，整个模块收起来就是
  const hasCore = {};
  for (const sec of SCHEMA) for (const it of sec.items) {
    const key = Array.isArray(it) ? it[0] : it.sel || it.text || (it.info ? 'info:' + it.info : ''); if (!key) continue;
    const nm = pnameOf(sec.sec, key, Array.isArray(it) ? (typeof it[1] === 'function' ? '' : it[1]) : it.label); if (nm && nm.tier !== 'more') hasCore[nm.mcn] = true;
  }
  const modOf = (sec, nm) => { let mod = nm && nm.mcn || (/输出|导出|画质|曝光|规格|入点/.test(sec.sec) ? '帧与贴图' : '烟花特性'); return P43_MODULE_GROUP[mod] ? mod : '烟花特性'; };
  const place = (sec, it, key, nm) => {
    const mod = modOf(sec, nm);
    if (!mods[mod]) {
      const g = P43_MODULE_GROUP[mod], d = document.createElement('details'); d.className = 'sec mod';
      const pm = PMODULE[mod], dflt = pm ? pm.open : true;
      // 一建好时的开合不算用户操作（不然「爆裂星打开时烟花特性自动展开」会被记成「以后都展开」）
      d._auto = true; d.open = mod === '烟花特性' && fxOn(P) ? true : pview.mopen[mod] != null ? pview.mopen[mod] : dflt; setTimeout(() => d._auto = false, 0);
      const men = pm && pm.en || nm && nm.men || (PNAMES.find(r => r.mcn === mod) || {}).men || '';
      d.innerHTML = `<summary>${mod}${men ? `<small class="men">${men}</small>` : ''}</summary>`;
      d.addEventListener('toggle', () => { if (d._auto) return; pview.mopen[mod] = d.open; store.set('pModOpen', pview.mopen); });
      d._sec = { sec: mod }; d._g = g; d._mod = mod;
      // 模块按 P43_GROUPS 里的顺序插：找后面第一个已经建好的模块，插在它前面
      const order = P43_GROUPS.find(x => x[0] === g)[2], after = order.slice(order.indexOf(mod) + 1).map(m => mods[m]).find(Boolean);
      grp[g].insertBefore(d, after || null); mods[mod] = d;
      // 模块说明（「？」）：模块表的「放什么」；尾缀 / 地面那几族的模块没有模块表，用节说明
      const what = pm ? pm.what : '';
      if (what) addModHelp(d, what);
    }
    const d = mods[mod];
    if (!PMODULE[mod] && sec.hint && !(d._hints || (d._hints = new Set())).has(sec.sec)) { d._hints.add(sec.sec); addModHelp(d, sec.hint); }
    if (!(nm && nm.tier === 'more') || !hasCore[mod]) return d;
    if (!d._more) {
      const m = document.createElement('details'); m.className = 'more'; m._auto = true; m.open = !!pview.more[mod]; setTimeout(() => m._auto = false, 0);
      m.innerHTML = '<summary><span class="mn">更多</span></summary>';
      m.addEventListener('toggle', () => { if (m._auto) return; pview.more[mod] = m.open; store.set('pMoreOpen', pview.more); });
      d.appendChild(m); d._more = m;
    }
    return d._more;
  };
  return place;
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
// 空白发射器（4.3）：没加的模块整块藏起来；「外观」后面一行「+ 添加模块」，加了的模块标题上有「去掉」
function p43BlankControls(grp, P) {
  if (!isBlank(P)) return;
  const g = grp['外观']; if (!g) return;
  const box = document.createElement('div'); box.className = 'addmod'; box.id = 'blankAdd';
  box.innerHTML = '<span class="hint">空白发射器只有星。要火花、尾迹、点灭 / 爆裂这些就加模块：</span><span class="addmod-btns"></span>';
  g.appendChild(box);
  for (const d of document.querySelectorAll('#params details.mod')) {
    if (!BLANK_MODS[d._mod]) continue;
    const x = document.createElement('button'); x.type = 'button'; x.className = 'btn mini ghost modrm'; x.textContent = '去掉'; x.title = `去掉「${d._mod}」模块（它的参数回到不起作用的值）`;
    x.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (blankRemoveModule(state.P, d._mod)) { buildMasterPanel(); onParam(); } });
    d.querySelector('summary').appendChild(x);
  }
}
function p43BlankSync(P) {
  const box = $('#blankAdd'); if (!box) return;
  const btns = box.querySelector('.addmod-btns'), todo = Object.keys(BLANK_MODS).filter(m => !(P.mods || []).includes(m));
  btns.innerHTML = todo.map(m => `<button type="button" class="btn mini" data-addmod="${m}" title="${BLANK_MODS[m].what}">+ ${m}</button>`).join('') || '<span class="hint">都加上了</span>';
  btns.querySelectorAll('[data-addmod]').forEach(b => b.addEventListener('click', () => { if (blankAddModule(state.P, b.dataset.addmod)) { pview.mopen[b.dataset.addmod] = true; buildMasterPanel(); onParam(); } }));
}

