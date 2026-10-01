// =====================================================================
//  左栏「库」+ 右栏「审阅」+ 实拍并排对照 + 面板宽度
//  库：迭代区（tool/data/review.js，做完等你看的）/ 正式库（15_replica.js，确认过的）/ 组合 / 花型
//  审阅：通过 / 要改 + 意见，存在这台电脑的浏览器里；「复制意见」贴给 Claude
// =====================================================================
const lib = { q: '', key: '', review: null, open: store.get('libOpen', { rv: true, rep: true, combo: false, types: true }) };
const ref2 = { on: store.get('refOn', true), off: 0 };

async function setTab(tab, o = {}) {
  const changed = tab !== state.tab;
  state.tab = tab; if (changed) state.t = 0;
  $('#pMaster').hidden = tab !== 'master'; $('#pCombo').hidden = tab !== 'combo'; $('#pIter').hidden = tab !== 'iter'; $('#pAsset').hidden = tab !== 'asset';
  $('#viewSeg').hidden = tab === 'asset'; $('#assetCv').hidden = tab !== 'asset';
  $('#ptabs').hidden = !(tab === 'master' || tab === 'iter');
  for (const b of $('#ptabs').children) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  if (!changed) return;
  if (tab === 'combo' && !o.lazy) { await ensureLibrary(); if (!state.layers.length) applyCombo(COMBOS[0]); else buildComboPanel(); }
  if (tab === 'iter') { renderMetrics(); abInfo(); renderVersions(); }
  if (tab === 'asset') assetPanel();
}

// ---------------- 审阅记录 ----------------
const rvGet = () => store.get('review', {});
// 审阅标记按「条目 + 版本指纹」记（用户 2026-09-30 14:46：新版本不能继承旧版本的「要改」）
const rvKey = e => e ? e.id + (e.ver ? '@' + e.ver : '') : '';
const rvOf = e => rvGet()[rvKey(e)] || {};
function rvSet(id, patch) { const all = rvGet(); all[id] = { ...(all[id] || {}), ...patch, at: new Date().toISOString().slice(0, 16).replace('T', ' ') }; store.set('review', all); }
function rvBadge(e) {
  if (e.kind === 'queued') return '<span class="badge q">排队</span>';
  const r = rvOf(e);
  if (r.st === 'ok') return '<span class="badge ok">通过</span>';
  if (r.st === 'fix') return '<span class="badge fix">要改</span>';
  return '';
}
function rvText() {
  const all = rvGet(), lines = [];
  for (const e of FW_REVIEW_LIST) {
    const r = all[rvKey(e)]; if (!r || (!r.st && !r.txt)) continue;
    const ef = effectOfEntry(e);
    lines.push(`- ${ef ? ef.名 + ' · ' : ''}${e.id}（版本 ${e.ver || '?'}）${e.name}：${r.st === 'ok' ? '通过' : r.st === 'fix' ? '要改' : '未定'}${r.txt ? ' —— ' + r.txt.replace(/\n+/g, '；') : ''}`);
  }
  return lines.length ? `审阅意见（烘焙器 v${VERSION}，${new Date().toLocaleString('zh-CN', { hour12: false })}）\n` + lines.join('\n') : '';
}
async function rvCopy() {
  const t = rvText(); if (!t) { flash('还没有写任何审阅意见', true); return; }
  let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (e2) { } ta.remove();
  }
  $('#updList').innerHTML = `<section class="upd-it new"><h3>审阅意见${ok ? '（已复制，直接粘贴到对话里）' : '（请手动全选复制）'}</h3><pre style="white-space:pre-wrap;font:12.5px/1.6 var(--sans)">${t.replace(/</g, '&lt;')}</pre></section>`;
  $('#updDlg').hidden = false;
}


// ---------------- 效果（协作/状态清单.json → FW_EFFECTS）----------------
const EFF_PREFIX = [['QA', 'qiuxing_a'], ['YA', 'qiuxing_a'], ['QB', 'qiuxing_b'], ['YB', 'qiuxing_b'], ['ZB', 'qiuxing_b'], ['QC', 'qiuxing_c'], ['YC', 'qiuxing_c'], ['QD', 'qiuxing_d'], ['YD', 'qiuxing_d'],
  ['QN', 'qingning'], ['YQ', 'qingning'], ['JM', 'jinmangju'], ['TR', 'trail_v5'], ['TF', 'trail_phys'], ['TP', 'trail_phys'], ['PW', 'wancai'], ['WC', 'wancai'], ['YW', 'wancai'], ['ZW', 'wancai'],
  ['HK', 'hongchao'], ['YK', 'hongchao'], ['RK', 'hongchao'], ['ZK', 'hongchao'], ['FS', 'yongfeng'], ['YF', 'yongfeng'], ['RF', 'yongfeng'], ['ZF', 'yongfeng'], ['PK', 'pianbei'], ['YP', 'pianbei'], ['RP', 'pianbei'], ['ZP', 'pianbei']];
