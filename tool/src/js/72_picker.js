// =====================================================================
//  花型库：分类、搜索、缩略图、收藏、最近使用
// =====================================================================
const TYPE_META = {
  kiku: ['星带尾缀，经典日式菊', '尾缀 球'], botan: ['星不带尾缀，点状牡丹；常做芯', '无尾 芯 球'],
  kamuro: ['金色长尾、慢慢下垂的锦冠', '尾缀长 下垂 金'], yanagi: ['尾缀很长、大幅下垂的柳', '尾缀长 下垂'],
  senrin: ['星分裂成很多朵小花', '千轮 子花'], hachi: ['乱飞打转的星', '乱飞'],
  palm: ['少量粗大的星，重尾下垂', '尾缀长 下垂 少星'], henka: ['五段变色的菊', '变色'],
  strobe: ['后半程星头一明一灭', '点灭 闪烁'], glitter: ['尾缀里的火花延迟闪亮', '辉星 闪烁'],
  crackle: ['星熄灭时噼啪炸开', '爆裂 噼啪'], matsuba: ['火花中途分叉成松针状', '分叉 松叶'],
  crossette: ['星中途分成十字四颗', '分裂 十字'], ochiba: ['慢速飘落、左右摆动', '飘落 摆动'],
  jisa: ['开花后星陆续点亮', '延时 点亮'], ring: ['倾斜的圆环', '环 形状'], saturn: ['小球加环', '环 形状'],
  kata: ['心形、笑脸、五角星、文字', '形状 文字'], water: ['贴水面的半球加倒影', '水面 倒影 半球'],
  rise: ['从地面升到开花高度，7 种曲导', '上升 曲导 尾迹'],
  trailS: ['升空尾缀（小）：短、细、几乎笔直，金橙色火星', '上升 尾缀 尾迹 循环 消散 小'], trailM: ['升空尾缀（中）：细长银白亮线，轻微波浪', '上升 尾缀 尾迹 循环 消散 中'], trailL: ['升空尾缀（大）：粗亮，大星头带光晕，明显螺旋', '上升 尾缀 尾迹 循环 消散 大 四尺玉'],
  fountain: ['地面喷泉，可排成扇面', '循环 地面 喷泉 扇形'], falls: ['一排往下落的火花瀑布', '循环 地面 瀑布'],
  wheel: ['旋转的火轮', '循环 地面 旋转'], fan: ['扇形连射的彗星', '循环 地面 扇形 连发'],
  barrage: ['一发接一发往上打，末端开小花', '循环 地面 连发'], shikake: ['发光的文字或图案', '循环 地面 文字']
};
const PK_CATS = [['all', '全部'], ['rep', '实拍复刻'], ['fav', '收藏'], ['recent', '最近使用'], ...TYPE_GROUPS.map(([g]) => [g, g])];
const pk = { cat: 'all', q: '', fav: new Set(), recent: [] };
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
  for (const r of REPLICAS) out.push({ key: 'rep:' + r.id, name: r.name, cat: 'rep', desc: r.note, tags: (r.tags || '').split(' ').filter(Boolean), rep: r });
  return out;
}
function pkFiltered() {
  const q = pk.q.trim().toLowerCase(); let items = pkItems();
  if (pk.cat === 'rep') items = items.filter(i => i.cat === 'rep');
  else if (pk.cat === 'fav') items = items.filter(i => pk.fav.has(i.key));
  else if (pk.cat === 'recent') items = pk.recent.map(k => items.find(i => i.key === k)).filter(Boolean);
  else if (pk.cat !== 'all') items = items.filter(i => i.cat === pk.cat);
  if (q) items = items.filter(i => (i.name + ' ' + i.desc + ' ' + i.tags.join(' ') + ' ' + (TYPE_EN[i.key] || '')).toLowerCase().includes(q));
  return items;
}
function pkRender() {
  const cats = $('#pkCats'); cats.innerHTML = '';
  const all = pkItems();
  for (const [k, l] of PK_CATS) {
    const n = k === 'all' ? all.length : k === 'rep' ? REPLICAS.length : k === 'fav' ? pk.fav.size : k === 'recent' ? pk.recent.length : all.filter(i => i.cat === k).length;
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(pk.cat === k));
    b.innerHTML = `${l}<span>${n}</span>`; b.addEventListener('click', () => { pk.cat = k; pkRender(); }); cats.appendChild(b);
  }
  const grid = $('#pkGrid'); grid.innerHTML = '';
  const items = pkFiltered(), cur = state.repId ? 'rep:' + state.repId : state.P.type;
  if (!items.length) { grid.innerHTML = `<p class="pk-empty">${pk.cat === 'rep' ? '实拍复刻正在按「一个一个对照确认」的方式重做，完成一个加一个。' : '没有匹配的花型。'}</p>`; return; }
  for (const it of items) {
    const c = document.createElement('div'); c.className = 'pk-card' + (it.key === cur ? ' cur' : ''); c.tabIndex = 0; c.setAttribute('role', 'button');
    const th = it.rep
      ? `<div class="th"><i style="${it.rep.thumbRef ? `background-image:url(${it.rep.thumbRef})` : 'background:#111'}"><b>实拍</b></i><i style="${typeThumbStyle(it.key)}"><b>模拟</b></i></div>`
      : `<div class="th" style="${typeThumbStyle(it.key)}"></div>`;
    c.innerHTML = th + `<div class="bd"><span class="nm">${it.name}</span><span class="ds">${it.desc || ''}</span><span class="tg">${it.tags.map(t => `<span>${t}</span>`).join('')}</span></div>` +
      (it.rep ? `<span class="st">${it.rep.status || '待你确认'}</span>` : '') + `<button class="fav" type="button" aria-label="收藏" aria-pressed="${pk.fav.has(it.key)}">★</button>`;
    c.querySelector('.fav').addEventListener('click', e => { e.stopPropagation(); pk.fav.has(it.key) ? pk.fav.delete(it.key) : pk.fav.add(it.key); store.set('fav', [...pk.fav]); pkRender(); });
    const pick = () => { pkClose(); pk.recent = [it.key, ...pk.recent.filter(k => k !== it.key)].slice(0, 12); store.set('recent', pk.recent); setType(it.key); };
    c.addEventListener('click', pick); c.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
    grid.appendChild(c);
  }
}
function pkOpen() { $('#picker').hidden = false; pkRender(); $('#pkSearch').focus(); }
function pkClose() { $('#picker').hidden = true; $('#typeBtn').focus(); }
function syncTypeButton() {
  const key = state.repId ? 'rep:' + state.repId : state.P.type, r = state.repId ? REPLICA_BY_ID[state.repId] : null;
  $('#typeName').textContent = r ? r.name : TYPE_NAMES[state.P.type];
  $('#typeCat').textContent = r ? '实拍复刻 · 基于' + TYPE_NAMES[r.base] : (TYPE_GROUPS.find(([, ts]) => ts.includes(state.P.type)) || ['礼花'])[0] + ' · ' + (TYPE_META[state.P.type] || [''])[0];
  $('#typeThumb').setAttribute('style', typeThumbStyle(key));
}
function initPicker() {
  pk.fav = new Set(store.get('fav', [])); pk.recent = store.get('recent', []);
  $('#typeBtn').addEventListener('click', () => { libReveal(); });
  $('#pkClose').addEventListener('click', pkClose);
  $('#pkSearch').addEventListener('input', e => { pk.q = e.target.value; if (pk.q && pk.cat !== 'all') pk.cat = 'all'; pkRender(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#picker').hidden) pkClose(); });
}
