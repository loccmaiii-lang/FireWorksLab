"""回放流畅度测量：在真浏览器（本机显卡）里打开一个条目，量「引擎回放」「贴图流转」播放时每一帧的耗时、30 Hz tick 推进、换帧节奏，
以及后台烘焙时的干扰。只读：不导出、不改存档（用临时浏览器配置）。

用法：python analysis/scripts/回放流畅度测量.py --id mt:kiraShin [--id type:glitter ...] [--sec 6] [--out 目录]
  id：mt:<多层模板> / type:<花型模板> / rv:<条目>
输出：<out>/回放流畅度.json（每个条目、每个视图一组数）
判读：
  - 帧间隔（ms）：60 Hz 显示器正常 ≈ 16.7；> 25 = 掉了一个刷新，> 50 = 肉眼可见的顿；
  - loop 耗时：主循环 JS + 提交 GL 的时间；
  - tick 跳：两次画面之间引擎时钟跳了 ≥ 2 个 tick（= 有 tick 没被画出来）；
  - 换帧间隔：每层贴图实际换帧的 tick 间隔，和帧计划（pl.dur）比，看浏览器有没有额外打乱节奏。
"""
import argparse, asyncio, json, pathlib, sys, time
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from browser_runtime import launch_async, verify_renderer
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'

PROBE = r"""
() => {
  if (window.__flow) return;
  const rec = window.__flow = { on: false, rows: [] };
  const orig = window.loop;
  window.loop = function (now) {
    const a = performance.now();
    orig(now);
    if (!rec.on) return;
    const t = state.t, tk = Math.floor(t * 30 + 1e-8);
    let fr = null;
    try {
      if (state.tab === 'combo') fr = state.layers.map(L => { const e = state.lib.find(x => x.name === L.lib); if (!e || !e.bake) return -2;
        const age0 = (engineTick(t) - (L.delay || 0)) * (L.rate || 1), b = segAt(e.bake, age0); return frameIdx(b.meta, age0 - (b.meta.t0 || 0)) + 1000 * bakeParts(e.bake).indexOf(b); });
      else if (state.bake) { const b = segAt(state.bake, engineTick(t)); fr = [frameIdx(b.meta, engineTick(t) - (b.meta.t0 || 0)) + 1000 * bakeParts(state.bake).indexOf(b)]; }
    } catch (e) { fr = null; }
    rec.rows.push([now, performance.now() - a, tk, fr, state.baking || !!(state.layerQueue && state.layerQueue.size) || !!(state.layerRefine && state.layerRefine.size)]);
  };
}
"""

def stats(rows):
    if len(rows) < 3: return {}
    iv = [b[0] - a[0] for a, b in zip(rows, rows[1:])]
    lp = sorted(r[1] for r in rows)
    q = lambda xs, p: xs[min(len(xs) - 1, int(p * len(xs)))]
    ivs = sorted(iv)
    jumps = sum(1 for a, b in zip(rows, rows[1:]) if b[2] - a[2] >= 2 and b[2] > a[2])
    repeats = sum(1 for a, b in zip(rows, rows[1:]) if b[2] == a[2])     # 同一个 tick 画了两次（显示刷新 < 60 Hz 时和 30 Hz tick 拍频）
    secs = max(1e-6, (rows[-1][0] - rows[0][0]) / 1000)
    # 每层换帧的 tick 间隔序列
    lay = []
    if rows[0][3]:
        for i in range(len(rows[0][3])):
            ch = []; prev = None
            for r in rows:
                f = r[3][i] if r[3] and i < len(r[3]) else None
                if f is None or f < 0: prev = None; continue
                if prev is not None and f != prev[0]: ch.append(r[2])
                prev = (f, r[2])
            lay.append([b - a for a, b in zip(ch, ch[1:]) if b > a])
    return {'frames': len(rows), 'interval_ms': {'mean': round(sum(iv) / len(iv), 2), 'p50': round(q(ivs, .5), 2), 'p95': round(q(ivs, .95), 2), 'max': round(ivs[-1], 1),
            'over25': sum(1 for x in iv if x > 25), 'over50': sum(1 for x in iv if x > 50)},
            'loop_ms': {'p50': round(q(lp, .5), 2), 'p95': round(q(lp, .95), 2), 'max': round(lp[-1], 1)},
            'tick_skips': jumps, 'tick_repeats': repeats, 'tick_repeats_per_s': round(repeats / secs, 2), 'present_hz': round((len(rows) - 1) / secs, 1), 'baking_frames': sum(1 for r in rows if r[4]), 'layer_change_ticks': [''.join(str(min(g, 9)) for g in L) for L in lay]}


