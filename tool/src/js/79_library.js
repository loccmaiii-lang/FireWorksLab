// =====================================================================
//  左栏「库」+ 右栏「审阅」+ 实拍并排对照 + 面板宽度
//  库：迭代区（tool/data/review.js，做完等你看的）/ 正式库（15_replica.js，确认过的）/ 组合 / 花型
//  审阅：通过 / 要改 + 意见，存在这台电脑的浏览器里；「复制意见」贴给 Claude
// =====================================================================
const lib = { q: '', key: '', review: null, pane: 'params', open: store.get('libOpen2', {}) };
const ref2 = { on: store.get('refOn', true), off: 0 };

async function setTab(tab, o = {}) {
  const changed = tab !== state.tab;
  state.tab = tab; if (changed) state.t = 0;
  if (tab !== 'combo') { state.comboSel = -1; state.layerView = { solo: -1, mute: [] }; }
  $('#pMaster').hidden = tab !== 'master'; $('#pCombo').hidden = tab !== 'combo'; $('#pIter').hidden = tab !== 'iter'; $('#pAsset').hidden = tab !== 'asset';
  syncComboPanels();
  $('#viewSeg').hidden = tab === 'asset'; $('#assetCv').hidden = tab !== 'asset';
  syncPtabs();
  if (!changed) return;
  if (tab === 'iter') renderLegacy();
  if (tab === 'asset') assetPanel();
}

