#!/usr/bin/env python3
"""实时显卡负担（对话框15，2026-10-03；用户 18:59「笔记本上放大还是会一顿一顿」）

4.2.22 以后实时模拟的 CPU 已经很轻（云端打桩量：金芒菊每帧 JS 0.8 ms、鸿巢 3 ms），剩下的是显卡。
「放大」= F / 双击画布进专注模式：画布变大（最多 2048），单层实时模拟还要再乘超采样（最多 4096），
填充量跟着画布面积涨，而现在的显卡预算只按粒子数算。这个脚本在真显卡上把一帧拆开量：

  每个效果 × 每种画布（正常 / 专注 1.5 倍屏 / 专注 2 倍屏）× 几个时刻：
    · 快门子样本 不压 / 8 / 4 / 2 / 1 时，这一帧的显卡毫秒（EXT_disjoint_timer_query_webgl2；没有就用 readPixels 同步后的墙钟）
    · 同一帧不画粒子（只剩清屏、底光、打包、上色、后期这几遍全屏）的显卡毫秒 = 固定开销
    · 这一帧画了多少粒子、画布 / 超采样画布多大
  再按用户实际的样子（自动按负担调子样本，rAF 驱动）播 2.5 秒，记帧间隔中位 / 90%。

用法：python3 analysis/scripts/实时显卡负担.py [--out 目录] [--effects jinmangju,hongchao] [--configs normal,focus15,focus2] [--quick]
本机任务：{"type": "smoke", "fuhe": true}（可选 "fuhe_effects": "jinmangju,hongchao"）。云端软件渲染只能 --quick 自测代码路径，数值不算数。
输出：<out>/实时显卡负担.json、实时显卡负担.md
"""
import argparse, asyncio, json, os, pathlib, sys, time
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from browser_runtime import launch_async
ROOT = HERE.parents[1]
HTML = (ROOT / 'tool' / 'FireworkBaker.html').as_uri()
_src = (HERE / '界面状态检查.py').read_text(encoding='utf-8'); _i = _src.index('FAKE = r"""') + len('FAKE = r"""'); FAKE = _src[_i:_src.index('"""', _i)]   # --quick 用假烘焙（云端软件渲染真烘焙要十几分钟）

CONFIGS = {   # 名字：视口、设备像素比、是否专注模式（F）
    'normal': ({'width': 1440, 'height': 900}, 1, False),
    'focus15': ({'width': 1920, 'height': 1080}, 1.5, True),
    'focus2': ({'width': 1920, 'height': 1080}, 2, True),
}
IDLE = "!window.__opening && !state.baking && (!state.dirty || state.failedGen === state.gen) && !(state.layerQueue && state.layerQueue.size) && $('#busy').hidden"