async def measure(pg, sec, label):
    await pg.evaluate('() => { __flow.rows = []; state.t = 0; state.playing = true; state.speed = 1; state.loopPlay = true; __flow.on = true; }')
    await asyncio.sleep(sec)
    rows = await pg.evaluate('() => { __flow.on = false; const r = __flow.rows; __flow.rows = []; return r; }')
    s = stats(rows); s['view'] = label
    print(f"  {label}: {s.get('frames')} 帧 · 帧间隔 p50 {s['interval_ms']['p50']} / p95 {s['interval_ms']['p95']} / max {s['interval_ms']['max']} ms · >25ms {s['interval_ms']['over25']} · >50ms {s['interval_ms']['over50']} · loop p95 {s['loop_ms']['p95']} ms · tick 跳 {s['tick_skips']} · 同一 tick 重画 {s['tick_repeats_per_s']}/s（显示 {s['present_hz']} Hz）· 烘焙中 {s['baking_frames']} 帧", flush=True)
    return s


async def main(a):
    from playwright.async_api import async_playwright
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    res = {'refresh_hint': '60 Hz（Win32_VideoController，2026-10-11）', 'items': []}
    async with async_playwright() as p:
        b = await launch_async(p)
        ctx = await b.new_context(viewport={'width': 1600, 'height': 960})
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=1', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof MULTI_TYPES !== "undefined" && document.querySelector("#libBody .li, #libBody .tile")', timeout=0)
        res['renderer'] = verify_renderer(await pg.evaluate("document.querySelector('#gpu') ? document.querySelector('#gpu').title : ''"))
        res['version'] = await pg.evaluate('VERSION')
        await pg.evaluate(PROBE)
        idle = '() => window.__fw.idle() && document.querySelector("#busy").hidden && !state.baking && !(state.layerQueue && state.layerQueue.size) && !(state.layerRefine && state.layerRefine.size) && !state.refineDue'
        for id in a.id:
            print(id, flush=True); it = {'id': id}
            t0 = time.time()
            if id.startswith('mt:'): await pg.evaluate(f'openMultiType("{id[3:]}")')
            elif id.startswith('type:'): await pg.evaluate(f'openType("{id[5:]}")')
            else: await pg.evaluate(f'(() => {{ const e = FW_REVIEW_LIST.find(x => x.id === "{id[3:]}"); return openReview(e); }})()')
            # 打开后马上播：这段是「边烘边播」（打开模板时你看到的）
            await pg.evaluate('() => { state.view = "export"; state.disp = "fit"; }')
            it['while_baking'] = await measure(pg, a.sec, '引擎回放 · 打开后边烘边播')
            for _ in range(2400):
                if await pg.evaluate(idle): break
                await asyncio.sleep(0.5)
            it['open_to_idle_s'] = round(time.time() - t0, 1)
            print(f'  打开到全部烘完：{it["open_to_idle_s"]} s', flush=True)
            it['plan'] = await pg.evaluate('''() => (state.tab === 'combo' ? state.layers.map(L => state.lib.find(x => x.name === L.lib)).map(e => e && e.bake) : [state.bake]).map(b => b ? bakeParts(b).map(s => ({ F: s.meta.L.F, keys: (s.meta.keys || []).length, size: (s.meta.sizeKeys || []).length, dur: (s.meta.dur || []).map(d => Math.round(d * 30)).join('') })) : null)''')
            await pg.evaluate('() => { state.view = "export"; state.disp = "fit"; }')
            it['export'] = await measure(pg, a.sec, '引擎回放 · 烘完')
            await pg.evaluate('() => { state.view = "atlas"; if (state.tab === "combo") state.comboSel = 1; }')
            it['atlas'] = await measure(pg, a.sec, '贴图流转 · 烘完')
            await pg.evaluate('() => { state.view = "export"; }')
            res['items'].append(it)
        res['errors'] = errs
        await b.close()
    (out / '回放流畅度.json').write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
    print('写入', out / '回放流畅度.json')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', action='append', default=[])
    ap.add_argument('--sec', type=float, default=6)
    ap.add_argument('--out', default=str(ROOT / 'analysis/probe/帧号点数_2026-10-11'))
    a = ap.parse_args()
    if not a.id: a.id = ['mt:kiraShin']
    asyncio.run(main(a))
