// =====================================================================
//  工具页（4.3，清理清单 C5）：导入 / 导出 JSON、旧版本 / 配方导出、显卡测速。
//  A/B 分屏、实拍叠加、数值测量对比去掉了（清理清单 C3 / C5）；store、cloneM、resolveRecipe、afterBake 别的文件还在用
// =====================================================================
const cloneM = M => ({ ...M, stages: M.stages.map(s => [...s]) });
// 4.5.8（用户 10-05 21:40 小修 3）：以前写不进去（浏览器存满 / 禁用）什么都不说，界面照样「已保存」；读坏了返回空表，下次保存把整张表覆盖成一条。
//  现在：写不进去返回 false、报错（常驻提示 + 状态行红字）；读坏了先把原文另存一份（fwb.<键>.坏<时间>）再报错，不会被下次保存覆盖掉
const store = {
  failAt: 0,
  get(k, d) {
    let v = null; try { v = localStorage.getItem('fwb.' + k); } catch (e) { return d; }
    if (!v) return d;
    try { return JSON.parse(v); }
    catch (e) {
      const bk = 'fwb.' + k + '.坏' + Date.now().toString(36);
      try { localStorage.setItem(bk, v); localStorage.removeItem('fwb.' + k); } catch (e2) { }
      storeFail(`浏览器里「${k}」读出来是坏的：原文另存为 ${bk}，这次按空的打开`);
      return d;
    }
  },
  set(k, v) {
    try { localStorage.setItem('fwb.' + k, JSON.stringify(v)); return true; }
    catch (e) { storeFail(`浏览器里存不进去（${e && e.name === 'QuotaExceededError' ? '存满了' : e && e.message || e}）：刚才的「${k}」没存上。先用 ⋯「导出配方文件」存一份`); return false; }
  }
};
function storeFail(msg) {
  store.failAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (typeof document === 'undefined') return;
  let b = document.getElementById('storeErr');
  if (!b) { b = document.createElement('div'); b.id = 'storeErr'; b.className = 'store-err'; b.setAttribute('role', 'alert'); b.innerHTML = '<span></span><button type="button" class="btn mini">知道了</button>'; b.querySelector('button').addEventListener('click', () => b.remove()); document.body.appendChild(b); }
  b.querySelector('span').textContent = msg;
  if (typeof flash === 'function') flash(msg, true);
}
// 刚存失败的那一下，别再说「已保存」
const storeJustFailed = () => store.failAt && (typeof performance !== 'undefined' ? performance.now() : Date.now()) - store.failAt < 3000;

// ---------------- 版本、缩略图、批注 ----------------
let pendingThumb = null;
function thumbFromCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 132; const x = c.getContext('2d');
  x.drawImage(canvas, 0, 0, 132, 132); return c.toDataURL('image/jpeg', 0.72);
}
// 4.2.10：工具页的「版本与回滚」去掉了（版本只在资产栏，走查 B8）；state.versions 只留着导出留底（renderLegacy）

// ---------------- 派生配方 ----------------
function resolveRecipe(r, depth = 0) {
  const parent = r.parent && depth < 16 ? state.recipes.find(x => x.name === r.parent) : null;
  const srcVer = r.diff && r.diff.P ? r.diff.P.renderVer : undefined;      // 存的配方按自己的版本：没写或 < 40 是 3.7 时代的，展开后迁移（migrate37）
  const base = parent ? resolveRecipe(parent, depth + 1) : { ...defaultsFor(r.type), P: storedParams({ type: r.type, renderVer: 40 }) };
  const P = migrate37({ ...base.P, ...r.diff.P }, parent ? 40 : srcVer), M = normalizeM({ ...base.M, ...r.diff.M }, r.type);
  return { P, M };
}
// 4.2.10：「存为配方 / 载入 / 派生」去掉了（新做法：资产栏保存 / 另存为、「＋ 新建效果」）；resolveRecipe 留着给导入旧配方库用

