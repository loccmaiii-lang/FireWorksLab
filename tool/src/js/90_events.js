// ---------------- 事件 ----------------
initShowcase();
for (const [g, types] of TYPE_GROUPS) {
  const og = document.createElement('optgroup'); og.label = g;
  for (const t of types) og.appendChild(new Option(TYPE_NAMES[t], t));
  $('#type').appendChild(og);
}
$('#verLabel').textContent = 'v' + VERSION;
document.title = '烟花烘培器 · v' + VERSION;
$('#type').addEventListener('change', e => setType(e.target.value));
$('#enNameEdit').addEventListener('click', () => { toggleDeliv(true); setTimeout(() => { const i = $('#dvBase'); if (i) { i.focus(); i.select(); } }, 0); });     // 4.9.4 英文名只在交付清单里改
$('#x-form').addEventListener('change', e => setForm(e.target.value));
$('#x-texW').addEventListener('change', e => { state.P.texW = +e.target.value; onParam(); });
$('#x-texH').addEventListener('change', e => { state.P.texH = +e.target.value; onParam(); });
$('#x-cols').addEventListener('change', e => { state.P.cols = +e.target.value; onParam(); });
$('#x-rows').addEventListener('change', e => { state.P.rows = +e.target.value; onParam(); });
$('#x-chans').addEventListener('change', e => { state.P.chans = +e.target.value; onParam(); });
$('#x-out').addEventListener('change', e => { state.P.outMode = e.target.value; onParam(); });
$('#x-enc').addEventListener('change', e => { state.P.encGamma = +e.target.value; onParam(); });
$('#x-frame').addEventListener('change', e => { state.P.frameMode = e.target.value; onParam(); });
$('#x-zoom').addEventListener('change', e => { state.P.zoom = e.target.value; onParam(); });
$('#x-flip').addEventListener('change', e => { state.P.unitFlip = e.target.checked ? 1 : 0; onParam(); });
$('#x-autogrid').addEventListener('change', e => { state.P.autoGrid = e.target.checked ? 1 : 0; onParam(); });
$('#expo').addEventListener('input', e => { state.expo = +e.target.value; const o = $('#expoOut'); o.textContent = (+state.expo.toFixed(2)) + '×'; o.classList.toggle('off', Math.abs(state.expo - 1) > 1e-3); });
$('#exportResolution').addEventListener('change', e => state.exportResolution = e.target.checked);
// 4.9.2（梳理 6.4「实时模拟有引擎里没有的东西」）：预览泛光看得见、能关；只改画面显示，不烘焙、不进导出（存在这个效果的参数里）
$('#previewBloomChk').addEventListener('change', e => { state.P.previewBloom = e.target.checked ? 1 : 0; if (typeof wbSync === 'function') wbSync(); flash(e.target.checked ? '预览泛光开：只在烘焙器画面上，导出的贴图和引擎里都没有' : '预览泛光关：画面更接近引擎里'); });
$('#previewSettings').addEventListener('toggle', () => { const c = $('#previewBloomChk'); if (c) c.checked = !!+state.P.previewBloom; });
$('#suggestExposure').addEventListener('click', suggestExposure40);
const segBtns = (id, fn) => $(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; fn(b);
  for (const x of $(id).children) x.setAttribute('aria-pressed', String(x === b));
});
segBtns('#dispSeg', b => state.disp = b.dataset.disp);
segBtns('#platformSeg', b => setPreviewPlatform(b.dataset.platform));
$('#viewSeg').addEventListener('click', e => { const b = e.target.closest('button[data-view]'); if (b) selectStageView(b.dataset.view); });
segBtns('#texSeg', b => { state.texSheet = b.dataset.sheet || ''; texSheetSig = ''; flowTrail.length = 0; $('#qlabels').dataset.key = ''; });     // 4.9.20 贴图 / 流转：这一层的每一张序列
segBtns('#flowSeg', b => { state.atlasFlow = b.dataset.flow === '1'; flowTrail.length = 0; $('#qlabels').dataset.key = ''; syncStageTabs(); });
$('#dist').value = sliderFromDist(state.dist);
$('#dist').addEventListener('input', e => { state.dist = distFromSlider(+e.target.value); $('#distOut').textContent = state.dist + ' m'; });
$('#dist').addEventListener('dblclick', () => { state.dist = 1000; $('#dist').value = sliderFromDist(1000); $('#distOut').textContent = '1000 m'; });
$('#play').addEventListener('click', () => { state.playing = !state.playing; $('#play').textContent = state.playing ? '暂停' : '播放'; });
$('#scrub').addEventListener('input', e => { state.t = +e.target.value / 1000 * curDuration(); });
$('#speed').addEventListener('change', e => state.speed = +e.target.value);
keyBind('play', e => { e.preventDefault(); $('#play').click(); });     // 4.9.4 快捷键登记表（68_keys.js）
keyBind('keys', e => { e.preventDefault(); keysShow(); });
{ const kt = $('#keysTools'); if (kt) kt.innerHTML = keysTableHTML(); }
$('#btnExport').addEventListener('click', exportMaster);
$('#bakeRetry').addEventListener('click', retryPreviewBake);
$('#migNoteOk').addEventListener('click', () => migNoteHide());
$('#btnVariants').addEventListener('click', exportVariants);
$('#btnReset').addEventListener('click', () => resetToOpened());     // 4.2.9：回到打开时的版本，不是模板默认（走查 B12）
$('#btnJitter').addEventListener('click', jitterParams);
$('#btnImport').addEventListener('click', () => $('#fileIn').click());
// 导入：完整参数 JSON，或只含差异的派生配方（{ parent / type, diff }）
function importParams(j, fname) {
  // 4.2.10：配方库（旧的派生配方）→ 每个配方存成对应花型模板的一个版本（资产栏「版本」里选），不再进工具页
  if (j.recipes) { const all = store.get('mySaves', {}), prev = state.recipes; let n = 0; state.recipes = [...j.recipes, ...(prev || [])];     // 父配方可能也在这个文件里
    for (const r of j.recipes) { try { const { P, M } = resolveRecipe(r), k = 'type:' + r.type; (all[k] = all[k] || []).push({ id: 'r' + Date.now().toString(36) + n, name: '配方 · ' + r.name, at: wbNow(), base: r.type, snap: { kind: 'single', P, M, repId: null } }); n++; } catch (e) { } }
    state.recipes = prev; store.set('mySaves', all); renderLib(); flash(`已把 ${n} 个配方存成花型模板的版本：打开对应花型（左栏「花型模板」），资产栏「版本」里选`); return; }
  bakeMode.demand = true;          // 4.2.16：导入 = 打开，照常烘
  if (typeof migBegin === 'function') migBegin();     // 4.9.5 不静默：导入旧档时改了什么写出来
  if (j.diff && j.type) { const { P, M } = resolveRecipe(j); state.P = P; state.M = M; state.name = j.name || fname; buildMasterPanel(); onParam(); flash('已导入配方 ' + state.name); migEnd(); return; }
  const p = j.params || j;
  if (!TYPES[p.type]) throw new Error('不认识的花型');
  state.P = derive(storedParams(p)); state.M = normalizeM(j.materialDefaults || {}, p.type);
  // 4.3.2：只剩 GPU 模拟内核（渲染基础问题 H12）；旧版母版（没有 engine 字段的）以前切到 CPU 内核复现，3.7 画法删掉以后本来就复现不了，一律 GPU
  if (j.name) state.name = j.name; buildMasterPanel(); onParam(); flash('已导入 ' + (j.name || fname) + (!p.engine || p.engine === 'cpu' ? '（旧版母版：模拟内核换成 GPU，火花细节会和当年略有不同）' : ''));
  migEnd();
}
$('#fileIn').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { importParams(JSON.parse(await f.text()), f.name); } catch (err) { flash('导入失败：' + err.message, true); }
  e.target.value = '';
});
// 4.3：「存入组合库」「添加图层」随组合编辑器去掉（清理清单 C2）；加层用「我的效果」的「＋ 加一层」
$('#btnExportCombo').addEventListener('click', exportCombo);