function syncPtabs() {
  const tab = state.tab, rv = lib.pane === 'review';
  $('#ptabs').hidden = tab === 'asset' || $('#right').classList.contains('qmode');
  $('#ptabs [data-tab=iter]').hidden = tab === 'combo';
  $('#right').classList.toggle('pane-review', rv);
  const cur = rv ? 'review' : tab === 'iter' ? 'iter' : 'master';
  for (const b of $('#ptabs').children) b.setAttribute('aria-selected', String(b.dataset.tab === cur));
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
// 4.2.5 版本指纹 = 条目参数指纹（review_to_baker.py 的 ver）· 每层产物种类的烘焙器输出版本（OUTPUT_VER）。
// 导出任务（export_job.py）、标准检查（标准检查.py）记录的都是它；输出规则改了，旧导出、旧标准检查就过期。
const _entryVer = new Map();
function outFamily(P) { const k = bakeKind(P); return k === 'segments' ? 'master' : k; }
function entryVer(e) {
  if (!e || !e.ver) return null;
  const key = e.id + '@' + e.ver; if (_entryVer.has(key)) return _entryVer.get(key);
  const fams = new Set();
  for (const id of (e.kind === 'combo' ? e.layerIds || [] : [e.id])) { try { if (typeof REPLICA_BY_ID !== 'undefined' && REPLICA_BY_ID[id]) fams.add(outFamily(replicaPM(id).P)); } catch (err) { } }
  const v = e.ver + '·' + ([...fams].sort().map(f => f + OUTPUT_VER[f]).join('+') || 'x');
  _entryVer.set(key, v); return v;
}
// 「待我验收」按证据把关：最新导出 = 当前版本指纹、回放检查过、标准检查（同一指纹）过；状态清单里写了「例外」（引用用户的决定）的那一项不算缺
function effReady(ef) {
  const e = entryById(ef.待验收版 || ef.主条目); if (!e || e.formal) return { ok: false, why: ['没有候选条目'], exc: [] };
  // 最新导出 = 导出时间最晚的那次（4.2.12：以前取列表最后一个，列表按任务号字面排序时 HN2E9 排在 HN2E12 后面，误判未就绪）
  const mine = (ef.exports || []).filter(x => !x.legacy && x.entry === e.id), ex = mine.reduce((a, x) => !a || (x.time || '') >= (a.time || '') ? x : a, null);
  const cur = entryVer(e), why = [], exc = [], sr = stdOf(e.id);
  const excOf = k => (ef.例外 || []).find(x => x.项 === k);
  const need = (k, bad) => { if (!bad) return; const x = excOf(k); if (x) exc.push(`${k}：${bad}（例外：${x.依据 || x.原因 || '用户同意'}）`); else why.push(bad); };
  need('导出', !ex ? '还没导出' : ex.ver !== cur ? (ex.ver && ex.ver.includes('·') ? '导出后参数或烘焙器输出规则改了，素材包过期' : '导出时没记录烘焙器输出版本（4.2.5 以前），要重导') : '');
  need('回放检查', ex && !ex.check ? '导出没有回放检查' : ex && ex.check && !ex.check.passed ? '回放检查没过' : '');
  need('标准检查', !sr ? '标准检查没跑' : sr.ver !== cur ? '标准检查是旧版本的结果' : !sr.pass ? `标准检查 ${(sr.checks || []).filter(c => !c[1]).length} 项没过` : '');
  return { ok: !why.length, why, exc, ver: cur, ex, sr };
}
function readyBadge(ef) {
  if (ef.阶段 !== '待验收' || !ef.待验收版) return '';
  const r = effReady(ef);
  return r.ok ? `<span class="badge ok" title="${['证据齐了：最新导出 = 当前版本、回放检查过、标准检查过', ...r.exc].join('；').replace(/"/g, '')}">就绪</span>`
    : `<span class="badge std" title="${('未就绪：' + r.why.join('；')).replace(/"/g, '')}">未就绪</span>`;
}
function stdOf(id) { return id && typeof FW_STANDARD !== 'undefined' && FW_STANDARD.items ? FW_STANDARD.items[id] || null : null; }
function stdBadge(id) {
  const r = stdOf(id); if (!r) return '';
  const e = entryById(id); if (e && !e.formal && r.ver !== entryVer(e)) return `<span class="badge" title="这条标准检查结果是旧版本（参数或烘焙器输出规则改过之前）的">标准 旧</span>`;
  const bad = (r.checks || []).filter(c => !c[1]).map(c => c[0] + (c[2] ? '（' + c[2] + '）' : ''));
  return `<span class="badge ${r.pass ? 'ok' : 'std'}" title="${r.pass ? '标准检查全部通过' : '没过：' + bad.join('；').replace(/"/g, '')}">${r.pass ? '标准 ✓' : '标准 ✗ ' + bad.length}</span>`;
}
// 检查与验收的四行（按草稿）：标准检查 / 导出回放 / 画面与包版本 / UE 实机
function checkRowsHTML(e, ef) {
  const row = (k, v, cls) => `<div class="ck"><span>${k}</span><b class="${cls || ''}">${v}</b></div>`, sr = stdOf(e.id);
  const ex = ef ? [...(ef.exports || [])].reverse().find(x => !x.legacy && x.entry === e.id) : null;
  const exs = !ex ? ['warn', '还没导出'] : ex.check ? (ex.check.passed ? ['ok', `通过（${ex.job}）`] : ['bad', `没过（${ex.job}）：${ex.check.fails.join('；')}`]) : ['', `已导出 ${ex.job}（没有回放检查）`];
  const cur = entryVer(e), ver = !ex ? ['', '—'] : ex.ver !== cur ? ['warn', ex.ver && ex.ver.includes('·') ? '导出后参数或烘焙器输出规则改了，素材包已过期' : '导出时没记录烘焙器输出版本（4.2.5 以前），要重导'] : ['ok', `一致（版本 ${cur}）`];
  const srOld = sr && sr.ver !== cur;
  return `<div class="cks">${row('标准检查', sr ? (srOld ? '是旧版本的结果，要重跑' : sr.pass ? '全部通过' : (sr.checks || []).filter(c => !c[1]).length + ' 项没过') : '还没跑', sr ? (srOld ? 'warn' : sr.pass ? 'ok' : 'bad') : 'warn')}${row('导出回放（PC / 手机）', exs[1], exs[0])}${row('画面与包版本', ver[1], ver[0])}${row('UE 实机', '未经验证', 'warn')}</div>`;
}
function stdCard(id) {
  const r = stdOf(id); if (!r) return '<p class="rline dim">标准检查：这一版还没跑</p>';
  const bad = (r.checks || []).filter(c => !c[1]).length;
  return `<details class="stdd"${r.pass ? '' : ' open'}><summary>标准检查 ${r.pass ? '✅ 全部通过' : '❌ ' + bad + ' 项没过'}<small>${r.note ? ' · ' + r.note : ''}（${FW_STANDARD.generated}）</small></summary><ul class="std">${(r.checks || []).map(c => `<li class="${c[1] ? 'ok' : 'bad'}">${c[1] ? '✓' : '✗'} ${c[0]}${c[2] ? ' · ' + c[2] : ''}</li>`).join('')}</ul></details>`;
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
// 4.2.3（走查 A5 / A6）：离开一个条目前，没保存的改动自动存成「草稿」；从左栏打开效果 = 回到 AI 版，
// 先丢掉这个效果里各层没保存的改动（已在草稿里），否则带改动的状态会被当成 AI 版的基准，「参数已变」不亮、「通过」放行。
function effEntryIds(ef) {
  const ids = new Set();
  for (const e of FW_REVIEW_LIST) if (effectOfEntry(e) === ef) { ids.add(e.id); (e.layerIds || []).forEach(i => ids.add(i)); }
  for (const k of [ef.主条目, ef.待验收版, ef.已通过版]) if (k) ids.add(String(k).replace(/^rep:/, ''));
  return ids;
}
function dropEffectEdits(ef) {
  if (!ef) return;
  for (const id of effEntryIds(ef)) {
    if (state.layerEdits) delete state.layerEdits[id];
    const le = state.lib.find(x => x.rep === id); if (le && le.editSig) { dropLibBake(le); state.lib.splice(state.lib.indexOf(le), 1); }
  }
}
function beforeOpen(nextEf) {
  autoDraft();
  if (lib.effect && (!nextEf || nextEf.key !== lib.effect.key)) dropEffectEdits(lib.effect);
  lib.my = null;            // 离开「我的效果」（openMyEffect 打开后会再设）
}
function openEffect(ef) {
  beforeOpen(ef); dropEffectEdits(ef);
  const x = entryById(ef.阶段 === '待验收' && ef.待验收版 ? ef.待验收版 : ef.主条目);
  lib.effect = ef;
  if (!x) { setQueuedView(false); lib.key = 'ef:' + ef.key; setReview(null); renderLib(); crumb(ef.阶段, ef.名); showEffectOnly(ef); return; }
  if (x.formal) openFormal(x.formal, ef); else return openReview(x, ef);
}
async function openMine(k, id) {
  if (k.startsWith('ef:')) { const ef = EFFS().find(x => 'ef:' + x.key === k); if (!ef) return; await openEffect(ef); }
  else if (k.startsWith('rv:')) { const e = FW_REVIEW_LIST.find(x => x.id === k.slice(3)); if (!e) return; await openReview(e); }
  else if (k.startsWith('rep:')) { const r = REPLICA_BY_ID[k.slice(4)]; if (!r) return; openFormal(r); }
  else if (k.startsWith('type:')) openType(k.slice(5));
  else if (k.startsWith('my:')) await openMyEffect(k.slice(3));          // 4.2.7：我的效果的草稿
  else return;
  await wbLoad(id); lib.key = 'mine:' + k + ':' + id; renderLib();
}
function showEffectOnly(ef) { const box = $('#pReview'); box.hidden = false; const x = effParts(ef, null); box.innerHTML = `<div class="rcard"><div class="rh">${x.head}</div>${x.pills}</div><div class="rcard">${x.more}</div>`; bindEffHeader(box, ef); lib.pane = 'params'; syncPtabs(); wbRefresh(); }
// 右栏卡片（2026-10-02 用户 07:43：参数要齐全、不再被长说明压着）：效果头拆成 head（阶段 + 名字）、pills（四个进度）、more（版本 / 准备情况 / 交付说明 / 任务 / 历史，默认折起来）
function effParts(ef, cur) {
  if (!ef) return { head: '', pills: '', more: '' };
  const g = ef.进度 || {}, ok = (b, t) => `<span class="pg${b ? ' on' : ''}">${b ? '✓' : '·'} ${t}</span>`;
  const ver = (lab, id) => id ? `<button class="btn mini${cur && (cur.id === id.replace(/^rep:/, '') || 'rep:' + cur.id === id) ? ' cur' : ''}" type="button" data-open="${id}">${lab} · ${id.replace(/^rep:/, '')}</button>` : '';
  const vars = (ef.方案 || []).map(v => `<button class="btn mini${cur && cur.id === v.id.replace(/^rep:/, '') ? ' cur' : ''}" type="button" data-open="${v.id}">${v.label}</button>`).join('');
  const jobs = (ef.jobs || []).filter(j => j.state !== '已回来' || !j.seen).slice(-4).map(j => `${j.id}（${j.state === '已回来' ? 'AI 还没看' : j.state}）`).join('、');
  const hist = (ef.历史 || []).map(h => { const e = entryById(h.id.replace(/@.*$/, '')); return `<li>${e && !h.id.includes('@') ? `<a href="#" data-open="${h.id}">${h.id}</a>` : h.id} · ${h.结论}${h.反馈 ? ' —— ' + h.反馈 : ''}</li>`; }).join('');
  const c = [...(ef.exports || [])].reverse().find(x => { if (x.legacy) return false; const e = entryById(x.entry); return !e || e.formal || x.ver === entryVer(e); });
  const more = `<div class="rt">版本</div><div class="rlayers">${ver('待你验收', ef.待验收版)}${ver('工作版', ef.阶段 === '已通过' ? null : ef.工作版)}${ver('已通过', ef.已通过版)}</div>
    <div class="rt">准备情况</div><div class="ready" id="effReady">${readyHTML(ef, cur)}</div>
    ${ef.交付说明 ? `<div class="rt">交付说明</div><ul class="deliv">${Object.entries(ef.交付说明).map(([k, v]) => `<li><b>${k}：</b>${v}</li>`).join('')}</ul>` : ''}
    ${c ? `<p class="op"><a href="../analysis/results/${c.job}/烘焙回放.jpg" target="_blank" rel="noopener">导出自检对照图（实拍 / 实时模拟 / 导出效果，开花后同一秒）</a> · <a href="../analysis/results/${c.job}/回放检查.jpg" target="_blank" rel="noopener">贴图回放检查</a></p>` : ''}
    ${ef.说明 ? `<p class="op">${ef.说明}</p>` : ''}
    ${ef.缺 && ef.缺.length ? `<div class="rt">还缺</div><ul>${ef.缺.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    ${jobs ? `<p class="qnote">任务：${jobs}</p>` : ''}
    ${hist ? `<details class="hist"><summary>历史版本（${(ef.历史 || []).length}）· 否决 / 被取代，保留参数和你的反馈</summary><ul>${hist}</ul></details>` : ''}`;
  return { head: `<span class="badge">${ef.阶段}</span><b>${ef.名}</b><small>负责：${ef.负责 || '—'}</small>`,
    pills: `<div class="pgs">${ok(g.计算, '计算完成')}${ok(g.AI自检, 'AI 自检')}${ok(g.素材导出, '素材导出')}${ok(g.用户验收, '你已验收')}</div>`
      // 分档（小 / 中 / 大）一直显示在卡片上，不再折在「版本与历史」里（用户 2026-10-02 19:25「只能看到一个，而不是三个」）
      + (vars ? `<div class="rlayers tiersR"><span class="rt">分档</span>${vars}</div>` : ''), more };
}
function effHeaderHTML(ef, cur) { const x = effParts(ef, cur); return x.head ? `<div class="effh"><div class="rh">${x.head}</div>${x.pills}${x.more}</div>` : ''; }
function readyHTML(ef, cur) {
  const row = (t, st, cls) => `<div class="rd ${cls || ''}"><span>${t}</span><b>${st}</b></div>`;
  const live = cur ? (cur.kind === 'asset' ? '无（这一条是贴图回放）' : '可以（打开就是）') : '—';
  const combo = state.tab === 'combo';
  const baked = combo ? (state.layers.length && state.layers.every(L => { const e = state.lib.find(x => x.name === L.lib); return e && e.bake; }) ? '已在本机烘好 → 「导出效果」看' : '打开后在本机烘焙中…') : (state.bake && !state.dirty ? '已在本机烘好 → 「导出效果」「贴图」看' : '烘焙中…');
  const ex = (ef.exports || []);
  const okV = x => { const e = entryById(x.entry); return !!e && !e.formal && x.ver === entryVer(e); };
  const cur1 = [...ex].reverse().find(x => !x.legacy && okV(x)), stale = [...ex].reverse().find(x => !x.legacy && !okV(x)), legacy = ex.find(x => x.legacy);
  const pack = cur1 ? `已生成（${cur1.job} · ${cur1.time || ''}，和当前版本一致）` : stale ? `已过期：${stale.job} 之后参数或烘焙器输出规则改了` : legacy ? `旧导出 ${legacy.job}（没有版本记录，不能确认是当前版本）` : '尚未生成';
  const dirty = lib.sig && lib.sig !== curSig() ? row('你在这里改了参数', '上面的素材包是改之前的版本', 'warn') : '';
  return row('实时模拟', live) + row('烘焙回放', cur ? baked : '—') + row('贴图 / 素材包', pack, cur1 ? 'on' : stale ? 'warn' : '') + dirty;
}
function curSig() { try { return JSON.stringify(state.tab === 'combo' ? [state.layers, state.layers.map(L => { const e = state.lib.find(x => x.name === L.lib); return e && e.P; })] : [state.P, state.M]); } catch (e) { return ''; } }
function bindEffHeader(box, ef) {
  box.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', ev => { ev.preventDefault(); const x = entryById(b.dataset.open.replace(/@.*$/, '')); if (!x) return; if (x.formal) openFormal(x.formal, ef); else openReview(x, ef); }));
}
setInterval(() => { const el = document.getElementById('effReady'); if (el && lib.effect && !document.hidden) { const h = readyHTML(lib.effect, lib.review || (lib.formal ? { id: lib.formal.id } : null)); if (el.innerHTML !== h) el.innerHTML = h; } }, 1500);

// ---------------- 左栏 ----------------
// 缩略图一律用渲染的（用户 2026-10-02 14:46「所有效果缩略图不要用实拍，用渲染的」）：
// 本机显卡按当前配方渲染的（review_to_baker 已换进 thumbSim）→ 对照图里模拟的那一半 → 花型模板的渲染图。实拍缩略图不显示。
function thumbHTML(e) {
  if (e.thumbSim) return `<span class="th"><i style="background-image:url(${e.thumbSim})"></i></span>`;
  // 多层条目还没有渲染缩略图：用第一层（有渲染图的那层，或它的花型模板渲染图）
  if (e.layerIds && typeof FW_REVIEW_LIST !== 'undefined') { const l = e.layerIds.map(id => FW_REVIEW_LIST.find(x => x.id === id)).filter(Boolean); const l0 = l.find(x => x.thumbSim) || l.find(x => x.base); if (l0) return thumbHTML(l0); }
  const k = e.base && typeof TYPE_NAMES !== 'undefined' && TYPE_NAMES[e.base] ? e.base : (e.key || e.id);
  return `<span class="th" style="${typeThumbStyle(k)}"></span>`;
}
function libMatch(...txt) { const q = lib.q.trim().toLowerCase(); return !q || txt.join(' ').toLowerCase().includes(q); }
function libItem(host, key, html, onClick, plain) {
  const d = document.createElement('div'); d.className = 'li' + (plain ? ' plain' : '') + (key === lib.key ? ' cur' : ''); d.tabIndex = 0; d.setAttribute('role', 'button'); d.dataset.key = key;
  d.innerHTML = html; d.addEventListener('click', onClick); d.addEventListener('keydown', ev => { if (ev.key === 'Enter') onClick(); });
  host.appendChild(d); return d;
}
function libGroup(host, id, title, count, hot, extra) {
  const det = document.createElement('details'); det.className = 'lg lg-' + id; det.open = lib.q ? true : !!lib.open[id];
  det.innerHTML = `<summary><span class="lt">${title}</span><span class="n${hot ? ' hot' : ''}">${count}</span><span class="sp"></span>${extra || ''}</summary>`;
  det.addEventListener('toggle', () => { if (!lib.q) { lib.open[id] = det.open; store.set('libOpen2', lib.open); } });
  host.appendChild(det); return det;
}
// 左栏（2026-10-02 界面外观第 1 步，按用户的浏览器草稿）：上下分组、可折叠——待我验收 / 制作中 / 已通过 / 花型模板 / 工具（4.3 去掉「历史」：只放当前版本）；
// 56 px 缩略图、选中整圈青绿框；新建配方在最下面。lib.seg 仍可用（自动化脚本用 lib.seg='passed';renderLib() 打开某一组）。
const LIB_OPEN_DEFAULT = { review: true, wip: true, passed: true, myfx: true, mine: true, types: false, tools: false };
function renderLib() {
  const host = $('#libBody'); host.innerHTML = '';
  lib.open = { ...LIB_OPEN_DEFAULT, ...(lib.open || {}) };
  const effs = typeof FW_EFFECTS !== 'undefined' ? FW_EFFECTS : [];
  // 一个效果可以同时在两处：有「已通过版」就一直在「已通过」里（出了新候选也不会从已通过里消失——用户 2026-10-01 指出 JM4 出 4.0 候选后找不到了）；
  // 有「待验收版」就同时在「待我验收」里。
  const inSeg = (ef, k) => k === 'review' ? ef.阶段 === '待验收' && !!ef.待验收版
    : k === 'passed' ? (ef.阶段 === '已通过' || !!ef.已通过版)
    : !(ef.阶段 === '待验收' && ef.待验收版) && !(ef.阶段 === '已通过' || ef.已通过版);
  if (lib.seg) { lib.open[lib.seg] = true; lib.seg = ''; }      // 指定的那一组展开（旧的「分栏」入口）
  const thumbOf = ef => {
    const me = effMainEntry(ef), fm = (ef.主条目 || '').startsWith('rep:') ? REPLICA_BY_ID[ef.主条目.slice(4)] : null;
    return ef.thumb ? `<span class="th"><i style="background-image:url(${ef.thumb})"></i></span>` : fm ? thumbHTML({ ...fm, key: 'rep:' + fm.id }) : me ? thumbHTML(me) : '<span class="th"></span>';
  };
  const effRow = (g, ef, k) => {
    const rd = k === 'review' ? effReady(ef) : null;
    const badge = effBadge(ef) + (rd ? readyBadge(ef) : stdBadge(ef.待验收版 || ef.主条目));
    const sub = ef.阶段 === '未开始' ? (ef.说明 || '未开始') : rd && !rd.ok ? `${effSubline(ef)}<br><em class="nr">未就绪：${rd.why[0]}${rd.why.length > 1 ? ` 等 ${rd.why.length} 项` : ''}</em>` : effSubline(ef);
    const it = libItem(g, 'ef:' + ef.key, thumbOf(ef) + `<span class="tx"><b>${ef.名}</b><small>${sub}</small><span class="bds">${badge}</span></span>`, () => openEffect(ef));
    if (ef.阶段 === '未开始') it.classList.add('dimmed');
    tierRow(g, ef, k);
  };
  // 分档（小 / 中 / 大……）：每一档在左栏都有自己的缩略图，点哪档开哪档（用户 2026-10-02 19:25「只能看到一个，而不是三个」）。
  // 「已通过」组里只列通过的那套分档（rep:），「待我验收 / 制作中」列候选那套。
  const tierRow = (g, ef, k) => {
    const vs = (ef.方案 || []).filter(v => (k === 'passed') === v.id.startsWith('rep:')).map(v => [v, entryById(v.id.replace(/@.*$/, ''))]).filter(([, x]) => x);
    if (vs.length < 2) return;
    const row = document.createElement('div'); row.className = 'tiers';
    for (const [v, x] of vs) {
      const id = v.id.replace(/^rep:/, ''), on = lib.effect === ef && ((lib.review && lib.review.id === id) || (!lib.review && lib.formal && lib.formal.id === id));
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tier' + (on ? ' cur' : ''); b.title = `${ef.名} · ${v.label}（${id}）`;
      b.innerHTML = (x.formal ? thumbHTML({ ...x.formal, key: v.id }) : thumbHTML(x)) + `<span class="tl">${v.label}</span><small>${id}</small>`;
      b.addEventListener('click', ev => { ev.stopPropagation(); if (x.formal) openFormal(x.formal, ef); else openReview(x, ef); });
      row.appendChild(b);
    }
    g.appendChild(row);
  };
  const EMPTY = { review: '现在没有等你验收的效果。这里的每一项，程序都会核对证据（最新导出 = 当前版本、回放检查过、标准检查过），缺什么就标「未就绪」并写出原因。', wip: '没有制作中的效果', passed: '还没有通过的效果' };
  for (const [k, t] of [['review', '待我验收'], ['wip', '制作中'], ['passed', '已通过']]) {
    const list = effs.filter(ef => inSeg(ef, k) && libMatch(ef.名, ef.key, ef.主条目 || '', ef.说明 || '', ef.待验收版 || '', ef.已通过版 || ''));
    list.sort((x, y) => (x.阶段 === '未开始') - (y.阶段 === '未开始'));
    if (lib.q && !list.length) continue;
    const g = libGroup(host, k, t, list.length, k === 'review' && effNewCount() > 0);
    if (!list.length) g.insertAdjacentHTML('beforeend', `<p class="lsub">${EMPTY[k]}</p>`);
    for (const ef of list) effRow(g, ef, k);
  }
  // 我的效果（4.2.7，「＋ 新建效果」搭的）
  myLibGroup(host);
  // 我的版本（用户在资产栏保存的，存在这台电脑的浏览器里）
  const mine = []; for (const [k, list] of Object.entries(store.get('mySaves', {}))) for (const sv of list || []) if (!sv.auto) mine.push([k, sv]);     // 导出时自动存的只在资产栏「版本」里
  const mineF = mine.filter(([k, sv]) => libMatch(sv.name, k, sv.base || ''));
  if (mineF.length) {
    const g = libGroup(host, 'mine', '我的版本', mineF.length);
    for (const [k, sv] of mineF) {
      const ef = k.startsWith('ef:') ? effs.find(x => 'ef:' + x.key === k) : null, me = ef && effMainEntry(ef);
      const th = ef && ef.thumb ? `<span class="th"><i style="background-image:url(${ef.thumb})"></i></span>` : me ? thumbHTML(me) : k.startsWith('type:') ? `<span class="th" style="${typeThumbStyle(k.slice(5))}"></span>` : '<span class="th"></span>';
      libItem(g, 'mine:' + k + ':' + sv.id, th + `<span class="tx"><b>${ef ? ef.名 : k.replace(/^\w+:/, '')} · ${sv.name}</b><small>基于 ${sv.base || '—'} · ${sv.at || ''}</small><span class="bds"><span class="badge">我的</span></span></span>`, () => openMine(k, sv.id));
    }
  }
  // 花型模板（从头调 / 新建配方的起点）
  const types = []; for (const [gname, ts] of TYPE_GROUPS) for (const t of ts) { const m = TYPE_META[t] || ['', '']; if (libMatch(TYPE_NAMES[t], TYPE_EN[t], m[0], m[1], gname)) types.push([gname, t, m]); }
  if (types.length || !lib.q) {
    const g4 = libGroup(host, 'types', '花型模板', types.length);
    let last = '', grid = null;
    for (const [gname, t, m] of types) {
      if (gname !== last) { g4.insertAdjacentHTML('beforeend', `<p class="lsub">${gname}</p>`); grid = document.createElement('div'); grid.className = 'tiles'; g4.appendChild(grid); last = gname; }
      const k = 'type:' + t, d = document.createElement('button'); d.type = 'button'; d.className = 'tile' + (k === lib.key ? ' cur' : ''); d.dataset.key = k; d.title = `${TYPE_NAMES[t]}：${m[0]}`;
      d.innerHTML = `<span class="im" style="${typeThumbStyle(t)}"></span><span class="nm">${TYPE_NAMES[t]}</span>`;
      d.addEventListener('click', () => openType(t)); grid.appendChild(d);
    }
  }
  // 工具：云端配方预览、打开结果文件夹（4.3 去掉组合编辑器、4.0 对照橱窗：清理清单 C2 / C3）
  const tools = [
    ['tool:cloud', $('#cloudRecipesOpen').textContent, '云端配好的多层配方，本机烘焙后看', () => $('#cloudRecipesOpen').click()],
    ['tool:dir', '打开结果文件夹…', '临时看某个导出结果（贴图按引擎方式播放）', () => $('#assetOpen2').click()],
  ].filter(([, a, b]) => libMatch(a, b, '工具'));
  if (tools.length) { const gt = libGroup(host, 'tools', '工具', tools.length); for (const [k, a, b, fn] of tools) libItem(gt, k, `<span class="tx"><b>${a}</b><small>${b}</small></span>`, fn, true); }
}
function libReveal() {
  lib.open.types = true; store.set('libOpen2', lib.open); setPanels({ side: true }); renderLib();
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
  const nextEf = ef || effectOfEntry(e); if (!ef) beforeOpen(nextEf);   // openEffect 已经做过
  rememberLayerEdit(); wb.entry = undefined;     // 重新打开 = 回到 AI 版（资产栏）
  lib.effect = ef || effectOfEntry(e); lib.formal = null;
  lib.key = ef ? 'ef:' + ef.key : 'rv:' + e.id; store.set('lastKey', lib.key);
  const where = (lib.effect ? lib.effect.阶段 + ' · ' + lib.effect.名 : '条目') + (e.superseded ? ' · 历史' : '');
  setQueuedView(e.kind === 'queued');
  if (e.kind === 'queued') { setReview(e); renderLib(); crumb(where, e.name); return; }
  if (e.kind === 'combo') { setReview(e); renderLib(); crumb(where, e.name + ' · 整体'); return openComboEntry(e); }
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
  state.comboSel = -1; state.layerView = { solo: -1, mute: [] };
  await setTab('combo', { lazy: true }); await applyCombo(e.combo); lib.sig = curSig(); setReview(e); syncComboPanels();   // lazy：只烘这个组合用到的层，不先烘整套默认母版
}
function openFormal(r, ef) {
  if (!ef) beforeOpen(effectOfEntry({ id: r.id }));
  wb.entry = undefined; lib.effect = ef || effectOfEntry({ id: r.id }); lib.formal = r;
  setQueuedView(false); lib.key = ef ? 'ef:' + ef.key : 'rep:' + r.id; setReplica(r.id); setTab('master'); lib.sig = curSig(); setReview(null, r); renderLib(); crumb(lib.effect ? lib.effect.阶段 + ' · ' + lib.effect.名 : '正式库', r.name);
}
function openType(t) { beforeOpen(null); wb.entry = undefined; lib.effect = null; lib.formal = null; setQueuedView(false); lib.key = 'type:' + t; setType(t); setTab('master'); setReview(null); renderLib(); crumb('花型', TYPE_NAMES[t]); }

// 排队中的条目：还没有结果，只放实拍（要对的目标），右栏只留审阅卡
function setQueuedView(on) {
  document.querySelector('.canvas-wrap').classList.toggle('refonly', on); $('#right').classList.toggle('qmode', on); syncPtabs();
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
    if (formal && ef) { const x = effParts(ef, { id: formal.id }); box.hidden = false; box.innerHTML = `<div class="rstrip"><span class="badge ok">正式库</span><b>${formal.id}</b><span class="sp"></span><button class="btn mini" type="button" data-pane="review">审阅 →</button></div><div class="rcard rfull"><div class="rh">${x.head}</div>${x.pills}<p class="rnote">正式库条目：${formal.name}</p></div><details class="rcard rfold rfull"><summary>版本与历史 · 准备情况</summary>${x.more}</details>`; box.querySelectorAll('[data-pane]').forEach(b => b.addEventListener('click', () => { lib.pane = 'review'; syncPtabs(); })); bindEffHeader(box, ef); }
    else { box.hidden = true; box.innerHTML = ''; }
    $('#rvDot').hidden = true; if (lib.pane === 'review' && box.hidden) lib.pane = 'params'; syncPtabs();
    buildLayerCard(); wbRefresh();
    return;
  }
  const r = rvOf(e), cand = ef && ef.阶段 === '待验收' && ef.待验收版 === e.id, x = effParts(ef, e), q = e.kind === 'queued';
  const kindTxt = e.superseded ? '历史版本' : cand ? '待你验收的候选' : e.layerOf ? '其中一层' : '当前工作版（AI 在做）';
  const moreBits = [
    e.look && e.look.length ? `<div class="rt">看什么</div><ul>${e.look.map(x => `<li>${x}</li>`).join('')}</ul>` : '',
    e.opinion ? `<div class="rt">${q ? '这一版改了什么' : 'AI 的看法'}</div><p class="op">${e.opinion}</p>` : '',
    ...(e.doc || []).map(([t, items]) => `<div class="rt">${t}</div><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`),
    e.images && e.images.length ? `<div class="rt">${e.imagesTitle || (e.principle ? '实拍关键帧' : '说明图')}（点图放大）</div><div class="rimgs">${e.images.map(([src, cap]) => `<figure><a href="${src}" target="_blank" rel="noopener"><img src="${src}" loading="lazy" alt="${cap}"></a><figcaption>${cap}</figcaption></figure>`).join('')}</div>` : ''].join('');
  const sr = stdOf(e.id);
  const strip = q ? '' : `<div class="rstrip"><span class="badge${cand ? ' new' : ''}">${cand ? '待你验收' : e.superseded ? '历史' : e.layerOf ? '其中一层' : '工作版'}</span><b title="${e.name.replace(/"/g, '')}">${e.id}</b>${sr ? `<span class="badge ${sr.pass ? 'ok' : 'std'}">标准 ${sr.pass ? '✓' : '✗'}</span>` : ''}<span class="sp"></span>
      <button class="btn mini okb" type="button" aria-pressed="${r.st === 'ok'}" title="通过（整体达到预期）">✓ 通过</button><button class="btn mini fixb" type="button" aria-pressed="${r.st === 'fix'}">✗ 要改</button><button class="btn mini" type="button" data-pane="review" title="本次变化、检查、意见、版本与历史">审阅</button><p class="gate" hidden></p></div>`;
  box.hidden = false;
  box.innerHTML = strip + `<div class="rcard rfull">
      ${x.head ? `<div class="rh">${x.head}</div>` : ''}${x.pills}
      <div class="rh2"><span class="badge">${kindTxt} · ${e.task}</span><b>${e.name}</b><small>${e.date || ''} · 版本 ${e.ver || '—'}</small></div>
      <p class="rnote">${e.note || ''}</p>
      ${e.layerOf ? `<p class="qnote">这是「${e.layerOf}」的其中一层。<button class="btn mini" type="button" data-whole="${e.layerOf}">回到整体效果</button></p>` : ''}
      ${moreBits ? `<details class="rmore"${q ? ' open' : ''}><summary>看什么 · AI 的看法${e.images && e.images.length ? ' · 图' : ''}</summary>${moreBits}</details>` : ''}
      ${q ? '<p class="qnote">还没跑。在你电脑上双击 <b>analysis/local/跑任务_并行.bat</b>（3 个进程同时跑），跑完会自动推上来；pull 后刷新烘焙器，这一条就能看了。</p>' : ''}
    </div>
    <div class="rcard rfull"${q ? ' hidden' : ''}>
      <div class="rc-t">检查与验收</div>
      ${checkRowsHTML(e, ef)}
      ${stdCard(e.id)}
      <div class="ra"><button class="btn okb" type="button" aria-pressed="${r.st === 'ok'}">✓ 通过（整体达到预期）</button><button class="btn fixb" type="button" aria-pressed="${r.st === 'fix'}">✗ 要改</button></div>
      <p class="gate" hidden></p>
      <textarea id="rvTxt" placeholder="意见：哪里不像、要改什么（写完会自动保存）。画面右上角「记录当前帧」可以把时间、视图、距离、图层写进来">${(r.txt || '').replace(/</g, '&lt;')}</textarea>
      <div class="saved" id="rvSaved">${r.at ? '已保存 ' + r.at + ' · 左栏下面「复制我的意见」贴给 Claude' : '意见按这一版记在这台电脑的浏览器里；写完点左栏下面「复制我的意见」贴给 Claude'}</div>
    </div>
    ${x.more ? `<details class="rcard rfold rfull"><summary>版本与历史 · 准备情况 · 交付说明</summary>${x.more}</details>` : ''}`;
  bindEffHeader(box, ef);
  box.querySelectorAll('[data-pane]').forEach(b => b.addEventListener('click', () => { lib.pane = 'review'; syncPtabs(); $('#right').scrollTop = 0; }));
  $('#rvDot').hidden = !(cand && !r.st);
  const setSt = st => { const cur = rvOf(e).st; rvSet(rvKey(e), { st: cur === st ? '' : st }); setReview(e); renderLib(); };
  box.querySelectorAll('[data-whole]').forEach(b => b.addEventListener('click', () => { const ce = FW_REVIEW_LIST.find(x => x.id === b.dataset.whole && x.kind === 'combo'); if (ce) openReview(ce); }));
  box.querySelectorAll('.okb').forEach(b => b.addEventListener('click', () => setSt('ok')));
  box.querySelectorAll('.fixb').forEach(b => b.addEventListener('click', () => setSt('fix')));
  let tm = 0; box.querySelector('#rvTxt').addEventListener('input', ev => { clearTimeout(tm); tm = setTimeout(() => { rvSet(rvKey(e), { txt: ev.target.value }); $('#rvSaved').textContent = '已保存 · 左栏下面「复制我的意见」贴给 Claude'; renderLib(); }, 500); });
  refRestoreOffset(e); syncPtabs();
  buildLayerCard(); wbRefresh();
}

// ---------------- 实拍并排 ----------------
//   条目带实拍视频时，顶栏出现「实拍对照」开关（V；R 是重播）；开：左实拍右模拟，关：模拟画布占满。开关状态全局记住。
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
  flash(ref2.on ? '实拍对照：开' : '实拍对照：关（按 V 再打开）');
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
// 4.2.3 窄屏（用户 2026-10-03 00:25「更小的笔记本屏幕打开会特别特别挤」）：窗口窄时左栏 / 右栏改成浮在画面上的抽屉，
// 默认收起、按 L / P 或工具条按钮拉出；抽屉开关不记进「宽屏时开不开」。
const mediaQ = q => typeof matchMedia === 'function' ? matchMedia(q) : { matches: false, addEventListener() { } };
const DRAWER = { side: mediaQ('(max-width:1180px)'), right: mediaQ('(max-width:820px)') };
function setPanels(o) {
  Object.assign(panels, o);
  const m = $('#main'); m.classList.toggle('noside', !panels.side); m.classList.toggle('noright', !panels.right);
  m.classList.toggle('drawer-side', DRAWER.side.matches); m.classList.toggle('drawer-right', DRAWER.right.matches);
  if (!DRAWER.side.matches) store.set('sideOn', panels.side);
  if (!DRAWER.right.matches) store.set('rightOn', panels.right);
  $('#btnSide').setAttribute('aria-pressed', String(panels.side)); $('#btnRight').setAttribute('aria-pressed', String(panels.right));
  $('#btnFocus').setAttribute('aria-pressed', String(!panels.side && !panels.right));
}
function toggleFocus() {
  if (!panels.side && !panels.right) setPanels(panels.before || { side: true, right: true });
  else { panels.before = { side: panels.side, right: panels.right }; setPanels({ side: false, right: false }); flash('专注：F 或双击画布恢复'); }
}
function initPanels() {
  const root = document.documentElement;
  root.style.setProperty('--sideW', store.get('sideW', 232) + 'px'); root.style.setProperty('--rightW', store.get('rightW', 340) + 'px');
  const drag = (el, fn) => el.addEventListener('pointerdown', e0 => {
    e0.preventDefault(); el.setPointerCapture(e0.pointerId); el.classList.add('drag'); document.body.classList.add('dragging');
    const mv = e => fn(e.clientX), up = () => { el.classList.remove('drag'); document.body.classList.remove('dragging'); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  });
  drag($('#gutL'), x => { const lim = window.innerWidth - (panels.right ? $('#right').offsetWidth : 0) - 420, w = Math.round(Math.max(200, Math.min(460, lim, x))); root.style.setProperty('--sideW', w + 'px'); store.set('sideW', w); });
  drag($('#gutR'), x => { const lim = window.innerWidth - (panels.side ? $('#side').offsetWidth : 0) - 420, w = Math.round(Math.max(300, Math.min(700, lim, window.innerWidth - x))); root.style.setProperty('--rightW', w + 'px'); store.set('rightW', w); });
  $('#gutL').addEventListener('dblclick', () => { root.style.setProperty('--sideW', '232px'); store.set('sideW', 232); });
  $('#gutR').addEventListener('dblclick', () => { root.style.setProperty('--rightW', '340px'); store.set('rightW', 340); });
  $('#btnSide').addEventListener('click', () => setPanels({ side: !panels.side }));
  $('#sideClose').addEventListener('click', () => setPanels({ side: false }));
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
    else if (k === 'v') { e.preventDefault(); refToggle(); }   // 实拍对照：R 让给「重播」（用户 2026-10-02 16:22），改成 V
    else if (k === 'l') { e.preventDefault(); setPanels({ side: !panels.side }); }
    else if (k === 'p') { e.preventDefault(); setPanels({ right: !panels.right }); }
    else if (k === 'escape' && ((DRAWER.side.matches && panels.side) || (DRAWER.right.matches && panels.right))) setPanels({ side: DRAWER.side.matches ? false : panels.side, right: DRAWER.right.matches ? false : panels.right });
    else if (k === 'escape' && !panels.side && !panels.right && $('#updDlg').hidden && $('#picker').hidden) toggleFocus();
    else if ((k === 'arrowdown' || k === 'arrowup') && /^(ef|rv|rep):/.test(lib.key)) {   // ↑ ↓ 在左栏条目之间切换
      const items = [...document.querySelectorAll('#libBody .li')].filter(x => /^(ef|rv|rep):/.test(x.dataset.key) && x.offsetParent), i = items.findIndex(x => x.dataset.key === lib.key), j = i + (k === 'arrowdown' ? 1 : -1);
      if (items[j]) { e.preventDefault(); items[j].click(); items[j].scrollIntoView({ block: 'nearest' }); }
    }
  });
  // 进入抽屉模式先收起；回到宽屏恢复上次的开关
  const dr = k => () => setPanels({ [k]: DRAWER[k].matches ? false : store.get(k === 'side' ? 'sideOn' : 'rightOn', true) });
  DRAWER.side.addEventListener('change', dr('side')); DRAWER.right.addEventListener('change', dr('right'));
  if (DRAWER.side.matches) panels.side = false;
  if (DRAWER.right.matches) panels.right = false;
  // 抽屉开着时：在左栏点开一个条目、或点画面，就收起左栏（右栏抽屉只在点画面时收）
  $('#libBody').addEventListener('click', e => { if (DRAWER.side.matches && panels.side && e.target.closest('.li')) setTimeout(() => setPanels({ side: false }), 0); });
  document.querySelector('.stage').addEventListener('pointerdown', e => {
    if (e.target.closest('#viewbar')) return;
    const o = {}; if (DRAWER.side.matches && panels.side) o.side = false; if (DRAWER.right.matches && panels.right) o.right = false;
    if (Object.keys(o).length) setPanels(o);
  });
  setPanels({});
}
function initLibrary() {
  $('#libSearch').addEventListener('input', e => { lib.q = e.target.value; renderLib(); });
  $('#libSearch').addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; lib.q = ''; renderLib(); e.target.blur(); } });
  // 右栏三页：参数（观察图层 + 完整参数，默认）/ 审阅（本次变化、检查与验收、版本与历史）/ 工具（A/B、版本回滚…，单层才有）
  for (const b of $('#ptabs').children) b.addEventListener('click', () => {
    const k = b.dataset.tab;
    if (k === 'review') { lib.pane = 'review'; syncPtabs(); return; }
    lib.pane = 'params';
    if (k === 'iter') setTab('iter'); else if (state.tab === 'iter') setTab('master'); else syncPtabs();
  });
  $('#refVid').addEventListener('loadedmetadata', layoutRef);
  $('#rvCopy').addEventListener('click', rvCopy);
  initWorkbench();
  $('#newRecipe').addEventListener('click', () => myNew());       // 4.2.7 新建效果：先选第一层，再加层（以前是「新建配方」= 打开一个花型模板）
  const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--topH', $('#main').offsetTop + 'px')); ro.observe($('#viewbar')); ro.observe(document.querySelector('header.top'));
  initPanels();
  myMigrateComboSaves();
  // 打开时：有「新」的待验收候选就先打开它；否则回到上次看的
  const fresh = EFFS().find(effIsNew), lastKey = store.get('lastKey', '');
  const lastEf = EFFS().find(ef => 'ef:' + ef.key === lastKey), lastRv = FW_REVIEW_LIST.find(e => 'rv:' + e.id === lastKey);
  if (fresh) { lib.seg = 'review'; }
  renderLib();
  if (/[?&]fast/.test(location.search)) return;     // 本地任务的自动化（compare.py）不自动打开条目
  if (fresh) openEffect(fresh); else if (lastEf) openEffect(lastEf); else if (lastRv) openReview(lastRv); else crumb('花型', TYPE_NAMES[state.P.type]);
}