// ---------------- 显卡测速 ----------------
const perf = { acc: 0, n: 0, fps: 0 };
function perfTick(dt) { perf.acc += dt; perf.n++; if (perf.acc > 1) { perf.fps = perf.n / perf.acc; perf.acc = 0; perf.n = 0; } }
async function runPerf() {
  const out = $('#perfOut'); out.textContent = '测试中…（约 20 秒，期间画面会卡）';
  // 先实测 1.5 秒的预览帧率
  const fps = await new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); });
  perf.fps = fps;
  const lines = [`显卡：${$('#gpu').title || $('#gpu').textContent}`, `当前预览帧率：${perf.fps.toFixed(0)} fps（${canvas.width}² 画布）`];
  const t = new Target(1024, 1024, gl.RGBA16F), view = [0, 0, 150, 150], ppm = 1024 / 300;
  try {
    for (const target of [30000, 100000, 300000, 1000000, 3000000]) {
      const P = { ...defaultsFor('kiku').P, stars: 300, burn: 2.5, sparkLife: 0.8, duration: 3 };
      P.sparkRate = Math.max(1, Math.round(target / (P.stars * P.sparkLife)));
      const tr = buildTrack(P); t.clear(); t.bind(); additive(true);
      drawSparksGPU(tr, 1.5, view, ppm, [0, 1, 0, 0], 1, 0); gl.finish();
      const t0 = performance.now(); const K = 8;
      for (let i = 0; i < K; i++) drawSparksGPU(tr, 1.2 + i * 0.05, view, ppm, [0, 1, 0, 0], 1, i);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, new Float32Array(4));
      const ms = (performance.now() - t0) / K; additive(false);
      const alive = Math.round(P.stars * P.sparkRate * P.sparkLife);
      lines.push(`同屏约 ${alive.toLocaleString()} 颗火花：${ms.toFixed(2)} ms/帧（≈ ${(1000 / Math.max(ms, 0.01)).toFixed(0)} fps 上限）`);
      disposeTrack(tr); out.innerHTML = lines.join('<br>'); await nextTick();
    }
    const t0 = performance.now(); const b = await bake({ ...state.P }, 1, null); const ms = performance.now() - t0; disposeBake(b);
    lines.push(`当前母版 ${state.P.texW}×${state.P.texH} 完整烘焙：${(ms / 1000).toFixed(2)} s`);
  } catch (e) { lines.push('出错：' + e.message); }
  t.dispose(); out.innerHTML = lines.join('<br>');
}

// 每次烘焙完成
function afterBake(b) { }
function initIter() {
  state.versions = store.get('versions', []); state.recipes = store.get('recipes', []);
  // 4.2.10 版本只留一套（走查 B8）：旧的「版本与回滚」「派生配方」不再用，只留导出留底（数据还在这台电脑的浏览器里，不删）
  $('#legacyExport').addEventListener('click', () => download(new Blob([JSON.stringify({ tool: '烟花母版烘焙器 ' + VERSION, note: '4.2.9 以前工具页的版本与派生配方', versions: state.versions.map(v => ({ ...v, thumb: undefined })), recipes: state.recipes }, null, 2)], { type: 'application/json' }), '旧版本与配方.json'));
  $('#perfRun').addEventListener('click', runPerf);
  $('#toolImport').addEventListener('click', () => $('#fileIn').click());
  $('#toolExport').addEventListener('click', () => wbExportFile());
  $('#toolImportRecipe').addEventListener('click', () => $('#abFile').click());
  renderLegacy();
}
function renderLegacy() {
  const box = $('#legacyVer'); if (!box) return;
  const nv = (state.versions || []).length, nr = (state.recipes || []).length;
  box.hidden = !(nv || nr);
  $('#legacyInfo').textContent = `旧版本 ${nv} 个（以前每次导出自动存的 + 手动存的）· 旧配方 ${nr} 个`;
}
