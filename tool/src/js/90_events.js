// ---------------- 事件 ----------------
for (const [g, types] of TYPE_GROUPS) {
  const og = document.createElement('optgroup'); og.label = g;
  for (const t of types) og.appendChild(new Option(TYPE_NAMES[t], t));
  $('#type').appendChild(og);
}
{ const og = document.createElement('optgroup'); og.label = '实拍复刻（你发来的视频）';
  for (const r of REPLICAS) og.appendChild(new Option(r.name, 'rep:' + r.id));
  $('#type').appendChild(og); }
$('#verLabel').textContent = `通道打包序列帧 · GPU 模拟 · v${VERSION}`;
$('#type').addEventListener('change', e => setType(e.target.value));
$('#mname').addEventListener('input', e => state.name = e.target.value);
$('#x-form').addEventListener('change', e => setForm(e.target.value));
$('#x-size').addEventListener('change', e => { const [w, h] = e.target.value.split('x').map(Number); state.P.texW = w; state.P.texH = h; onParam(); });
$('#x-cols').addEventListener('change', e => { state.P.cols = +e.target.value; onParam(); });
$('#x-rows').addEventListener('change', e => { state.P.rows = +e.target.value; onParam(); });
$('#x-chans').addEventListener('change', e => { state.P.chans = +e.target.value; onParam(); });
$('#x-out').addEventListener('change', e => { state.P.outMode = e.target.value; onParam(); });
$('#x-enc').addEventListener('change', e => { state.P.encGamma = +e.target.value; onParam(); });
$('#x-frame').addEventListener('change', e => { state.P.frameMode = e.target.value; onParam(); });
$('#x-zoom').addEventListener('change', e => { state.P.zoom = e.target.value; onParam(); });
$('#x-engine').addEventListener('change', e => { state.P.engine = e.target.value; onParam(); });
$('#x-flip').addEventListener('change', e => { state.P.unitFlip = e.target.checked ? 1 : 0; onParam(); });
$('#x-autogrid').addEventListener('change', e => { state.P.autoGrid = e.target.checked ? 1 : 0; onParam(); });
$('#expo').addEventListener('input', e => state.expo = +e.target.value);
const segBtns = (id, fn) => $(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; fn(b);
  for (const x of $(id).children) x.setAttribute('aria-pressed', String(x === b));
});
segBtns('#dispSeg', b => state.disp = b.dataset.disp);
segBtns('#viewSeg', b => state.view = b.dataset.view);
segBtns('#atlasSeg', b => state.atlasLayer = b.dataset.layer);
segBtns('#segSeg', b => state.atlasSeg = +b.dataset.seg);
segBtns('#flowSeg', b => { state.atlasFlow = b.dataset.flow === '1'; flowTrail.length = 0; $('#qlabels').dataset.key = ''; });
$('#dist').addEventListener('input', e => { state.dist = +e.target.value; $('#distOut').textContent = state.dist + ' m'; });
$('#play').addEventListener('click', () => { state.playing = !state.playing; $('#play').textContent = state.playing ? '暂停' : '播放'; });
$('#scrub').addEventListener('input', e => { state.t = +e.target.value / 1000 * curDuration(); });
$('#speed').addEventListener('change', e => state.speed = +e.target.value);
document.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#play').click(); } });
$('#btnExport').addEventListener('click', exportMaster);
$('#btnVariants').addEventListener('click', exportVariants);
$('#btnReset').addEventListener('click', () => setType(state.P.type));
$('#btnJitter').addEventListener('click', jitterParams);
$('#btnImport').addEventListener('click', () => $('#fileIn').click());
// 导入：完整参数 JSON，或只含差异的派生配方（{ parent / type, diff }）
function importParams(j, fname) {
  if (j.recipes) { for (const r of j.recipes) { const i = state.recipes.findIndex(x => x.name === r.name); if (i >= 0) state.recipes[i] = r; else state.recipes.push(r); } store.set('recipes', state.recipes); renderRecipes(); flash('已导入配方库'); return; }
  if (j.diff && j.type) { const { P, M } = resolveRecipe(j); state.P = P; state.M = M; state.name = j.name || fname; buildMasterPanel(); onParam(); flash('已导入配方 ' + state.name); return; }
  const p = j.params || j;
  if (!TYPES[p.type]) throw new Error('不认识的花型');
  const d = defaultsFor(p.type); state.P = derive({ ...d.P, ...p }); state.M = normalizeM(j.materialDefaults || {}, p.type);
  // 旧版消え口离散默认 1.2%，新版默认 6%，导入时保留原值；旧版没有 engine 字段的用 CPU 内核
  if (!p.engine) { state.P.engine = 'cpu'; flash('旧版母版：已切换到 CPU 内核以完全复现'); }
  if (j.name) state.name = j.name; buildMasterPanel(); onParam(); if (p.engine) flash('已导入 ' + (j.name || fname));
}
$('#fileIn').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { importParams(JSON.parse(await f.text()), f.name); } catch (err) { flash('导入失败：' + err.message, true); }
  e.target.value = '';
});
$('#btnSave').addEventListener('click', async () => {
  if (familyOf(state.P.type) !== 'aerial') { flash('组合库只收空中开花类（上升、地面类单独挂发射器）', true); return; }
  busy(true, '烘焙 1024 版本存入组合库…', 0);
  try {
    const b = await bake(libP(state.P), 1, p => busy(true, null, p));
    const name = state.name || TYPE_EN[state.P.type];
    const old = state.lib.findIndex(e => e.name === name);
    const entry = { name, type: state.P.type, P: { ...state.P }, M: cloneM(state.M), bake: b };
    if (old >= 0) { disposeBake(state.lib[old].bake); state.lib[old] = entry; } else state.lib.push(entry);
    flash(`已存入组合库：${name}`); if (state.libReady) buildComboPanel();
  } catch (err) { flash('失败：' + err.message, true); }
  busy(false);
});
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', async () => {
  const tab = b.dataset.tab; if (tab === state.tab) return;
  document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  state.tab = tab; state.t = 0;
  $('#pMaster').hidden = tab !== 'master'; $('#pCombo').hidden = tab !== 'combo'; $('#pIter').hidden = tab !== 'iter';
  $('#viewSeg').hidden = tab === 'combo';
  if (tab === 'combo') { await ensureLibrary(); if (!state.layers.length) applyCombo(COMBOS[0]); else buildComboPanel(); }
  if (tab === 'iter') { renderMetrics(); abInfo(); renderVersions(); }
}));
$('#btnAddLayer').addEventListener('click', () => { if (state.lib[0]) { state.layers.push(newLayer(state.lib[0])); buildComboPanel(); } });
$('#btnExportCombo').addEventListener('click', exportCombo);