# 一帧的显卡时间：cap = 0 不压 / n 个子样本；noP = 不画粒子（固定开销）
MEASURE = r"""async ({ times, caps, K }) => {
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const oCap = liveCapFor, oDraw = drawParticleBatch; let parts = 0;
  const px = new Uint8Array(4);
  const sync = () => { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let now = 1e6; lastT = now;
  const frame = () => { now += 1000 / 60; loop(now); };
  async function one(t, cap, noP) {
    liveCapFor = w => { liveCtl.lastCap = 0; liveCtl.lastFull = 0; return cap; };
    drawParticleBatch = noP ? (() => {}) : ((n, m) => { parts += n; return oDraw(n, m); });
    state.t = t; frame(); frame(); sync();                       // 预热（换了子样本数，目标纹理可能重建）
    parts = 0; const qs = []; let cpu = 0;
    const w0 = performance.now();
    for (let i = 0; i < K; i++) {
      let q = null; if (ext) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
      const c0 = performance.now(); frame(); cpu += performance.now() - c0;
      if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); qs.push(q); }
    }
    sync(); const wall = (performance.now() - w0) / K;
    let gpu = null;
    if (ext && qs.length) {
      for (let k = 0; k < 200 && !gl.getQueryParameter(qs[qs.length - 1], gl.QUERY_RESULT_AVAILABLE); k++) await wait(10);
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      const ns = qs.map(q => gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) ? gl.getQueryParameter(q, gl.QUERY_RESULT) : null).filter(x => x != null);
      qs.forEach(q => gl.deleteQuery(q));
      if (!disjoint && ns.length) { ns.sort((a, b) => a - b); gpu = +(ns[Math.floor(ns.length / 2)] / 1e6).toFixed(2); }
    }
    const capInfo = [liveCtl.lastCap, liveCtl.lastFull];
    return { cap, noP: !!noP, gpuMs: gpu, wallMs: +wall.toFixed(2), cpuMs: +(cpu / K).toFixed(2), partsM: +(parts / K / 1e6).toFixed(3), sub: capInfo };
  }
  const out = [];
  try {
    state.view = 'live'; state.playing = false; liveCtl.auto = true;
    for (const t of times) {
      for (const cap of caps) out.push({ t, ...(await one(t, cap, false)) });
      out.push({ t, ...(await one(t, 0, true)) });
    }
  } finally { liveCapFor = oCap; drawParticleBatch = oDraw; }
  const slot = Object.values(live).find(s => s && s.samples40);
  return { rows: out, timer: !!ext, canvas: [canvas.width, canvas.height], samples: slot ? [slot.samples40.w, slot.samples40.h] : null, dpr: devicePixelRatio,
           renderer: (() => { const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); })() };
}"""

# 用户实际的样子：rAF 驱动，自动按负担调子样本（liveCtl.auto），播 2.5 秒
PLAY = r"""new Promise(res => { liveCtl.auto = true; liveCtl.budget = 12e6; state.view = 'live'; state.playing = true; state.t = Math.min(1, curDuration() * .3);
  const ts = [], caps = []; let t0 = null;
  const f = now => { if (t0 == null) t0 = now; ts.push(now); caps.push(liveCtl.lastCap || liveCtl.lastFull);
    if (now - t0 < 4000) requestAnimationFrame(f); else { state.playing = false;
      const d = ts.slice(1).map((v, i) => v - ts[i]).filter((v, i) => ts[i] - t0 > 1500).sort((x, y) => x - y);       // 前 1.5 秒让预算适应
      res({ frames: d.length, medMs: d.length ? +d[Math.floor(d.length / 2)].toFixed(1) : null, p90Ms: d.length ? +d[Math.floor(d.length * .9)].toFixed(1) : null,
            maxMs: d.length ? +d[d.length - 1].toFixed(1) : null, budgetM: +(liveCtl.budget / 1e6).toFixed(1), subLast: [liveCtl.lastCap, liveCtl.lastFull] }); } };
  requestAnimationFrame(f); })"""