const EFFS = () => typeof FW_EFFECTS !== 'undefined' ? FW_EFFECTS : [];
function effectOfEntry(e) {
  if (!e) return null; const id = (e.layerOf || e.id || '').replace(/^rep:/, '');
  const hit = EFFS().find(ef => [ef.主条目, ef.工作版, ef.待验收版, ef.已通过版, ...(ef.方案 || []).map(v => v.id), ...(ef.历史 || []).map(h => h.id)].some(x => x && x.replace(/^rep:/, '').replace(/@.*$/, '') === id));
  if (hit) return hit;
  const pk = EFF_PREFIX.find(([p]) => id.startsWith(p)); return pk ? EFFS().find(ef => ef.key === pk[1]) : null;
}
function effHistOf(e) { const ef = effectOfEntry(e); return ef && (ef.历史 || []).find(h => h.id.replace(/@.*$/, '') === e.id) || null; }
function entryById(id) { if (!id) return null; if (id.startsWith('rep:')) return REPLICA_BY_ID[id.slice(4)] ? { formal: REPLICA_BY_ID[id.slice(4)] } : null; return FW_REVIEW_LIST.find(e => e.id === id) || null; }
function effMainEntry(ef) { const x = entryById(ef.阶段 === '待验收' && ef.待验收版 ? ef.待验收版 : ef.主条目); return x && !x.formal ? x : null; }
function effIsNew(ef) { if (ef.阶段 !== '待验收' || !ef.待验收版) return false; const e = entryById(ef.待验收版); return !!e && !e.formal && !rvOf(e).st; }
function effNewCount() { return EFFS().filter(effIsNew).length; }
// 标准检查（协作/标准.md 第 4 节）：tool/data/standard.js，由 analysis/scripts/标准检查.py 生成
function stdOf(id) { return id && typeof FW_STANDARD !== 'undefined' && FW_STANDARD.items ? FW_STANDARD.items[id] || null : null; }
function stdBadge(id) {
  const r = stdOf(id); if (!r) return '';
  const bad = (r.checks || []).filter(c => !c[1]).map(c => c[0] + (c[2] ? '（' + c[2] + '）' : ''));
  return `<span class="badge ${r.pass ? 'ok' : 'std'}" title="${r.pass ? '标准检查全部通过' : '没过：' + bad.join('；').replace(/"/g, '')}">${r.pass ? '标准 ✓' : '标准 ✗ ' + bad.length}</span>`;
}
function stdCard(id) {
  const r = stdOf(id); if (!r) return '';
  return `<div class="rt">标准检查 ${r.pass ? '✅ 全部通过' : '❌'}${r.note ? ' · ' + r.note : ''}（${FW_STANDARD.generated}）</div><ul class="std">${(r.checks || []).map(c => `<li class="${c[1] ? 'ok' : 'bad'}">${c[1] ? '✓' : '✗'} ${c[0]}${c[2] ? ' · ' + c[2] : ''}</li>`).join('')}</ul>`;
}
function effBadge(ef) {
  if (ef.阶段 === '未开始') return '<span class="badge q">未开始</span>';
  if (ef.阶段 === '待验收') { const e = entryById(ef.待验收版); const r = e && !e.formal ? rvOf(e) : {}; return r.st === 'ok' ? '<span class="badge ok">你已通过</span>' : r.st === 'fix' ? '<span class="badge fix">你要改</span>' : '<span class="badge new">新</span>'; }
  if (ef.阶段 === '已通过') return '<span class="badge ok">通过</span>';
  const js = (ef.jobs || []).filter(j => j.type !== 'export'), last = js[js.length - 1];
  const run = js.some(j => j.state === '在算'), back = !!last && last.state === '已回来' && !last.seen && ef.阶段 === '制作中';
  return `<span class="badge">${run ? '计算中' : back ? 'AI 待看' : '制作中'}</span>`;
}
function effSubline(ef) {
  const id = ef.阶段 === '待验收' ? ef.待验收版 : ef.阶段 === '已通过' ? ef.已通过版 : ef.工作版 || ef.主条目, e = entryById(id);
  const lay = e && !e.formal && e.kind === 'combo' ? ` · ${(e.layerIds || []).length} 层` : '';
  const run = (ef.jobs || []).filter(j => j.state === '在算').map(j => j.id);
  return `${ef.阶段 === '待验收' ? '候选 ' : ef.阶段 === '已通过' ? '通过版 ' : '工作版 '}${(id || '—').replace(/^rep:/, '')}${lay}${run.length ? ' · 在算 ' + run.join('、') : ''}`;
}
function openEffect(ef) {
  const x = entryById(ef.阶段 === '待验收' && ef.待验收版 ? ef.待验收版 : ef.主条目);
  lib.effect = ef;
  if (!x) { setQueuedView(false); lib.key = 'ef:' + ef.key; setReview(null); renderLib(); crumb(ef.阶段, ef.名); showEffectOnly(ef); return; }
  if (x.formal) openFormal(x.formal, ef); else openReview(x, ef);
}
function showEffectOnly(ef) { const box = $('#pReview'); box.hidden = false; box.innerHTML = effHeaderHTML(ef, null); bindEffHeader(box, ef); }
// 效果头：阶段、四个进度、版本（候选 / 工作 / 通过）、方案、准备情况（实时模拟 / 烘焙回放 / 贴图 / 素材包）、任务、历史
function effHeaderHTML(ef, cur) {
  if (!ef) return '';
  const g = ef.进度 || {}, ok = (b, t) => `<span class="pg${b ? ' on' : ''}">${b ? '✓' : '·'} ${t}</span>`;
  const ver = (lab, id) => id ? `<button class="btn mini${cur && (cur.id === id.replace(/^rep:/, '') || 'rep:' + cur.id === id) ? ' cur' : ''}" type="button" data-open="${id}">${lab} · ${id.replace(/^rep:/, '')}</button>` : '';
  const vars = (ef.方案 || []).map(v => `<button class="btn mini${cur && cur.id === v.id.replace(/^rep:/, '') ? ' cur' : ''}" type="button" data-open="${v.id}">${v.label}</button>`).join('');
  const jobs = (ef.jobs || []).filter(j => j.state !== '已回来' || !j.seen).slice(-4).map(j => `${j.id}（${j.state === '已回来' ? 'AI 还没看' : j.state}）`).join('、');
  const hist = (ef.历史 || []).map(h => { const e = entryById(h.id.replace(/@.*$/, '')); return `<li>${e && !h.id.includes('@') ? `<a href="#" data-open="${h.id}">${h.id}</a>` : h.id} · ${h.结论}${h.反馈 ? ' —— ' + h.反馈 : ''}</li>`; }).join('');
  return `<div class="effh"><div class="rh"><span class="badge">${ef.阶段}</span><b>${ef.名}</b><small>负责：${ef.负责 || '—'}</small></div>
    <div class="pgs">${ok(g.计算, '计算完成')}${ok(g.AI自检, 'AI 自检')}${ok(g.素材导出, '素材导出')}${ok(g.用户验收, '你已验收')}</div>
    <div class="rt">版本</div><div class="rlayers">${ver('待你验收', ef.待验收版)}${ver('工作版', ef.阶段 === '已通过' ? null : ef.工作版)}${ver('已通过', ef.已通过版)}</div>
    ${vars ? `<div class="rt">方案 / 分档</div><div class="rlayers">${vars}</div>` : ''}
    <div class="rt">准备情况</div><div class="ready" id="effReady">${readyHTML(ef, cur)}</div>
    ${ef.交付说明 ? `<div class="rt">这版（AI 推荐的完整候选）</div><ul class="deliv"><li><b>解决了：</b>${ef.交付说明.解决了什么 || ''}</li><li><b>仍有差异：</b>${ef.交付说明.仍有差异 || '—'}</li><li><b>素材：</b>${ef.交付说明.素材在哪 || ''}</li></ul>` : ''}
    ${(() => { const c = (ef.exports || []).find(x => !x.legacy && !x.stale); return c ? `<p class="op"><a href="../analysis/results/${c.job}/烘焙回放.jpg" target="_blank" rel="noopener">导出自检对照图（实拍 / 实时模拟 / 导出效果，开花后同一秒）</a> · <a href="../analysis/results/${c.job}/回放检查.jpg" target="_blank" rel="noopener">贴图回放检查</a></p>` : ''; })()}
    ${ef.说明 ? `<p class="op">${ef.说明}</p>` : ''}
    ${ef.缺 && ef.缺.length ? `<div class="rt">还缺</div><ul>${ef.缺.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    ${jobs ? `<p class="qnote">任务：${jobs}</p>` : ''}
    ${hist ? `<details class="hist"><summary>历史版本（${(ef.历史 || []).length}）· 否决 / 被取代，保留参数和你的反馈</summary><ul>${hist}</ul></details>` : ''}</div>`;
}
function readyHTML(ef, cur) {
  const row = (t, st, cls) => `<div class="rd ${cls || ''}"><span>${t}</span><b>${st}</b></div>`;
  const live = cur ? (cur.kind === 'asset' ? '无（这一条是贴图回放）' : '可以（打开就是）') : '—';
  const combo = state.tab === 'combo';
  const baked = combo ? (state.layers.length && state.layers.every(L => { const e = state.lib.find(x => x.name === L.lib); return e && e.bake; }) ? '已在本机烘好 → 「导出效果」看' : '打开后在本机烘焙中…') : (state.bake && !state.dirty ? '已在本机烘好 → 「导出效果」「贴图」看' : '烘焙中…');
  const ex = (ef.exports || []);
  const cur1 = ex.find(x => !x.legacy && !x.stale), stale = ex.find(x => x.stale), legacy = ex.find(x => x.legacy);
  const pack = cur1 ? `已生成（${cur1.job} · ${cur1.time || ''}，和当前版本一致）` : stale ? `已过期：${stale.job} 导出后参数改过` : legacy ? `旧导出 ${legacy.job}（没有版本记录，不能确认是当前版本）` : '尚未生成';
  const dirty = lib.sig && lib.sig !== curSig() ? row('你在这里改了参数', '上面的素材包是改之前的版本', 'warn') : '';
  return row('实时模拟', live) + row('烘焙回放', cur ? baked : '—') + row('贴图 / 素材包', pack, cur1 ? 'on' : stale ? 'warn' : '') + dirty;
}
function curSig() { try { return JSON.stringify(state.tab === 'combo' ? state.layers : [state.P, state.M]); } catch (e) { return ''; } }
function bindEffHeader(box, ef) {
  box.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', ev => { ev.preventDefault(); const x = entryById(b.dataset.open.replace(/@.*$/, '')); if (!x) return; if (x.formal) openFormal(x.formal, ef); else openReview(x, ef); }));
}
setInterval(() => { const el = document.getElementById('effReady'); if (el && lib.effect && !document.hidden) { const h = readyHTML(lib.effect, lib.review || (lib.formal ? { id: lib.formal.id } : null)); if (el.innerHTML !== h) el.innerHTML = h; } }, 1500);

// ---------------- 左栏 ----------------
function thumbHTML(e) {
  if (e.thumbRef || e.thumbSim) return `<span class="th">${e.thumbRef ? `<i style="background-image:url(${e.thumbRef})"></i>` : ''}${e.thumbSim ? `<i style="background-image:url(${e.thumbSim})"></i>` : ''}</span>`;
  return `<span class="th" style="${typeThumbStyle(e.key || e.id)}"></span>`;
}
function libMatch(...txt) { const q = lib.q.trim().toLowerCase(); return !q || txt.join(' ').toLowerCase().includes(q); }
function libItem(host, key, html, onClick, plain) {
  const d = document.createElement('div'); d.className = 'li' + (plain ? ' plain' : '') + (key === lib.key ? ' cur' : ''); d.tabIndex = 0; d.setAttribute('role', 'button'); d.dataset.key = key;
  d.innerHTML = html; d.addEventListener('click', onClick); d.addEventListener('keydown', ev => { if (ev.key === 'Enter') onClick(); });
  host.appendChild(d); return d;
}
function libGroup(host, id, title, count, hot, extra) {
  const det = document.createElement('details'); det.className = 'lg'; det.open = lib.q ? true : lib.open[id];
  det.innerHTML = `<summary>${title}<span class="n${hot ? ' hot' : ''}">${count}</span><span class="sp"></span>${extra || ''}</summary>`;
  det.addEventListener('toggle', () => { if (!lib.q) { lib.open[id] = det.open; store.set('libOpen', lib.open); } });
  host.appendChild(det); return det;
}
function renderLib() {
  const host = $('#libBody'); host.innerHTML = '';
  const all = rvGet();
  // 效果（用户 2026-09-30 14:46）：默认三个入口「待我验收 / 制作中 / 已通过」，历史另开；一个效果一个主条目
  const segs = [['review', '待我验收'], ['wip', '制作中'], ['passed', '已通过'], ['hist', '历史']];
  const effs = typeof FW_EFFECTS !== 'undefined' ? FW_EFFECTS : [];
  const segOf = ef => ({ '待验收': 'review', '已通过': 'passed' })[ef.阶段] || 'wip';
  const cnt = k => k === 'hist' ? FW_REVIEW_LIST.filter(e => e.superseded).length : effs.filter(ef => segOf(ef) === k).length;
  if (!lib.seg) lib.seg = store.get('libSeg', '') || (cnt('review') ? 'review' : 'wip');
  const bar = document.createElement('div'); bar.className = 'segs'; bar.setAttribute('role', 'tablist');
  bar.innerHTML = segs.map(([k, t]) => `<button type="button" role="tab" data-seg="${k}" aria-selected="${lib.seg === k}">${t}<span class="n${k === 'review' && effNewCount() ? ' hot' : ''}">${cnt(k)}</span></button>`).join('');
  bar.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { lib.seg = b.dataset.seg; store.set('libSeg', lib.seg); renderLib(); }));
  host.appendChild(bar);
  const box = document.createElement('div'); box.className = 'segbody'; host.appendChild(box);
  const copy = document.createElement('p'); copy.className = 'lsub segtool';
  copy.innerHTML = '<button class="mini" id="rvCopy" type="button" title="把通过 / 要改和意见复制下来，贴到对话里">复制我的意见</button>';
  copy.querySelector('#rvCopy').addEventListener('click', rvCopy);
  if (lib.seg !== 'hist') {
    const list = effs.filter(ef => segOf(ef) === lib.seg && libMatch(ef.名, ef.key, ef.主条目 || '', ef.说明 || ''));
    list.sort((x, y) => (x.阶段 === '未开始') - (y.阶段 === '未开始'));
    if (!list.length) box.insertAdjacentHTML('beforeend', `<p class="lsub">${{ review: '现在没有等你验收的效果。AI 自检、导出回放都过了的完整候选才会出现在这里。', wip: '没有制作中的效果', passed: '还没有通过的效果' }[lib.seg]}</p>`);
    for (const ef of list) {
      const me = effMainEntry(ef), badge = effBadge(ef) + stdBadge(ef.待验收版 || ef.主条目);
      const sub = effSubline(ef);
      const fm = (ef.主条目 || '').startsWith('rep:') ? REPLICA_BY_ID[ef.主条目.slice(4)] : null;
      const th = ef.thumb ? `<span class="th"><i style="background-image:url(${ef.thumb})"></i></span>` : fm ? thumbHTML({ ...fm, key: 'rep:' + fm.id }) : me ? thumbHTML(me) : '<span class="th"></span>';
      const it = libItem(box, 'ef:' + ef.key, th + `<span class="tx"><b>${ef.名}</b><small>${ef.阶段 === '未开始' ? (ef.说明 || '未开始') : sub}</small></span>` + badge, () => openEffect(ef));
      if (ef.阶段 === '未开始') it.classList.add('dimmed');
    }
    if (lib.seg === 'passed') {
      const formal = REPLICAS.filter(r => !r.fromReview && libMatch(r.id, r.name, r.tags || '', r.note || ''));
      if (formal.length) box.insertAdjacentHTML('beforeend', '<p class="lsub">正式库（全部条目）</p>');
      for (const r of formal) libItem(box, 'rep:' + r.id, thumbHTML({ ...r, key: 'rep:' + r.id }) + `<span class="tx"><b>${r.name}</b><small>${r.task || r.id} · 正式库</small></span>`, () => openFormal(r));
    }
  } else {
    // 历史：各效果被否决 / 被取代的版本（保留参数、对照和你的反馈），和不属于任何效果的内部试验
    const old = FW_REVIEW_LIST.filter(e => e.superseded && !e.hidden && libMatch(e.id, e.name, e.tags || ''));
    const groups = new Map();
    for (const e of old) { const ef = effectOfEntry(e); const k = ef ? ef.名 : '内部试验 / 其他'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
    if (!old.length) box.insertAdjacentHTML('beforeend', '<p class="lsub">没有历史版本</p>');
    for (const [k, arr] of groups) {
      box.insertAdjacentHTML('beforeend', `<p class="lsub">${k}</p>`);
      for (const e of arr) {
        const h = effHistOf(e), verdict = h ? h.结论 : '被取代';
        libItem(box, 'rv:' + e.id, thumbHTML(e) + `<span class="tx"><b>${e.name}</b><small>${e.id} · ${verdict}${h && h.反馈 ? ' · ' + h.反馈 : ''}</small></span><span class="badge">${verdict}</span>`, () => openReview(e));
      }
    }
  }
  box.appendChild(copy);
  // 组合
  if (libMatch('组合 芯 八重芯 三重芯 叠加')) {
    const g3 = libGroup(host, 'combo', '工具 · 组合编辑器', 1);
    libItem(g3, 'combo', `<span class="tx"><b>组合编辑器</b><small>一个菊 + 几层缩小的牡丹 = 八重芯 / 三重芯</small></span>`, () => { setQueuedView(false); lib.key = 'combo'; setReview(null); setTab('combo'); renderLib(); crumb('组合', '组合编辑器'); }, true);
  }
  // 花型（基础）
  const types = []; for (const [gname, ts] of TYPE_GROUPS) for (const t of ts) { const m = TYPE_META[t] || ['', '']; if (libMatch(TYPE_NAMES[t], TYPE_EN[t], m[0], m[1], gname)) types.push([gname, t, m]); }
  const g4 = libGroup(host, 'types', '工具 · 花型（从头调）', types.length);
  let last = '', grid = null;
  for (const [gname, t, m] of types) {
    if (gname !== last) { g4.insertAdjacentHTML('beforeend', `<p class="lsub">${gname}</p>`); grid = document.createElement('div'); grid.className = 'tiles'; g4.appendChild(grid); last = gname; }
    const k = 'type:' + t, d = document.createElement('button'); d.type = 'button'; d.className = 'tile' + (k === lib.key ? ' cur' : ''); d.dataset.key = k; d.title = `${TYPE_NAMES[t]}：${m[0]}`;
    d.innerHTML = `<span class="im" style="${typeThumbStyle(t)}"></span><span class="nm">${TYPE_NAMES[t]}</span>`;
    d.addEventListener('click', () => openType(t)); grid.appendChild(d);
  }
}
function libReveal() {
  lib.open.types = true; store.set('libOpen', lib.open); setPanels({ side: true }); renderLib();
  const el = document.querySelector('#libBody .tile.cur') || document.querySelector('#libBody .tiles');
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

// ---------------- 打开条目 ----------------
function crumb(where, name, badge) { $('#crumb').innerHTML = `<span>${where}</span>›<b>${name}</b>${badge || ''}`; }
// 4.0-c：多层效果里单独调过的层，回到整体时要用调过的参数（不能再用组合缓存里的旧烘焙）
function rememberLayerEdit() {
  const r = lib.review;
  if (!r || !r.layerOf || state.tab === 'combo' || !lib.sig || curSig() === lib.sig) return;
  state.layerEdits = state.layerEdits || {};
  state.layerEdits[r.id] = { P: structuredClone(state.P), M: structuredClone(state.M) };
}
function openReview(e, ef) {
  rememberLayerEdit();
  lib.effect = ef || effectOfEntry(e); lib.formal = null;
  lib.key = ef ? 'ef:' + ef.key : 'rv:' + e.id; store.set('lastKey', lib.key);
  const where = (lib.effect ? lib.effect.阶段 + ' · ' + lib.effect.名 : '条目') + (e.superseded ? ' · 历史' : '');
  setQueuedView(e.kind === 'queued');
  if (e.kind === 'queued') { setReview(e); renderLib(); crumb(where, e.name); return; }
  if (e.kind === 'combo') { setReview(e); renderLib(); crumb(where, e.name + ' · 整体'); openComboEntry(e); return; }
  if (e.kind === 'asset') { setTab('asset'); loadAssetEntry(e); }
  else {
    setReplica(e.id); setTab('master');
    // 回到之前单独调过的层：接着用调过的参数（lib.sig 仍按条目原始参数记，左栏能提示「你改过参数」）
    const ed = state.layerEdits && state.layerEdits[e.id];
    if (ed) { lib.sig = curSig(); state.P = structuredClone(ed.P); state.M = structuredClone(ed.M); buildMasterPanel(); onParam(); setReview(e); renderLib(); crumb(where, e.name + ' · 单层（已调整）'); return; }
  }
  lib.sig = curSig();
  setReview(e); renderLib(); crumb(where, e.name + (e.layerOf ? ' · 单层' : ''));
}
// 组合条目：整体效果（组合页实时模拟 + 实拍并排）；各层在审阅卡里单独打开
async function openComboEntry(e) {
  state.view = 'live'; document.querySelectorAll('#viewSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === 'live'));
  await setTab('combo', { lazy: true }); await applyCombo(e.combo); lib.sig = curSig(); setReview(e);   // lazy：只烘这个组合用到的层，不先烘整套默认母版
}
function openFormal(r, ef) {
  lib.effect = ef || effectOfEntry({ id: r.id }); lib.formal = r;
  setQueuedView(false); lib.key = ef ? 'ef:' + ef.key : 'rep:' + r.id; setReplica(r.id); setTab('master'); lib.sig = curSig(); setReview(null, r); renderLib(); crumb(lib.effect ? lib.effect.阶段 + ' · ' + lib.effect.名 : '正式库', r.name);
}
function openType(t) { lib.effect = null; lib.formal = null; setQueuedView(false); lib.key = 'type:' + t; setType(t); setTab('master'); setReview(null); renderLib(); crumb('花型', TYPE_NAMES[t]); }

// 排队中的条目：还没有结果，只放实拍（要对的目标），右栏只留审阅卡
function setQueuedView(on) {
  document.querySelector('.canvas-wrap').classList.toggle('refonly', on); $('#right').classList.toggle('qmode', on);
  ref2.on = on ? true : store.get('refOn', true);
  $('#refTag').dataset.q = on ? '1' : '';
}
// ---------------- 右栏审阅卡 ----------------
function setReview(e, formal) {
  lib.review = e || null; const box = $('#pReview');
  const vidEntry = e || (formal && formal.video ? { id: 'rep:' + formal.id, video: '../' + formal.video, vmeta: (typeof FW_VMETA !== 'undefined' && FW_VMETA['../' + formal.video]) || null } : null);
  setRefVideo(vidEntry);
  const ef = lib.effect;
  if (!e) {
    if (formal && ef) { box.hidden = false; box.innerHTML = effHeaderHTML(ef, { id: formal.id }); bindEffHeader(box, ef); }
    else { box.hidden = true; box.innerHTML = ''; }
    return;
  }
  const r = rvOf(e), cand = ef && ef.阶段 === '待验收' && ef.待验收版 === e.id;
  box.hidden = false;
  box.innerHTML = effHeaderHTML(ef, e) + `<div class="rh"><span class="badge">${e.superseded ? '历史版本' : cand ? '待你验收的候选' : e.layerOf ? '其中一层' : '当前工作版（AI 在做，不用你审）'} · ${e.task}</span><b>${e.name}</b><small>${e.date || ''} · 版本 ${e.ver || '—'}</small></div>
    <p>${e.note || ''}</p>
    ${e.kind === 'combo' && e.layerIds ? `<div class="rt">这是整体效果（${e.layerIds.length} 层叠在一起）· 要单独调某一层点下面</div><div class="rlayers">${e.layerIds.map((id, i) => `<button class="btn mini" type="button" data-layer="${id}">${(e.layerNames || [])[i] || id}</button>`).join('')}</div>` : ''}
    ${e.layerOf ? `<p class="qnote">这是「${e.layerOf}」的其中一层。<button class="btn mini" type="button" data-whole="${e.layerOf}">回到整体效果</button></p>` : ''}
    ${e.look && e.look.length ? `<div class="rt">看什么</div><ul>${e.look.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    ${e.opinion ? `<div class="rt">${e.kind === 'queued' ? '这一版改了什么' : 'AI 的看法'}</div><p class="op">${e.opinion}</p>` : ''}
    ${stdCard(e.id)}
    ${(e.doc || []).map(([t, items]) => `<div class="rt">${t}</div><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`).join('')}
    ${e.images && e.images.length ? `<div class="rt">${e.imagesTitle || (e.principle ? '实拍关键帧' : '说明图')}（点图放大）</div><div class="rimgs">${e.images.map(([src, cap]) => `<figure><a href="${src}" target="_blank" rel="noopener"><img src="${src}" loading="lazy" alt="${cap}"></a><figcaption>${cap}</figcaption></figure>`).join('')}</div>` : ''}
    ${e.kind === 'queued' ? '<p class="qnote">还没跑。在你电脑上双击 <b>analysis/local/跑任务_并行.bat</b>（3 个进程同时跑），跑完会自动推上来；pull 后刷新烘焙器，这一条就能看了。</p>' : ''}
    <div class="ra"${e.kind === 'queued' ? ' hidden' : ''}><button class="btn okb" type="button" aria-pressed="${r.st === 'ok'}">✓ 通过（整体达到预期）</button><button class="btn fixb" type="button" aria-pressed="${r.st === 'fix'}">✗ 要改</button></div>
    <textarea id="rvTxt"${e.kind === 'queued' ? ' hidden' : ''} placeholder="意见：哪里不像、要改什么（写完会自动保存）">${(r.txt || '').replace(/</g, '&lt;')}</textarea>
    <div class="saved" id="rvSaved"${e.kind === 'queued' ? ' hidden' : ''}>${r.at ? '已保存 ' + r.at + ' · 左栏下面「复制我的意见」贴给 Claude' : '意见按这一版记在这台电脑的浏览器里；写完点左栏下面「复制我的意见」贴给 Claude'}</div>`;
  bindEffHeader(box, ef);
  const setSt = st => { const cur = rvOf(e).st; rvSet(rvKey(e), { st: cur === st ? '' : st }); setReview(e); renderLib(); };
  box.querySelectorAll('[data-layer]').forEach(b => b.addEventListener('click', () => { const le = FW_REVIEW_LIST.find(x => x.id === b.dataset.layer); if (le) openReview(le); }));
  box.querySelectorAll('[data-whole]').forEach(b => b.addEventListener('click', () => { const ce = FW_REVIEW_LIST.find(x => x.id === b.dataset.whole && x.kind === 'combo'); if (ce) openReview(ce); }));
  box.querySelector('.okb').addEventListener('click', () => setSt('ok'));
  box.querySelector('.fixb').addEventListener('click', () => setSt('fix'));
  let tm = 0; box.querySelector('#rvTxt').addEventListener('input', ev => { clearTimeout(tm); tm = setTimeout(() => { rvSet(rvKey(e), { txt: ev.target.value }); $('#rvSaved').textContent = '已保存 · 左栏下面「复制我的意见」贴给 Claude'; renderLib(); }, 500); });
  refRestoreOffset(e);
}

// ---------------- 实拍并排 ----------------
//   条目带实拍视频时，顶栏出现「实拍对照」开关（R）；开：左实拍右模拟，关：模拟画布占满。开关状态全局记住。
//   对齐：画布上的 −/+ 按钮微调实拍时间，每个条目各记各的。
function refName(src) { try { return decodeURIComponent(src).split('/').pop().replace(/\.mp4$/i, ''); } catch (e) { return ''; } }
function setRefVideo(e) {
  ref2.entry = e && e.video ? e : null;
  const has = !!ref2.entry, show = has && ref2.on, v = $('#refVid');
  $('#btnRef').hidden = !has; $('#btnRef').setAttribute('aria-pressed', String(show));
  $('#refBox').hidden = !show; $('#simTag').hidden = !show;
  document.querySelector('.canvas-wrap').classList.toggle('split', show);
  if (!show) { v.pause(); return; }
  if (v.dataset.src !== e.video) { v.dataset.src = e.video; v.src = e.video; v.load(); }
  $('#refTag').textContent = ($('#refTag').dataset.q ? '要对的实拍 · ' : '实拍 · ') + refName(e.video);
  refRestoreOffset(e);
  requestAnimationFrame(layoutRef);
}
function refToggle(on) {
  if (!ref2.entry) return;
  ref2.on = on == null ? !ref2.on : on; store.set('refOn', ref2.on); setRefVideo(ref2.entry);
  flash(ref2.on ? '实拍对照：开' : '实拍对照：关（按 R 再打开）');
}
function refRestoreOffset(e) { ref2.off = (store.get('refOff', {})[e.id]) || 0; refShowOffset(); }
function refShowOffset() { const o = ref2.off; $('#refOffOut').textContent = `对齐 ${o > 0 ? '+' : o < 0 ? '−' : ''}${Math.abs(o).toFixed(2)} s`; }
function refNudge(d) {
  if (!ref2.entry) return;
  ref2.off = d === 0 ? 0 : Math.round((ref2.off + d) * 100) / 100;
  const o = store.get('refOff', {}); o[ref2.entry.id] = ref2.off; store.set('refOff', o); refShowOffset();
}
function layoutRef() {
  const v = $('#refVid'), box = $('#refBox'); if (box.hidden || !v.videoWidth) return;
  const S = box.clientWidth, vm = physRefMeta((ref2.entry && ref2.entry.vmeta) || { cx: 0.5, cy: 0.5, half: 0.5 }, state.P);
  const asp = v.videoWidth / v.videoHeight, half = vm.half || 0.5;
  const Hd = S / (2 * half), Wd = Hd * asp;
  Object.assign(v.style, { width: Wd + 'px', height: Hd + 'px', left: (S / 2 - vm.cx * Wd) + 'px', top: (S / 2 - vm.cy * Hd) + 'px' });
}
function refSync() {
  const box = $('#refBox'); if (box.hidden) return;
  const v = $('#refVid'); if (!v.duration || v.readyState < 2) return;
  if (ref2.entry && ref2.entry.vmeta && ref2.entry.vmeta.follow) layoutRef();   // 物理尾缀：实拍逐帧跟着星头取景
  const vm = (ref2.entry && ref2.entry.vmeta) || { t0: 0 };
  const want = (vm.t0 || 0) + ref2.off + state.t, tgt = Math.max(0, Math.min(v.duration - 0.05, want));
  box.classList.toggle('out', want < 0 || want > v.duration);   // 实拍这一刻没有画面（比视频开头早或晚）
  if (state.playing) {
    if (v.playbackRate !== state.speed) v.playbackRate = Math.max(0.0625, state.speed);
    if (v.paused) v.play().catch(() => { });
    if (Math.abs(v.currentTime - tgt) > 0.15 && !v.seeking) v.currentTime = tgt;
  } else {
    if (!v.paused) v.pause();
    if (Math.abs(v.currentTime - tgt) > 0.03 && !v.seeking) v.currentTime = tgt;
  }
}

// ---------------- 面板：左栏、右栏、专注、宽度 ----------------
const panels = { side: store.get('sideOn', true), right: store.get('rightOn', true), before: null };
function setPanels(o) {
  Object.assign(panels, o);
  const m = $('#main'); m.classList.toggle('noside', !panels.side); m.classList.toggle('noright', !panels.right);
  store.set('sideOn', panels.side); store.set('rightOn', panels.right);
  $('#btnSide').setAttribute('aria-pressed', String(panels.side)); $('#btnRight').setAttribute('aria-pressed', String(panels.right));
  $('#btnFocus').setAttribute('aria-pressed', String(!panels.side && !panels.right));
}
function toggleFocus() {
  if (!panels.side && !panels.right) setPanels(panels.before || { side: true, right: true });
  else { panels.before = { side: panels.side, right: panels.right }; setPanels({ side: false, right: false }); flash('专注：F 或双击画布恢复'); }
}
function initPanels() {
  const root = document.documentElement;
  root.style.setProperty('--sideW', store.get('sideW', 268) + 'px'); root.style.setProperty('--rightW', store.get('rightW', 390) + 'px');
  const drag = (el, fn) => el.addEventListener('pointerdown', e0 => {
    e0.preventDefault(); el.setPointerCapture(e0.pointerId); el.classList.add('drag'); document.body.classList.add('dragging');
    const mv = e => fn(e.clientX), up = () => { el.classList.remove('drag'); document.body.classList.remove('dragging'); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  });
  drag($('#gutL'), x => { const lim = window.innerWidth - (panels.right ? $('#right').offsetWidth : 0) - 420, w = Math.round(Math.max(210, Math.min(460, lim, x))); root.style.setProperty('--sideW', w + 'px'); store.set('sideW', w); });
  drag($('#gutR'), x => { const lim = window.innerWidth - (panels.side ? $('#side').offsetWidth : 0) - 420, w = Math.round(Math.max(330, Math.min(700, lim, window.innerWidth - x))); root.style.setProperty('--rightW', w + 'px'); store.set('rightW', w); });
  $('#gutL').addEventListener('dblclick', () => { root.style.setProperty('--sideW', '268px'); store.set('sideW', 268); });
  $('#gutR').addEventListener('dblclick', () => { root.style.setProperty('--rightW', '390px'); store.set('rightW', 390); });
  $('#btnSide').addEventListener('click', () => setPanels({ side: !panels.side }));
  $('#btnRight').addEventListener('click', () => setPanels({ right: !panels.right }));
  $('#btnFocus').addEventListener('click', toggleFocus);
  $('#btnRef').addEventListener('click', () => refToggle());
  $('#refClose').addEventListener('click', () => refToggle(false));
  document.querySelector('.refctl').addEventListener('click', e => { const b = e.target.closest('button'); if (b) refNudge(+b.dataset.d); });
  document.querySelector('.canvas-wrap').addEventListener('dblclick', e => { if (!e.target.closest('button')) toggleFocus(); });
  const cw = document.querySelector('.canvas-wrap');
  new ResizeObserver(() => { const W = cw.clientWidth, H = cw.clientHeight; cw.classList.toggle('stack', Math.min(W, H / 2) > Math.min(W / 2, H)); layoutRef(); }).observe(cw);
  document.addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'f') { e.preventDefault(); toggleFocus(); }
    else if (k === 'r') { e.preventDefault(); refToggle(); }
    else if (k === 'l') { e.preventDefault(); setPanels({ side: !panels.side }); }
    else if (k === 'p') { e.preventDefault(); setPanels({ right: !panels.right }); }
    else if (k === 'escape' && !panels.side && !panels.right && $('#updDlg').hidden && $('#picker').hidden) toggleFocus();
    else if ((k === 'arrowdown' || k === 'arrowup') && /^(ef|rv|rep):/.test(lib.key)) {   // ↑ ↓ 在左栏条目之间切换
      const items = [...document.querySelectorAll('#libBody .segbody .li')], i = items.findIndex(x => x.dataset.key === lib.key), j = i + (k === 'arrowdown' ? 1 : -1);
      if (items[j]) { e.preventDefault(); items[j].click(); items[j].scrollIntoView({ block: 'nearest' }); }
    }
  });
  setPanels({});
}
function initLibrary() {
  $('#libSearch').addEventListener('input', e => { lib.q = e.target.value; renderLib(); });
  $('#libSearch').addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; lib.q = ''; renderLib(); e.target.blur(); } });
  for (const b of $('#ptabs').children) b.addEventListener('click', () => setTab(b.dataset.tab));
  $('#refVid').addEventListener('loadedmetadata', layoutRef);
  initPanels();
  // 打开时：有没看过的迭代区条目就先打开最新的一条；否则回到上次看的
  // 打开时：有「新」的待验收候选就先打开它；否则回到上次看的
  const fresh = EFFS().find(effIsNew), lastKey = store.get('lastKey', '');
  const lastEf = EFFS().find(ef => 'ef:' + ef.key === lastKey), lastRv = FW_REVIEW_LIST.find(e => 'rv:' + e.id === lastKey);
  if (fresh) { lib.seg = 'review'; }
  renderLib();
  if (/[?&]fast/.test(location.search)) return;     // 本地任务的自动化（compare.py）不自动打开条目
  if (fresh) openEffect(fresh); else if (lastEf) openEffect(lastEf); else if (lastRv) openReview(lastRv); else crumb('花型', TYPE_NAMES[state.P.type]);
}
