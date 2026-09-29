// UI for the isolated experiment. It does not share the production tool's storage.
function syncQualityUI() {
  const q = qualityOf(state.P);
  $('#qSS').value = q.ss; $('#qKernel').value = q.kernel; $('#qCore').value = q.core;
  $('#qCoreOut').textContent = `${Math.round(q.core * 100)}%`;
  $('#qTime').value = q.hz;
  $('#qPreview').value = LAB.previewScale; $('#qBloom').value = LAB.bloom;
  $('#qBloomOut').textContent = LAB.bloom.toFixed(2);
}
async function qualityExport(fn) {
  if (state.baking || LAB.job) { flash('当前任务完成后再导出。', true); return; }
  LAB.job = true; LAB.cancel = false;
  try { await fn(); } finally { LAB.job = false; if (state.dirty) scheduleBake(); }
}
function applyQualityPreset(key, size) {
  if (LAB.job || state.baking) { flash('请先等待或取消当前烘焙。', true); return; }
  Object.assign(state.P, QUALITY_PRESETS[key]);
  if (size) { state.P.texW = size; state.P.texH = size; state.P.chans = 4; }
  LAB.previewScale = key === 'legacy' ? 1 : 2; LAB.bloom = key === 'legacy' ? 0.2 : 0.06;
  syncQualityUI(); syncExport(); onParam();
}
async function qualitySnapshot() {
  if (state.baking || LAB.job || !state.bake) { flash('请等烘焙完成后保存画面。', true); return; }
  if (state.tab === 'asset') { flash('素材页使用原始帧；4K 定帧请切到花型或导出效果。', true); return; }
  const save = { force: LAB.forcePx, playing: state.playing, B: state.B };
  LAB.job = true; state.playing = false; LAB.forcePx = 4096;
  busy(true, '渲染 4096 × 4096 当前画面…', 0.4);
  try {
    await nextTick(); ensureTargets();
    if (state.tab === 'combo') renderCombo(); else if (state.view === 'export') renderExport(); else if (state.view === 'atlas') renderAtlas(); else renderLive();
    const url = canvas.toDataURL('image/png');
    download(await (await fetch(url)).blob(), `${safeName()}_${state.view}_${state.t.toFixed(3)}s_4K.png`);
    flash('已保存 4K 当前画面。导出视图仍受单格分辨率限制。');
  } catch (e) { flash(e.message, true); }
  finally { LAB.forcePx = save.force; LAB.job = false; state.playing = save.playing; busy(false); }
}
function initQuality() {
  const host = document.createElement('section'); host.className = 'quality-panel'; host.id = 'qualityPanel';
  host.innerHTML = `<details open><summary><span class="lab-badge">ULTRA / 01</span> 高精度实验</summary>
    <p class="hint">基于 3.6 的独立副本 · 原版未覆盖<br>先看实时细节，再看导出效果；4K / 8K 是实验母版。</p>
    <div class="quality-presets"><button class="btn" id="qLegacy">基准 · 2K</button><button class="btn primary" id="qFine">高精 · 4K</button><button class="btn" id="q8K">极精 · 8K</button></div>
    <div class="grid2">
      <label class="field">烘焙空间采样<select id="qSS"><option value="2">2 × 2（4 次）</option><option value="4">4 × 4（16 次）</option><option value="8">8 × 8（64 次）</option></select></label>
      <label class="field">预览像素倍率<select id="qPreview"><option value="1">1× · 原始屏幕尺寸</option><option value="2">2× · 精细预览</option><option value="3">3× · 超精预览</option></select></label>
      <label class="field">粒子采样<select id="qKernel"><option value="0">原版高斯光点</option><option value="1">像素覆盖积分</option></select></label>
      <label class="field">时间采样<select id="qTime"><option value="300">300 Hz / 最多 16</option><option value="960" selected>960 Hz / 最多 64</option><option value="1920">1920 Hz / 最多 128</option></select></label>
    </div>
    <label class="quality-range">亮核占比 <output id="qCoreOut">25%</output><input id="qCore" type="range" min="0" max="0.6" step="0.05" value="0.25"></label>
    <label class="quality-range">预览光晕 <output id="qBloomOut">0.06</output><input id="qBloom" type="range" min="0" max="0.4" step="0.01" value="0.06"></label>
    <div class="line2"><label class="check"><input id="qRaw" type="checkbox"> 灰度检查</label><label class="check"><input id="qLoupe" type="checkbox"> 4× 像素放大镜</label></div>
    <p class="hint">灰度检查移除背景并显示亮度；贴图 → 流转动画可检查未上色的真实通道。光晕只影响显示，不写进序列贴图。</p>
    <div id="qInfo" class="quality-info" aria-live="polite">等待烘焙…</div>
    <div class="line2"><button class="btn" id="qSnapshot">保存 4K 当前画面</button><button class="btn ghost" id="qCancel">取消烘焙</button></div>
    <p class="hint">2K 引擎版：在下方贴图尺寸选 2048。增大单格才增加细节容量；采样次数不是画质提升倍数。</p>
  </details>`;
  $('#pReview').before(host);
  const lens = document.createElement('canvas'); lens.id = 'qualityLoupe'; lens.width = lens.height = 240; lens.hidden = true; $('#box').append(lens);
  $('#qLegacy').onclick = () => applyQualityPreset('legacy', 2048);
  $('#qFine').onclick = () => applyQualityPreset('fine', 4096);
  $('#q8K').onclick = () => applyQualityPreset('fine', 8192);
  $('#qSS').onchange = e => { state.P.qSS = +e.target.value; onParam(); };
  $('#qKernel').onchange = e => { state.P.qKernel = +e.target.value; onParam(); };
  $('#qTime').onchange = e => { state.P.qHz = +e.target.value; state.P.qMaxSub = state.P.qHz === 300 ? 16 : state.P.qHz === 960 ? 64 : 128; onParam(); };
  $('#qCore').oninput = e => { state.P.qCore = +e.target.value; $('#qCoreOut').textContent = `${Math.round(state.P.qCore * 100)}%`; onParam(); };
  $('#qPreview').onchange = e => LAB.previewScale = +e.target.value;
  $('#qBloom').oninput = e => { LAB.bloom = +e.target.value; $('#qBloomOut').textContent = LAB.bloom.toFixed(2); };
  $('#qRaw').onchange = e => LAB.raw = e.target.checked;
  $('#qLoupe').onchange = e => LAB.loupe = e.target.checked;
  $('#qSnapshot').onclick = qualitySnapshot;
  $('#qCancel').onclick = () => { LAB.cancel = true; state.rebake = false; clearTimeout(bakeTimer); };
  $('#box').addEventListener('pointermove', e => { const r = $('#box').getBoundingClientRect(); LAB.pointer = [(e.clientX-r.left)/r.width, (e.clientY-r.top)/r.height]; });
  Object.assign(state.P, QUALITY_PRESETS.fine, { texW: 4096, texH: 4096, chans: 4 });
  syncQualityUI();
}
let qualityInfoCache = '', qualityHudAt = 0;
const qualityDisabled = new Map();
function updateQualityHUD() {
  const busyNow = state.baking || LAB.job || GPU_WORK > 0;
  $('#qCancel').disabled = !busyNow;
  // Lock mutating controls while a GPU job is using the current recipe.
  for (const sel of ['#qLegacy','#qFine','#q8K','#qSnapshot','#qSS','#qKernel','#qTime','#qCore']) $(sel).disabled = busyNow;
  if (busyNow) {
    for (const el of document.querySelectorAll('#pMaster input,#pMaster select,#pMaster button,#pCombo button,#pIter button,#libSearch')) {
      if (!qualityDisabled.has(el)) qualityDisabled.set(el, el.disabled);
      el.disabled = true;
    }
    $('#libBody').inert = true;
  } else if (qualityDisabled.size) {
    for (const [el,disabled] of qualityDisabled) el.disabled = disabled;
    qualityDisabled.clear(); $('#libBody').inert = false;
  }
  const b = state.bake, q = qualityOf(state.P), bud = qualityBudget(state.P);
  const txt = `画布 ${canvas.width} × ${canvas.height} · 最高 4096\n${bud.width} × ${bud.height} 贴图 / ${bud.frames} 帧\n单帧 ${bud.cell.join(' × ')} px → ${q.ss} × ${q.ss} 超采样\n临时 GPU 缓冲约 ${Math.round(bud.workingMiB)} MiB（不含缓存）${b ? '\n上次烘焙 '+(b.meta.bakeMs/1000).toFixed(2)+' s' : ''}${state.dirty ? '\n参数已变化，当前显示上次结果' : ''}`;
  if (txt !== qualityInfoCache) { $('#qInfo').textContent = txt; qualityInfoCache = txt; }
  $('#btnExport').textContent = `导出 ${state.P.texW >= 4096 ? state.P.texW/1024+'K 实验母版' : '2K 引擎版'}（ZIP）`;
  $('#qSnapshot').disabled = busyNow || !state.bake || state.tab === 'asset';
  const lens = $('#qualityLoupe'); lens.hidden = !LAB.loupe;
  if (LAB.loupe && performance.now()-qualityHudAt > 80) {
    qualityHudAt = performance.now(); const cv = state.tab === 'asset' ? $('#assetCv') : canvas, g = lens.getContext('2d');
    const size = 60, x = clamp(LAB.pointer[0]*cv.width-size/2,0,Math.max(0,cv.width-size)), y = clamp(LAB.pointer[1]*cv.height-size/2,0,Math.max(0,cv.height-size));
    g.imageSmoothingEnabled = false; g.drawImage(cv,x,y,size,size,0,0,240,240); g.fillStyle='rgba(0,0,0,.75)'; g.fillRect(0,216,240,24); g.fillStyle='#e8ca9a'; g.font='12px sans-serif'; g.fillText('4× 像素检查 · 鼠标指向取样',8,233);
  }
}