(function showGPU() {
  let name = '';
  try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { }
  const soft = /swiftshader|llvmpipe|software|basic render/i.test(name || '');
  const el = $('#gpu'); el.className = 'gpu' + (soft ? ' bad' : '');
  el.textContent = soft ? '当前是软件渲染，没有用到显卡' : ('显卡：' + (name || '未知').replace(/^ANGLE \((.*)\)$/, '$1'));
  el.title = name;
})();
buildMasterPanel();
initIter();
if (!/[?&]fast/.test(location.search)) runPreviewBake(); else state.dirty = false;
requestAnimationFrame(loop);
// 给命令行批量重烘（tool/batch_bake.mjs）和调试用
window.__fw = {
  state, bake, bakeVariants, exportMaster, plan, measure, buildTrack, metricsOf, importParams, setType, setForm,
  // 把参数 JSON / 配方解析成 { P, M, name }（不改界面状态）
  resolve(j, fname) {
    if (j.diff && j.type) { const r = resolveRecipe(j); return { P: r.P, M: r.M, name: j.name || fname }; }
    const p = j.params || j; if (!TYPES[p.type]) throw new Error('不认识的花型：' + p.type);
    const d = defaultsFor(p.type); return { P: derive({ ...d.P, ...p }), M: normalizeM(j.materialDefaults || {}, p.type), name: j.name || fname };
  },
  // 无界面导出：返回 ZIP 的 base64
  async exportZipB64(j, fname, over) {
    const r = this.resolve(j, fname); Object.assign(r.P, over || {});
    const u8 = await this.exportFiles(r.P, r.M, (r.name || 'Firework').replace(/[^\w\-]+/g, '_'));
    let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  },
  async exportFiles(P, M, name) {
    const b = await bake(P, 1, null); const files = await texFiles(b, name);
    files.push([`T_${name}_Ramp.png`, await encodePNG(rampPixels(M), 256, 8)]);
    files.push([`${name}_Cascade参数.txt`, utf8(cascadeText(name, b, M))]);
    files.push([`${name}_曲线.csv`, utf8(curvesCSV(b, M))]);
    files.push([`${name}.json`, utf8(JSON.stringify(masterJSON(b, name, M), null, 2))]);
    const zip = await makeZip(files); disposeBake(b);
    return new Uint8Array(await zip.arrayBuffer());
  },
  replicaPM,
  // 校准用：低分辨率烘焙一遍，按实拍的算法测贴图
  async quickMetrics(P) {
    const b = await bake({ ...P, texW: 320, texH: 320, cols: 8, rows: 8, chans: 1, outMode: 'combined', form: 'master', zoom: 'on', frameMode: 'auto', fpsFloor: 16, shutter: 0 }, 1, null);
    const m = bakeMetrics(b); disposeBake(b); return m;
  },
  idle: () => !state.baking && !state.dirty
};
