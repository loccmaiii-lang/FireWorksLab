// 隔离浏览器中的真实HTTP/GPU验证；只生成测试ZIP，不连接仓库目录、不发布、不导入UE。
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
let chromium;
try { ({ chromium } = require(process.env.FW_PLAYWRIGHT || 'playwright')); }
catch (_) { ({ chromium } = require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const root = path.resolve(__dirname, '../..'), out = path.join(root, 'analysis/results/MOBILE_EXPORT_PREFLIGHT_20261019');
const phase = process.argv.includes('--before') ? '修前' : '修后';
fs.mkdirSync(out, { recursive: true });
execFileSync('python', ['-X', 'utf8', 'tool/local_http/preflight.py', '--tool', 'baker'], { cwd: root, stdio: 'inherit' });
const recipe = JSON.parse(fs.readFileSync(path.join(root, 'analysis/我的配方/my_fxmv7lp8ci/金曜菊-B__fxmv7lp8ci.json'), 'utf8'));
recipe.id = 'fxmobilepreflighttest'; recipe.key = 'my:' + recipe.id; recipe.name = 'GlitterChry手机导出回归';
recipe.snap.name = recipe.name;
recipe.ue = { base: 'GlitterChry_Test', system: 'GlitterChry_Test', layers: ['Lead', 'Gold', 'Head'], custom: true };
recipe.snap.layers.forEach(x => { x.L.out = { ...(x.L.out || {}), mobile: 'seq', mobileManual: true }; });
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1050 } }), page = await context.newPage();
  page.setDefaultTimeout(240000); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  try {
    if (phase === '修前') {
      // 基线来自本仓库的116成品；只在隔离测试页替换主响应，不切端口/服务或用户页面。
      const html = execFileSync('git', ['show', '1777af13:tool/FireworkBaker.html'], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
      await page.route('http://127.0.0.1:8034/baker?fast', route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
    }
    await page.goto('http://127.0.0.1:8034/baker?fast', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__fw);
    await page.evaluate(async rec => { state.stillBusy = true; state.playing = false; state.autoBake = false; clearTimeout(bakeTimer); myPut(rec); await openMyEffect(rec.id); }, recipe);
    await page.waitForFunction(() => state.tab === 'combo' && state.layers.length === 3 && !state.baking && state.layers.every(L => { const e = layerEntryOf(L); return e?.bake && !layerStale(e); }));
    console.log(phase, '真实三层已烘好');
    if (process.argv.includes('--save-only')) {
      const saved = await page.evaluate(async () => {
        const snap = mySnap(); await exportCombo(); const rec = await mySave(false);
        return { id: rec?.id, before: snap, saved: rec?.snap, version: VERSION };
      });
      assert.ok(saved.id); assert.deepEqual(saved.before, saved.saved);
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => !!window.__fw);
      const restored = await page.evaluate(async id => {
        state.stillBusy = true; state.playing = false; state.autoBake = false; await openMyEffect(id); return mySnap();
      }, saved.id);
      assert.deepEqual(restored, saved.saved);
      await page.waitForFunction(() => !state.baking && state.layers.every(L => { const e = layerEntryOf(L); return e?.bake && !layerStale(e); }));
      const ui = await page.evaluate(() => { toggleDeliv(true); return { warning: document.querySelector('#delivView [role="alert"]')?.textContent, selected: [...document.querySelectorAll('[data-prod="mobile"]')].map(x => x.value), blocked: document.querySelector('#dvExport').disabled }; });
      assert.deepEqual(ui.selected, ['seq', 'seq', 'seq']); assert.equal(ui.blocked, true); assert.match(ui.warning, /1、2、3/);
      fs.writeFileSync(path.join(out, '手动选择保存刷新.json'), JSON.stringify({ pass: true, version: saved.version, snapIdentical: true, ui, errors }, null, 2) + '\n');
      assert.deepEqual(errors, []); console.log('手动三层选择原生保存/刷新逐字段一致，冲突表仍可编辑'); return;
    }
    const result = await page.evaluate(async before => {
      const original = JSON.stringify(mySnap()), version = VERSION, job = captureExportJob('combo');
      const files = await comboPackFiles('GlitterChry_Test', job.layers, null, job);
      const decode = name => JSON.parse(new TextDecoder().decode(files.find(x => x[0] === name)[1]));
      const pc = decode('cascade.json'), mobile = decode('cascade_mobile.json');
      const problems = packGateConfig('cascade_mobile.json', mobile, '', {});
      const hashes = {}, pixels = {}, visiblePixels = {};
      for (const t of Object.values(pc.textures)) {
        const data = files.find(x => x[0] === t.file)?.[1];
        if (!data) continue;
        const u8 = new Uint8Array(data instanceof Blob ? await data.arrayBuffer() : data), view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
        const hash = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
        hashes[t.file] = await hash(u8);
        // PNG的流式deflate分块可改变文件字节；比较解压后的Sub过滤扫描线，保留RGBA接力四通道，避免Canvas预乘。
        const chunks = [];
        for (let at = 8; at < u8.length;) {
          const n = view.getUint32(at), kind = String.fromCharCode(...u8.subarray(at + 4, at + 8));
          if (kind === 'IDAT') chunks.push(u8.subarray(at + 8, at + 8 + n));
          at += n + 12;
        }
        const raw = new Uint8Array(await new Response(new Blob(chunks).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
        const width = view.getUint32(16), height = view.getUint32(20);
        pixels[t.file] = { width, height, rgbaScanlineSHA256: await hash(raw) };
        let active = raw;
        if (t.class === 'flipbook') {
          // 只比较配置实际引用的F帧；末张未填的通道/格子不是可播放帧，另保留整图哈希揭示差异。
          const stride = width * 4, rgba = new Uint8Array(stride * height);
          for (let y = 0; y < height; y++) {
            if (raw[y * (stride + 1)] !== 1) throw Error('测试PNG应为Sub过滤');
            for (let x = 0; x < stride; x++) rgba[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + (x >= 4 ? rgba[y * stride + x - 4] : 0)) & 255;
          }
          const cw = width / t.cols, ch = height / t.rows, per = t.cols * t.rows;
          active = new Uint8Array(t.frames * cw * ch); let p = 0;
          for (let f = 0; f < t.frames; f++) for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++)
            active[p++] = rgba[((Math.floor((f % per) / t.cols) * ch + y) * width + (f % t.cols) * cw + x) * 4 + Math.floor(f / per)];
        }
        visiblePixels[t.file] = { width, height, frames: t.frames || null, SHA256: await hash(active) };
      }
      let begin = 0, captured = 0, rebaked = 0;
      const oldBegin = DeliveryWorkspace.beginExport, oldCapture = captureExportJob, oldPack = comboPackFiles;
      try {
        DeliveryWorkspace.beginExport = async () => { begin++; throw Error('隔离回归在资源交付边界停止，禁止发布'); };
        captureExportJob = (...args) => { captured++; return oldCapture(...args); };
        comboPackFiles = (...args) => { rebaked++; return oldPack(...args); };
        await exportCombo();
      } finally { DeliveryWorkspace.beginExport = oldBegin; captureExportJob = oldCapture; comboPackFiles = oldPack; }
      const warning = document.querySelector('#delivView [role="alert"]')?.textContent || '';
      const manual = { begin, captured, rebaked, warning, tableVisible: !document.querySelector('#delivView').hidden,
        focus: document.activeElement?.getAttribute('data-prod'), blocked: !!document.querySelector('#dvExport')?.disabled,
        unchanged: JSON.stringify(mySnap()) === original };
      let valid = null;
      if (!before) {
        // 只在本测试上下文明确选择既有自动方案，验证恢复；生产代码不替用户修改。
        for (let i = 0; i < state.layers.length; i++) setProduct(i, 'mobile', 'auto');
        const auto = comboMobilePlan(curLayerBakes()), autoJob = captureExportJob('combo');
        const good = await comboPackFiles('GlitterChry_Test', autoJob.layers, null, autoJob);
        const zip = new Uint8Array(await (await makeZip(good, autoJob)).arrayBuffer());
        const texts = Object.fromEntries(good.filter(x => /^cascade(_mobile)?\.json$/.test(x[0])).map(([n, d]) => [n, JSON.parse(new TextDecoder().decode(d))]));
        let encoded = ''; for (let i = 0; i < zip.length; i += 0x8000) encoded += String.fromCharCode(...zip.subarray(i, i + 0x8000));
        valid = { auto, zip: btoa(encoded), zipBytes: zip.length, pc: texts['cascade.json'], mobile: texts['cascade_mobile.json'], warning: document.querySelector('#delivView [role="alert"]')?.textContent || '', blocked: document.querySelector('#dvExport')?.disabled };
        const saved = await mySave(false); valid.savedId = saved?.id;
        valid.savedOut = saved?.snap?.layers?.map(x => x.L.out || null);
      }
      return { version, renderer: document.querySelector('#gpu')?.title, manual, pcEmitters: pc.emitters.length,
        mobileEmitters: mobile.emitters.length, problems, pcTextureHashes: hashes, pcPixels: pixels, pcVisiblePixels: visiblePixels, valid };
    }, phase === '修前');
    assert.ok(result.problems.some(x => /同一时刻有 3 张大序列/.test(x)), '真实导出应复现三层重叠');
    assert.equal(/swiftshader|software|basic render/i.test(result.renderer || ''), false, '必须使用实际GPU');
    result.source = phase === '修前' ? '本仓库1777af13成品（116），隔离页受控HTTP响应' : '预检通过的F盘8034实际117成品';
    assert.equal(result.manual.unchanged, true);
    if (phase === '修前') assert.equal(result.manual.begin, 1, '修前确实进入资源交付才报错');
    else {
      assert.equal(result.manual.begin, 0); assert.equal(result.manual.captured, 0); assert.equal(result.manual.rebaked, 0);
      assert.equal(result.manual.tableVisible, true); assert.equal(result.manual.blocked, true); assert.equal(result.manual.focus, 'mobile');
      assert.match(result.manual.warning, /1、2、3/); assert.match(result.manual.warning, /省略/);
      assert.deepEqual(result.valid.auto.map(x => x.kind), ['seq', 'off', 'off']);
      assert.equal(result.valid.mobile.emitters.length <= 3, true); assert.equal(result.valid.warning, ''); assert.equal(result.valid.blocked, false);
      fs.writeFileSync(path.join(out, '合法自动方案测试.zip'), Buffer.from(result.valid.zip, 'base64')); delete result.valid.zip;
      const baseline = JSON.parse(fs.readFileSync(path.join(out, '修前HTTP验证.json'), 'utf8'));
      assert.deepEqual(result.pcVisiblePixels, baseline.pcVisiblePixels, 'PC配置引用的全部可播放帧及功能图逐字节一致');
      result.pngEncodingDiffs = Object.keys(result.pcTextureHashes).filter(k => result.pcTextureHashes[k] !== baseline.pcTextureHashes[k]);
      result.unusedAtlasDiffs = Object.keys(result.pcPixels).filter(k => result.pcPixels[k].rgbaScanlineSHA256 !== baseline.pcPixels[k].rgbaScanlineSHA256);
      const savedId = result.valid.savedId; assert.ok(savedId);
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => !!window.__fw);
      const restored = await page.evaluate(async id => { state.stillBusy = true; state.playing = false; state.autoBake = false; await openMyEffect(id); return mySnap().layers.map(x => x.L.out || null); }, savedId);
      assert.deepEqual(restored, result.valid.savedOut); result.savedRefresh = true;
    }
    assert.deepEqual(errors, []); result.pageErrors = errors; result.pass = true;
    fs.writeFileSync(path.join(out, phase + 'HTTP验证.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ phase, version: result.version, mobileEmitters: result.mobileEmitters, manual: result.manual, validZip: result.valid?.zipBytes, pcTextureHashCount: Object.keys(result.pcTextureHashes).length, pass: true }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
