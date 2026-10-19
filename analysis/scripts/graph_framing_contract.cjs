/* 粒子图固定取景契约：隔离 HTTP 浏览器，只做计划、配置和 16² 单帧通路探针，不烘正式效果。 */
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const root = path.resolve(__dirname, '../..'), before = process.argv.includes('--expect-before');
const out = path.join(root, 'analysis/results/GraphFraming', before ? '修复前契约.json' : '修复后契约.json');
const report = { format: 'fwl.graph-framing-contract/1', at: new Date().toISOString(), mode: before ? 'expect-before' : 'fixed', url: 'http://127.0.0.1:8034/baker?fast', contractPass: false, expectationPass: false };
const run = args => cp.spawnSync('python', ['-X', 'utf8', ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
(async () => {
  const pre = run(['tool/local_http/preflight.py', '--tool', 'baker', '--start']);
  report.preflight = { code: pre.status, stdout: pre.stdout.trim(), stderr: pre.stderr.trim() };
  if (pre.status !== 0) throw Error('HTTP 预检未通过');
  report.gitHead = cp.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript('window.requestAnimationFrame=()=>0');
    const response = await page.goto(report.url);
    report.documentSHA256 = crypto.createHash('sha256').update(await response.body()).digest('hex');
    await page.waitForFunction(() => window.__fw);
    report.result = await page.evaluate(async () => {
      state.autoBake = false; clearTimeout(bakeTimer); state.playing = false; state.stillBusy = true;
      const checks = [], near = (a, b, tol = 1e-7) => Math.abs(a - b) <= tol;
      const check = (id, fn) => { try { const evidence = fn(); checks.push({ id, pass: true, evidence }); } catch (e) { checks.push({ id, pass: false, error: e.message }); } };
      const need = (ok, why) => { if (!ok) throw Error(why); };
      const equal = (a, b, why) => need(JSON.stringify(a) === JSON.stringify(b), why + ': ' + JSON.stringify({ actual: a, expected: b }));
      const close = (a, b, why, tol) => need(near(a, b, tol), why + ': ' + a + ' ≠ ' + b);
      const src = defaultsFor('sparkgraph'), P = structuredClone(src.P), M = structuredClone(src.M);
      P.sparkGraph = structuredClone(GRAPH_PRESETS.rocket); P.sparkGraph.bounds = [-2, 6, -4, 1];
      P.autoGrid = 0;
      const pl = graphPlan(P), c = centerAt(pl, .5), rectangle = m => { const v = frameView40(m, .5); return [v[0] - v[2], v[0] + v[2], v[1] - v[3], v[1] + v[3]]; };
      check('asymmetric-plan', () => { close(pl.Ww, 8.16, '左右范围的真实宽度'); close(pl.Wh, 5.1, '上下范围的真实高度'); close(c[0], 2, '横向取景中心'); close(c[1], -1.5, '竖向取景中心'); return { width: pl.Ww, height: pl.Wh, center: c, rectangle: rectangle(pl) }; });
      for (let i = 0; i < 4; i++) check('edge-' + ['left', 'right', 'bottom', 'top'][i], () => {
        const q = structuredClone(P); q.sparkGraph.bounds[i] += .25;
        const b = q.sparkGraph.bounds, m = graphPlan(q), cc = centerAt(m, .5), expected = [(b[0] + b[1]) / 2, (b[2] + b[3]) / 2];
        close(m.Ww, (b[1] - b[0]) * 1.02, '边界调整后的宽度'); close(m.Wh, (b[3] - b[2]) * 1.02, '边界调整后的高度');
        close(cc[0], expected[0], '边界调整后的中心 X'); close(cc[1], expected[1], '边界调整后的中心 Y');
        need(JSON.stringify(rectangle(m)) !== JSON.stringify(rectangle(pl)), '改边界却没改真实取景'); return { bounds: b, center: cc, rectangle: rectangle(m) };
      });
      check('symmetric-compatibility', () => {
        const q = structuredClone(P); q.sparkGraph.bounds = [-7, 7, -18, 2];
        const a = graphPlan(q), old = loopPlan(q, q.sparkGraph.bounds, q.sparkGraph.period), F = old.L.F;
        // 4.9.117 的 graphPlan 在 loopPlan 后补逐 tick 帧号；兼容性比较也保留这一步。
        old.keys = F > 1 ? [[0, .02], [(F - 1) / F, F - 1 + .02], [1, F - .01]] : [[0, 0], [1, 0]];
        old.frameTiming = 'loop-tick-start';
        for (const k of Object.keys(old)) equal(a[k], old[k], '对称旧计划字段 ' + k);
        equal(centerAt(a, .5), [0, -8], '对称取景中心不变'); return { center: centerAt(a, .5), width: a.Ww, height: a.Wh, fields: Object.keys(old).length };
      });
      check('live-and-engine-plan', () => {
        const live = displayPlan40(P), v = frameView40(live, .5), L = { scale: 1, mirror: false };
        close(v[0], 2, '实时渲染计划中心 X'); close(v[1], -1.5, '实时渲染计划中心 Y');
        const r = layerRectAt(pl, L, .5), rc = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
        close(rc[0], 2, '引擎回放面片中心 X'); close(rc[1], -1.5, '引擎回放面片中心 Y');
        return { liveView: v, engineRectangle: r };
      });
      // 真正走 bakeFrames 的视图传参和 GL 打包通路；记录绘制入口收到的坐标，不生成正式粒子图。
      try {
        const q = { ...P, texW: 16, texH: 16, cols: 1, rows: 1, chans: 1, qSS: 1, qHz: 30, qMaxSub: 1, shutter: .5, cameraMotion: 0, cameraDof: 0, outMode: 'combined' };
        const m = graphPlan(q), drawViews = [], R = { slots: 0, draw(t, v) { drawViews.push([...v]); } };
        const b = await bakeFrames(q, 1, null, m, R);
        try { check('actual-bake-view', () => { need(drawViews.length > 0, '烘焙没有调用渲染入口'); for (const v of drawViews) { close(v[0], 2, '烘焙绘制中心 X'); close(v[1], -1.5, '烘焙绘制中心 Y'); close(v[2] * 2, 8.16, '烘焙绘制宽度'); } return { pixelProbe: '16x16, one frame, instrumented draw', views: drawViews }; }); }
        finally { disposeBake(b); }
      } catch (e) { checks.push({ id: 'actual-bake-view', pass: false, error: e.message }); }
      const b = { P, form: 'loop', meta: pl };
      let emitter;
      check('cascade-nozzle-reconstruction', () => {
        const j = fwlLoop('GraphFramingContract', b, M, false); emitter = j.emitters[0];
        const mod = name => emitter.modules.find(m => m.m === name), size = mod('InitialSize').StartSize.const, loc = mod('InitialLocation').StartLocation.const;
        const pv = emitter.required.pivot_offset || [-.5, -.5], cc = [loc[0] / 100 + (.5 + pv[0]) * size[0] / 100, loc[2] / 100 + (-.5 - pv[1]) * size[1] / 100];
        equal(loc, [0, 0, 0], '发射点应保持原点'); close(cc[0], 2, 'Cascade 横向面片中心', .001); close(cc[1], -1.5, 'Cascade 竖向面片中心', .001);
        close(pv[0], -.5 + 2 / pl.Ww, 'Pivot X', .0001); close(pv[1], -.5 - pl.cy / pl.Wh, 'Pivot Y', .0001);
        return { pivot: pv, sizeCm: size, locationCm: loc, reconstructedCenterM: cc, loops: emitter.required.loops, localSpace: emitter.required.local_space };
      });
      if (!emitter) emitter = fwlLoop('GraphFramingContract', b, M, false).emitters[0];
      check('cascade-manual-panel-pivot', () => {
        // 调用 HTTP 成品中的实际说明生成器，而不是只检查源码公式或拼一个预期字符串。
        // loop 是窜天猴/仙女棒真实的 Cascade参数.txt 路径，也须与 masterEmitter 同口径。
        const parse = text => {
          const copy = text.match(/▸[^\n]*Pivot Offset[^\n]*\n\(X=([-\d.]+),Y=([-\d.]+)\)/);
          if (copy) return [+copy[1], +copy[2]];
          const readable = text.match(/独立 Pivot Offset 模块[^\n]*?Pivot Offset\s*=\s*\(([-\d.]+),\s*([-\d.]+)\)/);
          return readable ? [+readable[1], +readable[2]] : null;
        };
        const evidence = [];
        for (const bounds of [[-4, 4, -2, 2], [-4, 4, -4, 1], [-2, 6, -4, 1]]) {
          const q = structuredClone(P); q.sparkGraph.bounds = bounds;
          const meta = { ...graphPlan(q), lightKeys: [[0, 1], [1, 1]] }, bb = { P: q, form: 'loop', meta };
          const e = fwlLoop('GraphFramingContract', bb, M, false).emitters[0], internal = e.required.pivot_offset || [-.5, -.5];
          const wanted = [internal[0] + .5, internal[1] + .5], master = masterEmitter(bb, M), loop = cascadeText('GraphFramingContract', bb, M);
          const def = wanted.every(v => Math.abs(v) < 1e-4), gotMaster = parse(master), gotLoop = parse(loop);
          for (const [route, text, values] of [['masterEmitter', master, gotMaster], ['cascadeText(loop)', loop, gotLoop]]) {
            need(!/Screen Alignment\s*=\s*Square/.test(text), route + ' 把非方形固定序列写成 Square');
            if (def && !values) continue; // 不输出模块时，UE 默认面板(0,0)，与内部[-.5,-.5]一致。
            need(!!values, route + ' 缺少独立 Pivot Offset 模块的面板值');
            close(values[0], wanted[0], route + ' 面板 X 应为 JSON内部X+0.5', .0001);
            close(values[1], wanted[1], route + ' 面板 Y 应为 JSON内部Y+0.5', .0001);
            need(text.includes('面板值'), route + ' 没有区分面板值与 JSON内部值');
          }
          evidence.push({ bounds, internalPivot: internal, wantedPanel: wanted, masterPanel: gotMaster || [0, 0], loopPanel: gotLoop || [0, 0] });
        }
        return evidence;
      });
      const signature = e => fwlPlanSig([e]), mutate = fn => { const e = structuredClone(emitter); fn(e); return e; };
      for (const [id, fn] of [
        ['signature-size', e => { e.modules.find(m => m.m === 'InitialSize').StartSize.const[0] += 1; }],
        ['signature-location', e => { e.modules.find(m => m.m === 'InitialLocation').StartLocation.const[0] += 1; }],
        ['signature-pivot', e => { e.required.pivot_offset = [...(e.required.pivot_offset || [-.5, -.5])]; e.required.pivot_offset[0] += .01; }]
      ]) check(id, () => { const a = signature(emitter), z = signature(mutate(fn)); need(a !== z, '尺寸/位置/Pivot 变化未改变帧计划指纹'); return { before: a, after: z }; });
      check('signature-color-pixels-neutral', () => {
        const e = mutate(e => { e.material = 'another-pixel-and-ramp'; e.modules.find(m => m.m === 'ColorOverLife').ColorOverLife.curve[0][1][0] += 1; });
        equal(signature(e), signature(emitter), '像素和颜色不应改变几何帧计划指纹'); return { signature: signature(e) };
      });
      state.P = P; state.M = M; state.tab = 'single'; state.repId = ''; pview.q = ''; pview.changed = false; buildMasterPanel();
      for (let i = 0; i < 4; i++) check('ui-edge-' + i, () => {
        const key = 'sparkGraph.bounds.' + i, hit = panelRows.find(([row, it]) => Array.isArray(it) && it[0] === key);
        need(!!hit, '没有生成边界参数行'); const [row] = hit, g = row.closest('section.egrp'), d = row.closest('details.mod');
        need(g && g.dataset.g === '输出', '边界参数未归输出：' + (g && g.dataset.g)); need(d && d._mod === '取景', '边界参数未归取景模块：' + (d && d._mod));
        need(row._applies && !row._inert, '边界参数被隐藏/灰显'); return { key, label: row._lab, emitter: g.dataset.g, module: d._mod };
      });
      return { version: VERSION, checks, summary: { total: checks.length, pass: checks.filter(c => c.pass).length, fail: checks.filter(c => !c.pass).map(c => c.id) } };
    });
    report.pageErrors = errors;
    report.contractPass = report.result.checks.every(x => x.pass) && !errors.length;
    const knownBugs = ['asymmetric-plan', 'edge-left', 'cascade-nozzle-reconstruction', 'signature-size', 'signature-location', 'signature-pivot', 'ui-edge-0'];
    report.expectationPass = before ? report.result.version === '4.9.117' && knownBugs.every(id => report.result.checks.some(x => x.id === id && !x.pass)) && report.result.checks.some(x => x.id === 'symmetric-compatibility' && x.pass) && !errors.length : report.contractPass;
    console.log(JSON.stringify({ mode: report.mode, version: report.result.version, contractPass: report.contractPass, expectationPass: report.expectationPass, ...report.result.summary, report: out }, null, 2));
    if (!report.expectationPass) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { report.error = e.stack; process.exitCode = 1; console.error(e.message); }).finally(() => { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); });
