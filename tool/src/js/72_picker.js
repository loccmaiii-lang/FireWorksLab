// =====================================================================
//  花型库：分类、搜索、缩略图、收藏、最近使用
// =====================================================================
const TYPE_META = {
  blank: ['只有星：火花、尾迹外形、烟花特性按需「+ 添加模块」', '空白 从零 新建 发射器 blank'],
  kiku: ['星带火花尾迹，经典日式菊', '尾迹 火花 球'], botan: ['星不带尾迹，点状牡丹；常做芯', '无尾 芯 球'],
  kamuro: ['金色长火花、慢慢下垂的锦冠', '火花长 下垂 金 尾迹'], yanagi: ['火花很长、大幅下垂的柳', '火花长 下垂 尾迹'],
  senrin: ['星分裂成很多朵小花', '千轮 子花'], hachi: ['乱飞打转的星', '乱飞'],
  palm: ['少量粗大的星，粗尾迹下垂', '火花长 下垂 少星 尾迹'], henka: ['五段变色的菊', '变色'],
  strobe: ['后半程星头一明一灭', '点灭 闪烁'], glitter: ['尾迹里的火花延迟闪亮', '辉星 闪烁'],
  crackle: ['星熄灭时噼啪爆裂', '爆裂 噼啪'], matsuba: ['火花中途分叉成松针状', '分叉 松叶'],
  crossette: ['星中途分成十字四颗', '分裂 十字'], ochiba: ['慢速飘落、左右摆动', '飘落 摆动'],
  jisa: ['开花后星陆续点亮', '延时 点亮'], ring: ['倾斜的圆环', '环 形状'], saturn: ['小球加环', '环 形状'],
  kata: ['心形、笑脸、五角星、文字', '形状 文字'], water: ['贴水面的半球加倒影', '水面 倒影 半球'],
  rise: ['从地面升到开花高度，7 种曲导', '上升 曲导 尾迹'],
  trailS: ['升空尾缀（小）：短、细、几乎笔直，金橙色火花', '上升 尾缀 尾迹 循环 消散 小'], trailM: ['升空尾缀（V5）：小 / 中 / 大三档在「发射器 · 尾缀档位」里切', '上升 尾缀 尾迹 循环 消散 小 中 大'], trailL: ['升空尾缀（大）：粗亮，大星头带光晕，明显螺旋', '上升 尾缀 尾迹 循环 消散 大 四尺玉'],
  fountain: ['地面喷泉，可排成扇面', '循环 地面 喷泉 扇形'], falls: ['一排往下落的火花瀑布', '循环 地面 瀑布'],
  wheel: ['旋转的火轮', '循环 地面 旋转'], fan: ['扇形连射的彗星', '循环 地面 扇形 连发'],
  barrage: ['一发接一发往上打，末端开小花', '循环 地面 连发'], shikake: ['发光的文字或图案', '循环 地面 文字']
};
const PK_CATS = [['all', '全部'], ['mytpl', '我的模板'], ['myfxl', '我的效果的层'], ['fx', '现有效果的层'], ['fav', '收藏'], ['recent', '最近使用'], ...TYPE_GROUPS.map(([g]) => [g, g]), ['多层模板', '多层模板']];     // 4.5.5 多层花型模板（18_multitypes.js）
const pk = { cat: 'all', q: '', fav: new Set(), recent: [], mode: 'open', onPick: null };
// 4.2.7：现有效果（待我验收 / 制作中 / 已通过）的每一层，可以拿来当新效果的层（参数复制一份）
function pkFxItems() {
  const out = [], seen = new Set();
  for (const ef of EFFS()) {
    const id = ef.待验收版 || ef.工作版 || ef.主条目; if (!id || id.startsWith('rep:')) continue;
    const e = FW_REVIEW_LIST.find(x => x.id === id); if (!e) continue;
    const ids = e.kind === 'combo' ? (e.layerIds || []) : [e.id];
    ids.forEach((lid, i) => { if (seen.has(lid) || !REPLICA_BY_ID[lid]) return; seen.add(lid); const le = FW_REVIEW_LIST.find(x => x.id === lid);
      out.push({ key: 'rv:' + lid, name: `${ef.名.replace(/（.*）/, '')}${ids.length > 1 ? ' · ' + ((e.layerNames || [])[i] || (le && le.name) || '第 ' + (i + 1) + ' 层') : ''}`, cat: 'fx', desc: `${lid} · 基于${TYPE_NAMES[REPLICA_BY_ID[lid].base] || REPLICA_BY_ID[lid].base}`, tags: [ef.阶段], fx: le || e }); });
  }
  return out;
}
function typeThumbStyle(key) {
  const rep = key.startsWith('rep:') ? REPLICA_BY_ID[key.slice(4)] : null;
  const src = (rep && rep.thumbSim) || (typeof THUMBS !== 'undefined' && THUMBS[key]) || null;
  if (src) return `background-image:url(${src})`;
  const d = key.startsWith('rep:') ? null : defaultsFor(key);
  const c = d ? d.M.stages[0][1] : '#e9b45f';
  return `background:radial-gradient(circle at 50% 45%, ${c} 0 6%, ${c}55 22%, #05060a 60%)`;
}
function pkItems() {
  const out = [];
  for (const [g, types] of TYPE_GROUPS) for (const t of types) {
    const m = TYPE_META[t] || ['', ''];
    out.push({ key: t, name: TYPE_NAMES[t], cat: g, desc: m[0], tags: m[1].split(' ').filter(Boolean) });
  }
  if (pk.mode !== 'open') out.push(...pkFxItems());
  if (typeof pkMyItems === 'function') out.push(...pkMyItems(pk.mode));     // 4.5.0 我的模板 / 我的效果的层（都能收藏）
  out.push(...pkMultiItems(pk.mode));     // 4.5.5 多层花型模板：打开 = 多层查看器；新建效果 = 整套层存成我的效果；加一层时不列
  return out;
}
function pkFiltered() {
  const q = pk.q.trim().toLowerCase(); let items = pkItems();
  if (pk.cat === 'fav') items = items.filter(i => pk.fav.has(i.key));
  else if (pk.cat === 'recent') items = pk.recent.map(k => items.find(i => i.key === k)).filter(Boolean);
  else if (pk.cat !== 'all') items = items.filter(i => i.cat === pk.cat);
  if (q) items = items.filter(i => (i.name + ' ' + i.desc + ' ' + i.tags.join(' ') + ' ' + (TYPE_EN[i.key] || '')).toLowerCase().includes(q));
  return items;
}
function pkRender() {
  const cats = $('#pkCats'); cats.innerHTML = '';
  const all = pkItems();
  for (const [k, l] of PK_CATS) {
    if ((k === 'fx' || k === 'myfxl') && pk.mode === 'open') continue;
    const n = k === 'all' ? all.length : k === 'fav' ? pk.fav.size : k === 'recent' ? pk.recent.length : all.filter(i => i.cat === k).length;
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(pk.cat === k));
    b.innerHTML = `${l}<span>${n}</span>`; b.addEventListener('click', () => { pk.cat = k; pkRender(); }); cats.appendChild(b);
  }
  const grid = $('#pkGrid'); grid.innerHTML = '';
  const items = pkFiltered(), cur = state.repId ? 'rep:' + state.repId : state.P.type;
  if (!items.length) { grid.innerHTML = `<p class="pk-empty">没有匹配的花型。</p>`; return; }
  for (const it of items) {
    const c = document.createElement('div'); c.className = 'pk-card' + (it.key === cur ? ' cur' : ''); c.tabIndex = 0; c.setAttribute('role', 'button');
    const th = it.fx ? thumbHTML(it.fx).replace(/^<span class="th"/, '<span class="th pkfx"') : `<div class="th" style="${it.thumbStyle || typeThumbStyle(it.thumbType || it.key)}"></div>`;   // 只用渲染图（用户 2026-10-02 14:46：缩略图不用实拍）
    c.innerHTML = th + `<div class="bd"><span class="nm">${it.name}</span><span class="ds">${it.desc || ''}</span><span class="tg">${it.tags.map(t => `<span>${t}</span>`).join('')}</span></div>` +
      (it.rep ? `<span class="st">${it.rep.status || '待你确认'}</span>` : '') + `<button class="fav" type="button" aria-label="收藏" aria-pressed="${pk.fav.has(it.key)}">★</button>`
      + (it.cat === 'mytpl' ? `<button class="pk-del" type="button" aria-label="删除这个模板" title="删除这个模板（6 秒内能撤销）">删</button>` : '');
    c.querySelector('.fav').addEventListener('click', e => { e.stopPropagation(); pk.fav.has(it.key) ? pk.fav.delete(it.key) : pk.fav.add(it.key); store.set('fav', [...pk.fav]); pkRender(); });
    const del = c.querySelector('.pk-del'); if (del) del.addEventListener('click', e => { e.stopPropagation(); removeTemplate(it.key.slice(4)); });
    const pick = () => { const fn = pk.onPick, mode = pk.mode; pkClose(); pk.recent = [it.key, ...pk.recent.filter(k => k !== it.key)].slice(0, 12); store.set('recent', pk.recent);
      if (String(it.key).startsWith('mt:')) { Promise.resolve(mode === 'newEffect' ? mtCreateMine(it.key.slice(3)) : openMultiType(it.key.slice(3))).catch(e => { console.error(e); flash('出错了：' + (e.message || e), true); }); return; }     // 4.5.5
      if (fn) { Promise.resolve(fn(it.key)).catch(e => { console.error(e); flash('出错了：' + (e.message || e), true); }); return; }
      if (String(it.key).startsWith('tpl:')) openTemplate(it.key.slice(4)); else if (String(it.key).startsWith('rep:')) setType(it.key); else openType(it.key); };
    c.addEventListener('click', pick); c.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
    grid.appendChild(c);
  }
}
// 4.2.7：花型库三种用法——打开模板（默认）、新建效果（选第一层）、给我的效果加一层；o.onPick(key) 接住选中的
function pkOpen(o = {}) {
  pk.mode = o.mode || 'open'; pk.onPick = o.onPick || null; if (pk.mode !== 'open' && pk.cat === 'all') pk.cat = 'all';
  $('#pkTitle').textContent = o.title || '花型库 · 选一个花型模板打开';
  $('#picker').hidden = false; pkRender(); $('#pkSearch').focus();
}
function pkClose() { $('#picker').hidden = true; pk.onPick = null; pk.mode = 'open'; $('#typeBtn').focus(); }
function syncTypeButton() {
  const key = state.repId ? 'rep:' + state.repId : state.P.type, r = state.repId ? REPLICA_BY_ID[state.repId] : null;
  $('#typeName').textContent = r ? r.name : TYPE_NAMES[state.P.type];
  $('#typeCat').textContent = r ? (r.fromReview ? '条目' : '已通过') + ' · 基于' + TYPE_NAMES[r.base] : (TYPE_GROUPS.find(([, ts]) => ts.includes(state.P.type)) || [FAMILY_LABEL[familyOf(state.P.type)]])[0] + ' · ' + (TYPE_META[state.P.type] || [''])[0];
  $('#typeThumb').setAttribute('style', typeThumbStyle(key));
}
function initPicker() {
  pk.fav = new Set(store.get('fav', [])); pk.recent = store.get('recent', []);
  $('#typeBtn').addEventListener('click', () => { libReveal(); });
  $('#pkClose').addEventListener('click', pkClose);
  $('#pkSearch').addEventListener('input', e => { pk.q = e.target.value; if (pk.q && pk.cat !== 'all') pk.cat = 'all'; pkRender(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#picker').hidden) pkClose(); });
}