(function showGPU() {
  let name = '';
  try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { }
  const soft = /swiftshader|llvmpipe|software|basic render/i.test(name || '');
  const el = $('#gpu'); el.className = 'gpu' + (soft ? ' bad' : '');
  // 只显示型号（ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x…) Direct3D11 …, D3D11) → GeForce RTX 5080），完整字符串在悬停提示里
  const model = (name || '').replace(/^ANGLE \((.*)\)$/, '$1').split(',').map(x => x.trim()).find(x => /geforce|radeon|rtx|gtx|arc|iris|uhd|apple|mali|adreno/i.test(x)) || (name || '未知');
  el.textContent = soft ? '软件渲染（没有用到显卡）' : '显卡 · ' + model.replace(/\s*\(0x[0-9a-f]+\)/i, '').replace(/\s*(Direct3D|vs_|ps_|OpenGL|Metal).*$/i, '').replace(/^NVIDIA\s+|^AMD\s+/i, '').trim();
  el.title = name;
})();
initPicker();
initAssets();
initUpdates();

buildMasterPanel();
initIter();
initLibrary();
if (!/[?&]fast/.test(location.search)) runPreviewBake(); else state.dirty = false;
// 4.2.16 按需烘焙：工具栏「烘焙」按钮 / 「自动」开关、画面上的「贴图是旧的」横条
$('#bakeNow').addEventListener('click', () => { if (!bakeCancel()) bakeNow(); });     // 4.9.4：烘焙中点它 = 取消
$('#abBakeCancel').addEventListener('click', () => bakeCancel());
$('#staleBake').addEventListener('click', () => bakeNow());
$('#autoBakeChk').addEventListener('change', e => { setAutoBake(e.target.checked); flash(e.target.checked ? '自动烘焙：开（改参数停手后自动烘）' : '自动烘焙：关（改参数只更新实时模拟，按 B 烘焙）'); });
$('#autoBakeChk').checked = autoBakeOn();
setInterval(syncStale, 400); syncStale();
requestAnimationFrame(loop);
// 给命令行批量重烘（tool/batch_bake.mjs）和调试用
// 参数覆盖里以 _ 开头的是脚本自己的（_ramp 渐变图、_psf 相机模糊），不进烘焙参数
const trailOver = o => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !k.startsWith('_')));
window.__fw = {
  state, bake: (P, scale, onProg) => bakeFinal(P, scale, onProg), bakeRaw: (P, scale, onProg) => bake(P, scale, onProg), bakeVariants, exportMaster, plan, measure, buildTrack, metricsOf, importParams, setType, setForm,
  // 下一帧画完后取整张画布（PNG data URL）：渲染缩略图用（analysis/scripts/渲染缩略图.py → ui_shots 的 thumb 步骤）
  thumbNow() { return new Promise(res => { pendingThumb = () => { const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height; c.getContext('2d').drawImage(canvas, 0, 0); res(c.toDataURL('image/png')); }; }); },
  // 把参数 JSON / 配方解析成 { P, M, name }（不改界面状态）
  resolve(j, fname) {
    if (j.diff && j.type) { const r = resolveRecipe(j); return { P: r.P, M: r.M, name: j.name || fname }; }
    const p = j.params || j; if (!TYPES[p.type]) throw new Error('不认识的花型：' + p.type);
    return { P: derive(storedParams(p)), M: normalizeM(j.materialDefaults || {}, p.type), name: j.name || fname };
  },
  // 无界面导出：返回 ZIP 的 base64
  async exportZipB64(j, fname, over) {
    const r = this.resolve(j, fname); Object.assign(r.P, over || {});
    const u8 = await this.exportFiles(r.P, r.M, (r.name || 'Firework').replace(/[^\w\-]+/g, '_'));
    let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  },
  async exportFiles(P, M, name, opt = {}) {
    const b = await bakeFinal(P, 1, null); let files = await texFiles(b, name);
    files.push([`${TN(name, 'Ramp')}.png`, await encodePNG(rampPixels(M), 256, 8)]);
    files.push([`${name}_Cascade参数.txt`, utf8(cascadeText(name, b, M))]);
    files.push([`${name}_曲线.csv`, utf8(curvesCSV(b, M))]);
    files.push([`${name}.json`, utf8(JSON.stringify(masterJSON(b, name, M), null, 2))]);
    files.push(...await platformFiles(name, b, M));
    // 命名规范：本机导出任务传 opt.entry（条目号）→ 找到效果的英文名
    if (namingApplies(b) && opt.naming !== false) { const ef = opt.entry ? effectOfEntry({ id: opt.entry }) : null, nm = packNamesFor(ef ? 'ef:' + ef.key : 'rv:' + (opt.entry || name), ef, 1, name, P.type); files = applyPackNaming(files, nm.base, [{ ln: name, mn: name + '_Mobile', b, layer: '' }]); }
    const zip = await makeZip(files); disposeBake(b);
    return new Uint8Array(await zip.arrayBuffer());
  },
  replicaPM, renderStills, measure, metricsOf,
  // 升空尾缀完整导出（2K + 4K 母版 + 两个消散版本 + 渐变图 + 参数表），返回 ZIP 的 base64
  async trailExport(key, over, name) {
    const d = defaultsFor(key), P = derive({ ...d.P, ...trailOver(over) }), M = { ...d.M, ...((over || {})._ramp || {}) };
    const b = await bake(P, 1, null); const files = await texFiles(b, name);
    if (P.trExport4K) { const b4 = await bake(P, 2, null); files.push(...await texFiles(b4, name, '_4K')); disposeBake(b4); }
    files.push([`${TN(name, 'Ramp')}.png`, await encodePNG(rampPixels(M), 256, 8)]);
    files.push([`${name}_Cascade参数.txt`, utf8(cascadeText(name, b, M))]);
    files.push([`${name}_曲线.csv`, utf8(curvesCSV(b, M))]);
    files.push([`${name}.json`, utf8(JSON.stringify(masterJSON(b, name, M), null, 2))]);
    files.push(...await platformFiles(name, b, M));
    const u8 = new Uint8Array(await (await makeZip(files)).arrayBuffer()); disposeBake(b);
    let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  },
  // 升空尾缀：按参数烘焙（可只烘循环、可缩放），返回贴图 PNG（base64）与关键数据
  async trailBake(key, over, scale, loopOnly) {
    const d = defaultsFor(key), P = derive({ ...d.P, ...trailOver(over), _loopOnly: !!loopOnly });
    const b = await bake(P, scale || 1, null), m = b.meta;
    const b64 = async blob => { const u8 = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
    const out = { loop: await b64(await encodePNG(readRGBA8(b.head), b.N, b.NH)), fades: [], meta: { Ww: m.Ww, Wh: m.Wh, hb: m.hb, fEnd: m.fEnd, T: m.T, Tp: m.Tp, relay: m.relay, fill: m.fill, seam: m.check.seam, trailLen: m.trailLen, sizeKeysRise: m.sizeKeysRise, fit: m.fit, N: b.N, NH: b.NH, cols: m.L.cols, per: m.L.per, bakeMs: m.bakeMs }, M: d.M, P };
    for (const f of b.fades || []) out.fades.push({ fps: f.fps, png: await b64(await encodePNG(readRGBA8(f.head), f.N, f.NH)) });
    disposeBake(b); return out;
  },
  // 校准用：低分辨率烘焙一遍，按实拍的算法测贴图
  async quickMetrics(P) {
    const b = await bake({ ...P, texW: 320, texH: 320, cols: 8, rows: 8, chans: 1, outMode: 'combined', form: 'master', zoom: 'on', frameMode: 'auto', fpsFloor: 16, shutter: 0 }, 1, null);
    const m = bakeMetrics(b); disposeBake(b); return m;
  },
  idle: () => !state.baking && !state.dirty && !(state.layerQueue && state.layerQueue.size) && !state.refineDue && !(state.layerRefine && state.layerRefine.size)
};
