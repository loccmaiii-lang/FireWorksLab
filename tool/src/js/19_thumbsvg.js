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
  return { style, R: Math.max(1e-3, R), color: thColorOf(M, style), stages: ((M && M.stages) || []).map(s => thHex(s[1])), fam };
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
