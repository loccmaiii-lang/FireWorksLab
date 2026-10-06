// =====================================================================
//  4.5.5 示意缩略图（对话框新花型；用户 2026-10-05 20:43「现在的缩略图就很好了，不用出新的缩略图……根据当前这套缩略图的风格
//  替我把之前所有的缩略图都替换掉，这样查找更方便」——取代 2026-10-02 14:46「缩略图一律用渲染的」）
//  · 每层一个发光圆圈：半径 = 这一层熄灭时的半径 ÷ 整朵最大的一层，颜色 = 这一层最后一段颜色（多层花型模板那套同心圆）
//  · 花型用小记号区分（菊内侧短线 = 尾、锦冠 / 柳下垂、点灭虚线、辉星闪点、爆裂小炸点、千轮小圆、环 = 斜椭圆……），按参数判断，不按效果名
//  · 不渲染、不存图：按参数现画 SVG，缓存在内存里。花型模板、多层模板、左栏效果 / 分档 / 我的效果 / 我的模板、新建效果、资产栏、图层管理都用它
// =====================================================================
const TH_C = { x: 50, y: 48, r: 28 };
const thHex = c => /^#[0-9a-f]{6}$/i.test(String(c || '')) ? String(c).toLowerCase() : '#ffd29a';
const thWhiteish = c => { const v = thHex(c), r = parseInt(v.slice(1, 3), 16), g = parseInt(v.slice(3, 5), 16), b = parseInt(v.slice(5, 7), 16); return Math.min(r, g, b) > 205; };
// 一层的记号：按参数（不是按效果名）——形状 / 型物优先，其次效果星，最后有尾 / 无尾
function thStyleOf(P) {
  const t = P.type, fam = familyOf(t);
  if (t === 'blank') return 'blank';
  if (fam === 'rise') return 'rise';
  if (fam === 'ground') return ['fountain', 'falls', 'wheel', 'fan', 'barrage', 'shikake'].includes(t) ? t : 'fountain';
  if (P.pattern === 'cluster') return 'clusters';     // 4.9.15 分簇：一束一束
  if (P.pattern === 'ring') return 'ellipse';
  if (P.pattern === 'saturn') return 'saturn';
  if (['heart', 'smile', 'star5', 'text'].includes(P.pattern)) return 'heart';
  if (P.pattern === 'half') return 'half';
  if (t === 'senrin') return 'cluster';
  if (t === 'crossette') return 'cross';
  if (t === 'hachi') return 'swirl';
  if (t === 'palm') return 'arms';
  if (t === 'yanagi') return 'willow';
  if (t === 'kamuro' || (+P.emberFrac > 0.25 && +P.sparkRate > 0)) return 'droop';
  if (+P.strobeHz > 0) return 'dash';
  if (+P.crackle > 0) return 'burst';
  if (+P.glitter > 0) return 'spark';
  if (+P.branch > 0) return 'branch';
  if (+P.flutter > 0) return 'fall';
  if (+P.ignDelay > 0.3) return 'fade';
  if (+P.sparkRate > 0 && !(+P.sparkStop > 0 && +P.sparkStop < 0.4 * (+P.burn || 1))) return 'rays';
  return 'ring';
}
// 颜色：最后一段；炭火 / 白色星头（颜色在渐变图里）就用渐变图的中亮色
function thColorOf(M, style) {
  const st = (M && M.stages) || [[0, '#ffffff']], c = st[st.length - 1][1];
  return thWhiteish(c) && M && M.ramp2 && !thWhiteish(M.ramp2) && style !== 'dash' ? thHex(M.ramp2) : thHex(c);
}
// 一层 → { style, R（米）, color, stages }
function thLayerOf(P, M, scale = 1) {
  const style = thStyleOf(P), fam = familyOf(P.type);
  const R = fam === 'aerial' && +P.v0 > 0 && +P.vt > 0 ? reachOf(+P.v0, +P.vt, +(P.type === 'senrin' || P.type === 'crossette' ? (P.subDelay || P.burn) : P.burn) || 1) * (scale || 1) : 1;
  // 4.9.15 分簇：各簇方向投影到画面（长度 = 投影长度，对着镜头的簇缩进中心）
  const dirs = style === 'clusters' && typeof clusterCenters === 'function' ? (() => { const t = (+P.tilt || 0) * Math.PI / 180; return clusterCenters({ ...P, clusterLayout: P.clusterLayout === 'sphere' ? 'ring' : P.clusterLayout }, null, null).map(([x, y, z]) => [x, y * Math.cos(t) - z * Math.sin(t)]); })() : null;
  return { style, R: Math.max(1e-3, R), color: thColorOf(M, style), stages: ((M && M.stages) || []).map(s => thHex(s[1])), fam, dirs, cone: +P.clusterCone || 0 };
}
// ---------------- 画 ----------------
const thPt = (r, a) => [TH_C.x + r * Math.cos(a), TH_C.y + r * Math.sin(a)];
const thF = n => +n.toFixed(2);
function thDraw(L, r) {
  const c = L.color, x = TH_C.x, y = TH_C.y, o = [], ring = (w = 1.7, extra = '') => `<circle cx="${x}" cy="${y}" r="${thF(r)}" fill="none" stroke="${c}" stroke-width="${w}" ${extra}/>`;
  const N = (n, f) => { for (let i = 0; i < n; i++) o.push(f(i, i / n * 2 * Math.PI - Math.PI / 2)); };
  switch (L.style) {
    case 'rays': o.push(ring()); N(Math.round(14 + r * 0.25), (i, a) => { const [x1, y1] = thPt(r * 0.7, a), [x2, y2] = thPt(r * 0.96, a); return `<line x1="${thF(x1)}" y1="${thF(y1)}" x2="${thF(x2)}" y2="${thF(y2)}" stroke="${c}" stroke-width="0.8" opacity=".75"/>`; }); break;
    case 'dash': o.push(ring(1.8, `stroke-dasharray="${thF(r * 0.16)} ${thF(r * 0.16)}"`)); break;
    case 'arcs': { const n = Math.max(1, L.stages.length), C = 2 * Math.PI * r; L.stages.forEach((s, i) => o.push(`<circle cx="${x}" cy="${y}" r="${thF(r)}" fill="none" stroke="${s}" stroke-width="1.9" stroke-dasharray="${thF(C / n)} ${thF(C)}" stroke-dashoffset="${thF(-C * i / n)}" transform="rotate(-90 ${x} ${y})"/>`)); break; }
    case 'spark': o.push(ring(1.1, 'opacity=".8"')); N(8, (i, a) => { const [px, py] = thPt(r, a + 0.2), s = 2.2; return `<path d="M${thF(px - s)} ${thF(py)}H${thF(px + s)}M${thF(px)} ${thF(py - s)}V${thF(py + s)}" stroke="#fff6e0" stroke-width="0.7"/>`; }); break;
    case 'burst': o.push(ring(1.8, `stroke-dasharray="0.1 ${thF(r * 0.2)}" stroke-linecap="round"`)); N(6, (i, a) => { const [px, py] = thPt(r * 0.86, a + 0.3); let d = ''; for (let k = 0; k < 6; k++) { const b = k * Math.PI / 3; d += `M${thF(px)} ${thF(py)}l${thF(2.4 * Math.cos(b))} ${thF(2.4 * Math.sin(b))}`; } return `<path d="${d}" stroke="#fff1cf" stroke-width="0.6"/>`; }); break;
    case 'branch': N(10, (i, a) => { const [x1, y1] = thPt(r * 0.3, a), [x2, y2] = thPt(r * 0.68, a), [x3, y3] = thPt(r, a - 0.16), [x4, y4] = thPt(r, a + 0.16); return `<path d="M${thF(x1)} ${thF(y1)}L${thF(x2)} ${thF(y2)}L${thF(x3)} ${thF(y3)}M${thF(x2)} ${thF(y2)}L${thF(x4)} ${thF(y4)}" fill="none" stroke="${c}" stroke-width="0.9"/>`; }); break;
    case 'cross': o.push(ring(0.9, 'opacity=".6"')); N(8, (i, a) => { const [px, py] = thPt(r, a), s = 2.6; return `<path d="M${thF(px - s)} ${thF(py - s)}L${thF(px + s)} ${thF(py + s)}M${thF(px - s)} ${thF(py + s)}L${thF(px + s)} ${thF(py - s)}" stroke="${c}" stroke-width="1"/>`; }); break;
    case 'cluster': N(8, (i, a) => { const [px, py] = thPt(r * 0.82, a); return `<circle cx="${thF(px)}" cy="${thF(py)}" r="${thF(r * 0.2)}" fill="none" stroke="${L.stages[i % Math.max(1, L.stages.length)] || c}" stroke-width="1.1"/>`; }); break;
    case 'swirl': N(6, (i, a) => { const [x1, y1] = thPt(r * 0.25, a), [x2, y2] = thPt(r * 0.95, a + 0.9), [cx2, cy2] = thPt(r * 0.9, a - 0.5); return `<path d="M${thF(x1)} ${thF(y1)}Q${thF(cx2)} ${thF(cy2)} ${thF(x2)} ${thF(y2)}" fill="none" stroke="${c}" stroke-width="1"/>`; }); break;
    case 'arms': N(7, (i, a) => { const [x2, y2] = thPt(r, a); return `<line x1="${x}" y1="${y}" x2="${thF(x2)}" y2="${thF(y2)}" stroke="${c}" stroke-width="1.9" stroke-linecap="round" opacity=".9"/><circle cx="${thF(x2)}" cy="${thF(y2)}" r="1.8" fill="${c}"/>`; }); break;
    case 'droop': case 'willow': { const W = L.style === 'willow'; o.push(`<path d="M${thF(x - r)} ${y}A${thF(r)} ${thF(r)} 0 0 1 ${thF(x + r)} ${y}" fill="none" stroke="${c}" stroke-width="1.6"/>`);
      N(10, (i, a0) => { const a = -Math.PI + (i + 0.5) / 10 * Math.PI, [px, py] = thPt(r, a), dx = Math.cos(a) * r * 0.22, drop = r * (W ? 1.05 : 0.7) * (0.6 + 0.4 * Math.abs(Math.cos(a))); return `<path d="M${thF(px)} ${thF(py)}Q${thF(px + dx * 1.6)} ${thF(py)} ${thF(px + dx * 1.8)} ${thF(py + drop)}" fill="none" stroke="${c}" stroke-width="0.9" opacity=".8"/>`; }); break; }
    case 'fall': o.push(ring(1.3, `stroke-dasharray="${thF(r * 0.1)} ${thF(r * 0.18)}"`)); N(7, (i, a) => { const px = x - r * 0.75 + i * r * 0.25, py = y + r * 0.55 + (i % 3) * 4; return `<circle cx="${thF(px)}" cy="${thF(py)}" r="1.1" fill="${c}" opacity="${thF(0.35 + 0.1 * (i % 3))}"/>`; }); break;
    case 'fade': N(16, (i, a) => { const [px, py] = thPt(r, a); return `<circle cx="${thF(px)}" cy="${thF(py)}" r="1.4" fill="${c}" opacity="${thF(0.25 + 0.75 * ((i * 7) % 16) / 15)}"/>`; }); break;
    case 'clusters': { const sp = Math.max(0.06, Math.min(0.4, (L.cone || 8) * Math.PI / 180));
      for (const [dx, dy] of (L.dirs || [])) { const len = Math.hypot(dx, dy); if (len < 0.15) continue; const a = Math.atan2(-dy, dx);
        for (const k of [-1, 0, 1]) { const b = a + k * sp * 0.6, [x2, y2] = thPt(r * len * (k ? 0.92 : 1), b), [x1, y1] = thPt(r * len * 0.35, b); o.push(`<line x1="${thF(x1)}" y1="${thF(y1)}" x2="${thF(x2)}" y2="${thF(y2)}" stroke="${c}" stroke-width="${k ? 0.8 : 1.3}" opacity="${k ? 0.7 : 1}"/>`); } }
      break; }
    case 'ellipse': o.push(`<ellipse cx="${x}" cy="${y}" rx="${thF(r)}" ry="${thF(r * 0.42)}" fill="none" stroke="${c}" stroke-width="1.8" transform="rotate(-18 ${x} ${y})"/>`); break;
    case 'saturn': o.push(`<circle cx="${x}" cy="${y}" r="${thF(r * 0.5)}" fill="none" stroke="${L.stages[0] || c}" stroke-width="1.6"/><ellipse cx="${x}" cy="${y}" rx="${thF(r * 1.05)}" ry="${thF(r * 0.3)}" fill="none" stroke="${c}" stroke-width="1.6" transform="rotate(-14 ${x} ${y})"/>`); break;
    case 'heart': { const s = r / 17, pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60 * 2 * Math.PI; pts.push(`${thF(x + 16 * Math.sin(t) ** 3 * s)} ${thF(y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s)}`); } o.push(`<path d="M${pts.join('L')}Z" fill="none" stroke="${c}" stroke-width="1.7"/>`); break; }
    case 'half': o.push(`<path d="M${thF(x - r)} ${y + 10}A${thF(r)} ${thF(r)} 0 0 1 ${thF(x + r)} ${y + 10}" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M${thF(x - r)} ${y + 12}A${thF(r)} ${thF(r * 0.45)} 0 0 0 ${thF(x + r)} ${y + 12}" fill="none" stroke="${c}" stroke-width="1.2" opacity=".3"/><line x1="${thF(x - r - 6)}" y1="${y + 11}" x2="${thF(x + r + 6)}" y2="${y + 11}" stroke="#3a4a66" stroke-width="0.6"/>`); break;
    case 'rise': o.push(`<path d="M50 92Q47 62 50 26" fill="none" stroke="${c}" stroke-width="1.4" opacity=".7"/><circle cx="50" cy="25" r="3" fill="${c}"/>`); N(9, (i) => `<circle cx="${thF(46 + (i * 37) % 9)}" cy="${thF(38 + i * 5.5)}" r="0.7" fill="${c}" opacity=".7"/>`); break;
    case 'fountain': N(9, (i) => { const a = -Math.PI / 2 + (i - 4) * 0.09; return `<path d="M50 86Q${thF(50 + Math.cos(a) * 70)} ${thF(86 + Math.sin(a) * 60)} ${thF(50 + (i - 4) * 5.5)} 70" fill="none" stroke="${c}" stroke-width="0.9" opacity=".85"/>`; }); break;
    case 'falls': o.push(`<line x1="18" y1="26" x2="82" y2="26" stroke="${c}" stroke-width="1.6"/>`); N(9, (i) => `<line x1="${20 + i * 7.5}" y1="27" x2="${20 + i * 7.5}" y2="${thF(62 + (i % 3) * 7)}" stroke="${c}" stroke-width="0.8" opacity=".75"/>`); break;
    case 'wheel': o.push(`<circle cx="${x}" cy="${y}" r="${thF(r * 0.45)}" fill="none" stroke="${c}" stroke-width="1.4"/>`); N(4, (i, a) => { const [px, py] = thPt(r * 0.45, a), [qx, qy] = thPt(r * 1.05, a + 0.9); return `<path d="M${thF(px)} ${thF(py)}Q${thF((px + qx) / 2 + 4 * Math.cos(a))} ${thF((py + qy) / 2 + 4 * Math.sin(a))} ${thF(qx)} ${thF(qy)}" fill="none" stroke="${c}" stroke-width="0.9"/>`; }); break;
    case 'fan': N(7, (i) => { const a = -Math.PI / 2 + (i - 3) * 0.2, x2 = 50 + Math.cos(a) * 58, y2 = 90 + Math.sin(a) * 58; return `<line x1="50" y1="90" x2="${thF(x2)}" y2="${thF(y2)}" stroke="${c}" stroke-width="0.9" opacity=".8"/><circle cx="${thF(x2)}" cy="${thF(y2)}" r="1.6" fill="${c}"/>`; }); break;
    case 'barrage': N(3, (i) => { const px = 32 + i * 18, top = 30 + (i % 2) * 10; return `<line x1="${px}" y1="90" x2="${px}" y2="${top + 6}" stroke="${c}" stroke-width="0.9" stroke-dasharray="2 2"/><circle cx="${px}" cy="${top}" r="5" fill="none" stroke="${c}" stroke-width="1"/>`; }); break;
    case 'shikake': o.push(`<text x="50" y="62" text-anchor="middle" font-size="40" font-family="sans-serif" fill="none" stroke="${c}" stroke-width="1.2">祭</text>`); break;
    case 'blank': o.push(ring(1.2, 'stroke-dasharray="3 3" opacity=".5"'), `<path d="M44 48H56M50 42V54" stroke="#9aa4b8" stroke-width="1.2"/>`); break;
    default: o.push(ring());
  }
  return o.join('');
}
// 一组层 → SVG（发光：模糊的一份垫底 + 清晰的一份；和多层模板那套同心圆一样的底色、粗细）
function thSVG(layers) {
  const air = layers.filter(l => l.fam === 'aerial'), Rmax = Math.max(1e-3, ...air.map(l => l.R));
  // 半径差不多的几层（四色牡丹那种同一层的几组色星）往里错开一点，几种颜色都看得见
  const seen = new Map(), rOf = l => { if (l.fam !== 'aerial') return TH_C.r; const k = Math.max(0.12, l.R / Rmax), q = Math.round(k * 30), j = seen.get(q) || 0; seen.set(q, j + 1); return TH_C.r * k * (1 - 0.08 * j); };
  const body = layers.map(l => thDraw(l, rOf(l))).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>`
    + `<rect width="100" height="100" fill="#05060a"/><g filter="url(#g)" opacity=".85" stroke-width="2.6">${body}</g><g>${body}</g></svg>`;
}
const _thCache = new Map();
function thStyleFor(key, layersFn) {
  if (key && _thCache.has(key)) return _thCache.get(key);
  let s = '';
  // url 用单引号：外面是 style="…"
  try { const L = layersFn(); if (L && L.length) s = `background-image:url('data:image/svg+xml,${encodeURIComponent(thSVG(L))}')`; } catch (e) { console.warn('缩略图', key, e); }
  if (key && s) _thCache.set(key, s);
  return s;
}
// ---------------- 各种来源 → 层 ----------------
function thLayersOfType(t) { const d = defaultsFor(t); const L = thLayerOf(derive({ ...d.P, type: t }), d.M); if (t === 'henka') L.style = 'arcs'; return [L]; }
function thLayersOfRep(id) { const { P, M } = replicaPM(id); return [thLayerOf(P, M)]; }
// 迭代区条目（单层 / 多层组合）；组合层自己的颜色（层上的 stages）优先
function thLayersOfEntry(e) {
  if (e && e.kind === 'combo' && e.combo && e.combo.layers) return e.combo.layers.map(l => { const id = String(l.m || '').replace(/^rep:/, ''); if (!REPLICA_BY_ID[id]) return null;
    const { P, M } = replicaPM(id); return thLayerOf(P, l.stages ? { ...M, stages: l.stages } : M, l.scale || 1); }).filter(Boolean);
  const id = e && (e.layerOf || e.id) && REPLICA_BY_ID[e.id] ? e.id : null;
  if (id) return thLayersOfRep(id);
  if (e && e.base && TYPES[e.base]) return thLayersOfType(e.base);
  return [];
}
// 快照（我的效果 / 版本）：{ kind: 'combo', layers: [{ type, P, M, L }] } 或 { kind: 'single', P, M }
function thLayersOfSnap(sn) {
  if (!sn) return [];
  if (sn.kind === 'single') return sn.P ? [thLayerOf(derive({ ...sn.P }), sn.M)] : [];
  return (sn.layers || []).map(x => { if (!x.P && x.id && REPLICA_BY_ID[x.id]) { const r = replicaPM(x.id); x = { ...x, P: r.P, M: r.M }; } if (!x.P) return null;
    return thLayerOf(x.P, { ...(x.M || {}), ...(x.L && x.L.stages ? { stages: x.L.stages } : {}) }, (x.L && x.L.scale) || 1); }).filter(Boolean);
}
// 现在打开的（资产栏）：多层按每层；单层按当前参数
function thLayersOfState() {
  if (state.tab === 'combo') return state.layers.map(L => { const e = state.lib.find(x => x.name === L.lib); return e ? thLayerOf(e.P, { ...e.M, stages: L.stages || e.M.stages }, L.scale || 1) : null; }).filter(Boolean);
  return [thLayerOf(state.P, state.M)];
}
// 对外：给 style 属性 / 给 <span class="th"> 用
function thTypeStyle(t) { return thStyleFor('type:' + t, () => thLayersOfType(t)); }
function thRepStyle(id) { return thStyleFor('rep:' + id, () => thLayersOfRep(id)); }
function thEntryStyle(e) { return thStyleFor('e:' + (e && e.id) + '@' + (e && e.ver || ''), () => thLayersOfEntry(e)); }
function thSnapStyle(key, sn) { return thStyleFor(key, () => thLayersOfSnap(sn)); }
function thPMStyle(key, P, M) { return thStyleFor(key, () => [thLayerOf(derive({ ...P }), M)]); }

// =====================================================================
//  4.9.6 自己截的缩略图（对话框新花型；用户 2026-10-06 07:18「我挪到x帧，点生成缩略图，旧的被覆盖删除」）
//  · 时间轴挪到哪一刻，点时间轴上的「生成缩略图」= 把这一刻画布上的画面（实时模拟 / 引擎回放，看的是哪个就截哪个）截成现在打开这一项的缩略图：
//    自动框住亮的部分（烟花本身），存 160 px JPEG。再点一次 = 覆盖，旧图直接删掉（不留历史）
//  · ⋯「恢复示意图」= 删掉截图，回到按参数画的示意图（上面那套）
//  · 存在这台电脑的浏览器里（store「userThumbs」，按条目键：type: / mt: / ef: / rv: / rep: / my: / tpl:）。左栏、花型库、新建效果、版本记录都先看有没有截图。
//    不写进仓库、不进素材包；换电脑 / 清浏览器数据就回到示意图
// =====================================================================
const TH_USER_PX = 160, TH_USER_MAX = 400;
let _thUser = null;
const thUserAll = () => _thUser || (_thUser = store.get('userThumbs', {}) || {});
if (typeof window !== 'undefined') window.addEventListener('storage', e => { if (e.key === 'fwb.userThumbs') _thUser = null; });     // 另一个标签页改了
function thUserGet(key) { const u = key && thUserAll()[key]; return u && typeof u.img === 'string' && u.img.startsWith('data:image/') ? u : null; }
function thUser(key) { const u = thUserGet(key); return u ? `background-image:url('${u.img}')` : ''; }
const thUserAt = key => { const u = thUserGet(key); return u ? String(u.at || '') : ''; };
function thUserPut(all) { _thUser = null; const ok = store.set('userThumbs', all); _thUser = null; return ok; }
// 现在打开的这一项在各处用的键：资产栏的键（wbKey）+ 打开的是效果的某个条目 / 正式库时，那个条目自己的键（分档缩略图、新建效果里的 AI 效果用它）
function thUserKeys() {
  if (typeof wbKey !== 'function' || (typeof wbVisible === 'function' && !wbVisible())) return [];
  const k = wbKey(), out = [k];
  if (lib.review && lib.review.id) out.push('rv:' + lib.review.id);
  if (lib.formal && lib.formal.id) out.push('rep:' + lib.formal.id);
  return [...new Set(out)].filter(x => /^(type|mt|ef|rv|rep|my|tpl):./.test(String(x || '')));
}
// 截图：框住亮的部分（亮度 > 48/255 的像素，两头各去掉 0.4% 零星火花），正方形、留 14% 边，最小取画面短边的 30%
function thCrop(src) {
  const W = src.width, H = src.height; if (!W || !H) return null;
  const s0 = Math.min(1, 256 / Math.max(W, H)), w = Math.max(1, Math.round(W * s0)), h = Math.max(1, Math.round(H * s0));
  const a = document.createElement('canvas'); a.width = w; a.height = h; const ax = a.getContext('2d', { willReadFrequently: true }); ax.drawImage(src, 0, 0, w, h);
  const d = ax.getImageData(0, 0, w, h).data, rows = new Float64Array(h), cols = new Float64Array(w); let n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = 4 * (y * w + x); if (Math.max(d[i], d[i + 1], d[i + 2]) > 48) { rows[y]++; cols[x]++; n++; } }
  if (n < 6) return null;     // 黑的
  const cut = arr => { const lim = Math.floor(n * 0.004); let a0 = 0, acc = 0; while (a0 < arr.length - 1 && acc + arr[a0] <= lim) acc += arr[a0++]; let a1 = arr.length - 1; acc = 0; while (a1 > a0 && acc + arr[a1] <= lim) acc += arr[a1--]; return [a0, a1 + 1]; };
  const [x0, x1] = cut(cols), [y0, y1] = cut(rows), mn = Math.min(w, h);
  const side = Math.min(mn, Math.max((Math.max(x1 - x0, y1 - y0)) * 1.14, mn * 0.3));
  const sx = Math.min(Math.max(0, (x0 + x1) / 2 - side / 2), w - side), sy = Math.min(Math.max(0, (y0 + y1) / 2 - side / 2), h - side);
  const o = document.createElement('canvas'); o.width = o.height = TH_USER_PX; const ox = o.getContext('2d');
  ox.fillStyle = '#000'; ox.fillRect(0, 0, TH_USER_PX, TH_USER_PX); ox.imageSmoothingQuality = 'high';
  ox.drawImage(src, sx / s0, sy / s0, side / s0, side / s0, 0, 0, TH_USER_PX, TH_USER_PX);
  return { img: o.toDataURL('image/jpeg', 0.85), lit: +(n / (w * h)).toFixed(4) };
}
// 等主循环画完下一帧再截（WebGL 画布只有刚画完的那一刻读得到）。烘焙中 / 软件渲染一帧可能要好几秒：2.5 秒还没轮到就提示在等；
// 主循环一直停着（定帧渲染中）就 3 分钟后放弃。截的是那一帧的画面：等待期间时间轴停着就还是你挪到的那一帧
function thGrab(wait = 180000) {
  return new Promise((res, rej) => {
    const prev = pendingThumb;
    const slow = setTimeout(() => flash(state.baking ? '正在烘焙，等画面刷新一帧再截…' : '等画面刷新一帧再截…'), 2500);
    const to = setTimeout(() => { clearTimeout(slow); if (pendingThumb === f) pendingThumb = prev; rej(new Error('画面一直没刷新（定帧渲染中？等一下再点）')); }, wait);
    const f = arg => { clearTimeout(to); clearTimeout(slow); if (prev) { try { prev(arg); } catch (e) { } } try { const r = thCrop(canvas); res(r && { ...r, t: +state.t || 0 }); } catch (e) { rej(e); } };     // t = 截到的那一帧的时刻（播放中也对）
    pendingThumb = f;
  });
}
// 删掉已经不存在的「我的效果 / 我的模板」的截图；太多了删最旧的
function thUserPrune(all) {
  const my = typeof myAll === 'function' ? myAll() : null, tp = typeof tplAll === 'function' ? tplAll() : null;
  for (const k of Object.keys(all)) { if ((my && k.startsWith('my:') && !my[k.slice(3)]) || (tp && k.startsWith('tpl:') && !tp[k.slice(4)])) delete all[k]; }
  const ks = Object.keys(all).sort((x, y) => String(all[y].at || '').localeCompare(String(all[x].at || '')));
  for (const k of ks.slice(TH_USER_MAX)) delete all[k];
  return all;
}
function thUserChanged() {
  try { renderLib(); } catch (e) { console.warn(e); }
  const h = $('#abThumb'); if (h) h.dataset.k = '';
  if (typeof wbSync === 'function') wbSync();
  if (typeof syncTypeButton === 'function') try { syncTypeButton(); } catch (e) { }
  if (!$('#picker').hidden && typeof pkRender === 'function') pkRender();
}
async function thCapture() {
  const keys = thUserKeys();
  if (!keys.length) { flash('先在左栏打开一项（花型模板 / 多层模板 / 效果 / 我的效果），再截它的缩略图', true); return false; }
  const btn = $('#thGrab'); if (btn) btn.disabled = true;
  try {
    const r = await thGrab();
    if (!r) { flash('这一刻画面是黑的：把时间轴挪到看得见烟花的那一帧再点', true); return false; }
    const all = { ...thUserAll() }, at = new Date().toISOString(), t = +r.t.toFixed(2), had = keys.some(k => all[k]);
    const when = typeof wbNow === 'function' ? wbNow() : at.slice(0, 16).replace('T', ' ');
    for (const k of keys) all[k] = { img: r.img, at, when, t, view: state.tab === 'combo' ? 'combo:' + state.view : state.view };
    if (!thUserPut(thUserPrune(all))) return false;
    thUserChanged();
    flash(`缩略图换成了 ${t.toFixed(2)} s 这一帧${had ? '（旧的已删掉）' : ''}；⋯ 里能恢复示意图`);
    return true;
  } catch (e) { flash('没截到：' + (e.message || e), true); return false; }
  finally { if (btn) btn.disabled = false; }
}
// 恢复示意图 = 删掉截图；8 秒内能撤销（交互宪章第 8 节：删除要有撤销提示），撤销 = 把刚删的那张放回去
function thRestore() {
  const keys = thUserKeys(), all = { ...thUserAll() }, gone = {};
  for (const k of keys) if (all[k]) { gone[k] = all[k]; delete all[k]; }
  if (!Object.keys(gone).length) { flash('这一项用的就是示意图'); return false; }
  if (!thUserPut(all)) return false;
  thUserChanged();
  if (typeof undoToast === 'function') undoToast('缩略图恢复成示意图（截的那张删了）', () => { if (thUserPut({ ...thUserAll(), ...gone })) thUserChanged(); });
  else flash('缩略图恢复成示意图（按参数画的）');
  return true;
}
// 按钮：时间轴上「生成缩略图」（挪到哪一帧就截哪一帧）；⋯ 菜单「缩略图」一节「恢复示意图」。只在打开了一项（资产栏出现）时显示
function thUserSync(hidden) {
  const g = $('#thGrab'), r = $('#thRestore'), lb = $('#thRestoreLabel');
  const keys = hidden ? [] : thUserKeys(), u = keys.map(thUserGet).find(Boolean);
  if (g) { g.hidden = !keys.length; g.classList.toggle('on', !!u);
    g.title = u ? `把现在这一帧截成这一项的缩略图，覆盖 ${u.when || ''} 截的那张（${u.t} s）；⋯ 里能恢复示意图` : '把现在这一帧截成这一项在左栏 / 花型库里的缩略图（再点 = 覆盖旧的）'; }
  if (r) r.hidden = !u; if (lb) lb.hidden = !u;
}
function thUserInit() {
  if ($('#thGrab')) return;
  const tt = $('#timeTools');
  if (tt) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn tk th-grab'; b.id = 'thGrab'; b.textContent = '生成缩略图'; b.hidden = true;
    b.addEventListener('click', () => thCapture()); tt.before(b); }
  const menu = document.querySelector('#abMore .ab-menu');
  if (menu) {
    const before = [...menu.querySelectorAll('.menu-label')].find(x => x.textContent.trim() === '左栏') || null;
    const lb = document.createElement('span'); lb.className = 'menu-label'; lb.id = 'thRestoreLabel'; lb.textContent = '缩略图'; lb.hidden = true;
    const r = document.createElement('button'); r.type = 'button'; r.id = 'thRestore'; r.textContent = '恢复示意图（删掉生成的缩略图）'; r.hidden = true;
    r.addEventListener('click', () => { const m = $('#abMore'); if (m) m.open = false; thRestore(); });
    menu.insertBefore(lb, before); menu.insertBefore(r, before);
  }
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', thUserInit); else thUserInit(); }