async def open_effect(pg, key, focus):
    await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openEffect(EFFS().find(e => e.key === {json.dumps(key)}))).finally(() => window.__opening = false); return 0; }})()")
    t0 = time.time()
    while time.time() - t0 < 300:
        await pg.wait_for_timeout(250)
        if await pg.evaluate(IDLE): break
    if focus:
        await pg.evaluate("(() => { if (panels.side || panels.right) toggleFocus(); return 0; })()")
        await pg.wait_for_timeout(600)
    return round(time.time() - t0, 1)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '实时显卡负担'))
    ap.add_argument('--effects', default='jinmangju,hongchao,hiki_nishiki,qingning')
    ap.add_argument('--configs', default='normal,focus15,focus2')
    ap.add_argument('--quick', action='store_true', help='云端自测：一个时刻、K=1、只 不压 / 2，不播放')
    a = ap.parse_args()
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    caps = [0, 2] if a.quick else [0, 8, 4, 2, 1]
    K = 1 if a.quick else 5
    from playwright.async_api import async_playwright
    res = []
    async with async_playwright() as p:
        b = await launch_async(p)
        try:
            for cfg in a.configs.split(','):
                vp, dpr, focus = CONFIGS[cfg]
                for key in a.effects.split(','):
                    ctx = await b.new_context(viewport=vp, device_scale_factor=dpr); pg = await ctx.new_page(); errs = []
                    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
                    if a.quick: await pg.add_init_script("window.requestAnimationFrame = () => 0;")     # 云端自测：不让页面自己的循环和软件渲染抢 CPU
                    try:
                        await pg.goto(HTML, wait_until='load', timeout=0)
                        await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
                        if a.quick: await pg.evaluate(FAKE + "; (() => { const o = drawParticleBatch; drawParticleBatch = (n, m) => o(Math.min(n, 2000), m); return 0; })()")   # 自测只验代码路径，每批最多画 2000 粒
                        openS = await open_effect(pg, key, focus)
                        play = None if a.quick else await pg.evaluate(PLAY)
                        await pg.evaluate("window.requestAnimationFrame = () => 0; 0"); await pg.wait_for_timeout(200)   # 停掉自己的循环，下面手动一帧一帧画
                        D = await pg.evaluate("curDuration()")
                        times = [round(D * 0.4, 2)] if a.quick else [round(D * f, 2) for f in (0.15, 0.4, 0.7)]
                        m = await pg.evaluate(MEASURE, {'times': times, 'caps': caps, 'K': K})
                        r = {'config': cfg, 'effect': key, 'openS': openS, 'play': play, **m, 'errors': errs[:3]}
                    except Exception as e:
                        r = {'config': cfg, 'effect': key, 'error': str(e)[:400], 'errors': errs[:3]}
                    finally:
                        await ctx.close()
                    res.append(r)
                    full = [x for x in r.get('rows', []) if x['cap'] == 0 and not x['noP']]
                    print(cfg, key, f"画布 {r.get('canvas')} 超采样 {r.get('samples')} 计时器 {r.get('timer')}",
                          '不压', [(x['t'], x['gpuMs'] if x['gpuMs'] is not None else x['wallMs'], x['partsM']) for x in full],
                          '播放', r.get('play'), r.get('error', ''), flush=True)
        finally:
            await b.close()
    (out / '实时显卡负担.json').write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
    md = ['# 实时显卡负担', '', f"显卡：{next((r.get('renderer') for r in res if r.get('renderer')), '?')}；计时：{'显卡计时器' if any(r.get('timer') for r in res) else 'readPixels 同步墙钟（含 CPU）'}", '',
          '每格：显卡 ms（粒子百万）。「无粒子」= 只剩全屏几遍的固定开销。播放 = 自动调子样本时的帧间隔 中位 / 90% / 最大 ms。', '']
    for r in res:
        if r.get('error'): md.append(f"- {r['config']} {r['effect']}：出错 {r['error']}"); continue
        md.append(f"## {r['effect']} · {r['config']}（画布 {r['canvas']}，超采样画布 {r['samples']}，打开 {r['openS']} s）")
        if r.get('play'): pl = r['play']; md.append(f"播放：{pl['medMs']} / {pl['p90Ms']} / {pl['maxMs']} ms，预算 {pl['budgetM']}M，最后子样本 {pl['subLast']}")
        caps_ = sorted({x['cap'] for x in r['rows'] if not x['noP']}, key=lambda c: (c != 0, -c))
        md += ['', '| 时刻 | ' + ' | '.join('不压' if c == 0 else f'{c} 子样本' for c in caps_) + ' | 无粒子 |', '|' + ' --- |' * (len(caps_) + 2)]
        for t in sorted({x['t'] for x in r['rows']}):
            row = {(x['cap'], x['noP']): x for x in r['rows'] if x['t'] == t}
            cell = lambda x: '—' if not x else f"{x['gpuMs'] if x['gpuMs'] is not None else x['wallMs']}（{x['partsM']}）"
            md.append(f"| {t} | " + ' | '.join(cell(row.get((c, False))) for c in caps_) + f" | {cell(row.get((0, True)))} |")
        md.append('')
    (out / '实时显卡负担.md').write_text('\n'.join(md), encoding='utf-8')
    print('→', out / '实时显卡负担.md')

asyncio.run(main())
