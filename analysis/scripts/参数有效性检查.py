#!/usr/bin/env python3
"""参数有效性检查（对话框2，2026-10-03；用户 12:27 #3「我改了别的燃烧时间就缩回去了」→ 查「拖了没反应」的参数）

对每个模板（空中类）和每个效果的每一层：把右栏里**此刻看得见**的每个参数单独拨一下（数值 +20% 量程，到顶就 −；下拉换下一个选项），
看它改没改到下面这些东西：

  曲线   4.2.18 曲线视图的六条里的五条（星头亮度 / 燃烧中的星 / 火花生成 / 新火花寿命 / 星速度）——模拟层面的效果
  导出   取景测量（measure）+ 帧计划（plan：帧数、格子、每帧时刻、Size By Life…）——只影响导出的参数
  画面   （--render，本机显卡跑）定帧渲染 4 个时刻的像素——只影响渲染的参数（火花大小、温度、尾迹外形…）

三样都没变 = 「拖了没反应」。只跑曲线 + 导出时，没变的只是「候选」（可能只影响画面），要 --render 才能定。
另外静态查一遍：源码里（10_types.js 以外）一次都没用到的参数键。

输出：analysis/probe/参数有效性/（或 --out）参数有效性.json + 参数有效性.md
  python3 analysis/scripts/参数有效性检查.py                # 云端：曲线 + 导出
  python3 analysis/scripts/参数有效性检查.py --render       # 本机：加画面
  --only kiku,hiki_nishiki   只跑这些模板 / 效果
"""
import argparse, asyncio, json, re, sys, time, pathlib, base64, io
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from browser_runtime import launch_async

ROOT = pathlib.Path(__file__).resolve().parents[2]
HTML = (ROOT / 'tool' / 'FireworkBaker.html').as_uri() + '?fast'
FAKE = re.search(r'FAKE = r"""(.*?)"""', (ROOT / 'analysis' / 'scripts' / '界面状态检查.py').read_text(encoding='utf-8'), re.S).group(1)

# 页面里：给一个 P（+ M）和它的上下文名，逐个拨参数，返回每个参数的 [曲线变了哪些, 导出变没变, 画面差]
PAGE = r"""async (o) => {
  const { ctx, render } = o, P0 = structuredClone(window.__cvP), M0 = structuredClone(window.__cvM || {});
  const lanes = ['light', 'lit', 'spark', 'life', 'speed'];
  const curves = async P => { const d = await curveCompute(P, 'x', () => true); const r = {}; for (const k of lanes) r[k] = Array.from(d[k].mid); return r; };
  // 和 bakeMaster 一样带上入点 / 出点
  const planSig = P => { try { const fm = measure(P), ci = usesTickPlan40(P) && +P.cutIn > 0 ? Math.min(+P.cutIn, P.duration - 1 / 30) : 0, co = usesTickPlan40(P) && +P.cutOut > ci ? Math.min(+P.cutOut, P.duration) : 0, pl = plan(P, fm, ci || 0, co || P.duration); const strip = x => JSON.stringify(x, (k, v) => typeof v === 'number' ? +v.toPrecision(6) : (k === 'ms' || k === 'bakeMs') ? undefined : v);
      return strip({ fm: [fm.x0, fm.x1, fm.y0, fm.y1], pl }); } catch (e) { return 'ERR ' + e.message; } };
  const diffCurves = (a, b) => { const ch = []; for (const k of lanes) { const x = a[k], y = b[k]; if (x.length !== y.length) { ch.push(k); continue; }
      let m = 0, d = 0; for (let i = 0; i < x.length; i++) { m = Math.max(m, Math.abs(x[i]), Math.abs(y[i])); d = Math.max(d, Math.abs(x[i] - y[i])); } if (d > 1e-3 * Math.max(1, m)) ch.push(k); } return ch; };
  const T = Math.max(0.2, +P0.duration || 3), times = [0.15, 0.35, 0.6, 0.85].map(f => +(f * T).toFixed(3));
  const bplan = render ? displayPlan40(derive(structuredClone(P0))) : null;
  const still = async P => (await renderStills40(P, M0, { times, px: 160, plan: bplan })).map(s => s.png);
  const b = { c: await curves(P0), p: planSig(P0), s: render ? await still(P0) : null };
  const stable = planSig(P0) === b.p;
  const out = [];
  for (const sec of SCHEMA) {
    if (sec.show && !sec.show(P0)) continue;
    for (const it of sec.items) {
      // 每个参数试两个值：拨 +20% 量程（到顶就 −），和量程另一头（一个值碰巧和现在的结果一样时，另一个能看出来）
      let k, vals = [], lab;
      if (Array.isArray(it)) {
        if (!itemVisible(it, P0)) continue;
        const [key, label, unit, mn, mx, st] = it; k = key; lab = typeof label === 'function' ? label(P0) : label;
        // 时间类（秒）量程常常远大于这个效果的时长（入点 / 出点 0–30 s）：按 min(量程, 时长) 拨，第二个值取时长的一半
        const v = +P0[k] || 0, step = +st || 0.01, sec = unit === 's', R = sec ? Math.min(mx - mn, T) : mx - mn, d = Math.max(step, R * 0.2), snap = x => +Math.min(mx, Math.max(mn, Math.round(x / step) * step)).toFixed(6);
        vals = [snap(v + d <= mx + 1e-9 ? v + d : v - d), sec ? snap(Math.abs(v - T / 2) > d / 2 ? T / 2 : T / 4) : snap(v - mn < mx - v ? mx : mn)];
      } else if (it.sel) {
        if (!itemVisible(it, P0)) continue;
        k = it.sel; lab = it.label; const cur = String(P0[k]), opts = it.options.map(x => String(x[0])), i = opts.indexOf(cur);
        vals = [opts[(i + 1) % opts.length], opts[(i + 2) % opts.length]].map(x => typeof P0[k] === 'number' ? +x : x);
      } else continue;
      vals = [...new Set(vals)].filter(x => String(x) !== String(P0[k]));
      if (!vals.length) continue;
      const r = { k, lab: String(lab).split('（')[0], sec: sec.sec, from: P0[k], to: vals, curve: [], plan: false, pix: null };
      try {
        for (const nv of vals) {
          const P = structuredClone(P0);
          if (k === 'shellNo') applyShellNo(P, nv); else P[k] = nv;
          derive(P);
          for (const c of diffCurves(b.c, await curves(P))) if (!r.curve.includes(c)) r.curve.push(c);
          if (r.curve.length && !render) break;          // 曲线变了就够了（帧计划要跑一遍完整测量，慢，只给曲线没变的参数算）
          r.plan = r.plan || (stable ? planSig(P) !== b.p : false);
          if (render) { const s = await still(P); const px = s.map((x, j) => x === b.s[j] ? 0 : 1); r.pix = r.pix ? r.pix.map((x, j) => x || px[j]) : px; if (px.some(Boolean)) r.png = s; }
          if (r.curve.length || r.plan || (r.pix && r.pix.some(Boolean))) break;   // 一个值有反应就够了
        }
      } catch (e) { r.err = String(e && e.message || e); }
      out.push(r);
    }
  }
  return { ctx, stable, n: out.length, rows: out, base: render ? b.s : null, times };
}"""


def pngdiff(a, b):
    """两张 dataURL PNG 的平均 / 最大像素差（0–255）；本机没装 PIL / numpy 时只报「变了」"""
    try:
        from PIL import Image
        import numpy as np
    except ImportError: return None
    ia = np.asarray(Image.open(io.BytesIO(base64.b64decode(a.split(',', 1)[1]))).convert('L'), dtype=np.float32)
    ib = np.asarray(Image.open(io.BytesIO(base64.b64decode(b.split(',', 1)[1]))).convert('L'), dtype=np.float32)
    d = np.abs(ia - ib); return float(d.mean()), float(d.max())


# 静态：每个键在哪些源码文件里被读到（10_types.js 是定义，79_curves.js 只是列出「哪个参数对应哪条曲线」，都不算）
RENDER_FILES = {'05_quality.js', '40_gl.js', '41_particles40.js', '48_render40.js', '49_playback.js', '80_render.js', '82_showcase.js', '85_stills.js'}
BAKE_FILES = {'50_bake.js', '60_export.js', '61_naming.js', '65_cascade.js', '66_fwlcascade.js', '67_fwlcombo.js'}


def static_files(keys):
    srcs = {p.name: p.read_text(encoding='utf-8') for p in sorted((ROOT / 'tool' / 'src' / 'js').glob('*.js')) if p.name not in ('10_types.js', '79_curves.js')}
    out = {}
    for k in keys:
        pat = re.compile(r"\.%s\b|['\"]%s['\"]" % (re.escape(k), re.escape(k)))
        out[k] = sorted(n for n, t in srcs.items() if pat.search(t))
    return out


async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '参数有效性'))
    ap.add_argument('--render', action='store_true'); ap.add_argument('--only', default=''); ap.add_argument('--html', default='')
    a = ap.parse_args(); only = set(x for x in a.only.split(',') if x)
    html = pathlib.Path(a.html).resolve().as_uri() + '?fast' if a.html else HTML
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    from playwright.async_api import async_playwright
    res, t0 = [], time.time()
    async with async_playwright() as p:
        b = await launch_async(p)
        ctx = await b.new_context(viewport={'width': 1280, 'height': 860}); pg = await ctx.new_page()
        await pg.add_init_script("window.requestAnimationFrame = () => 0;")
        await pg.goto(html, wait_until='load', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
        await pg.evaluate(FAKE)
        ver = await pg.evaluate('VERSION')
        # 上下文：空中类模板（默认参数）+ 每个效果的每一层（只要空中类）
        types = await pg.evaluate("Object.keys(TYPE_NAMES).filter(t => familyOf(t) === 'aerial')")
        effs = await pg.evaluate("EFFS().map(e => e.key)")
        jobs = [('模板', t) for t in types if not only or t in only] + [('效果', e) for e in effs if not only or e in only]
        for kind, key in jobs:
            if kind == '模板':
                ok = await pg.evaluate("(t) => { const d = defaultsFor(t, 40); window.__cvP = derive({ ...structuredClone(d.P), type: t }); window.__cvM = structuredClone(d.M); return usesTickPlan40(window.__cvP) || familyOf(t) === 'aerial'; }", key)
                ctxs = [(f'模板 {key}', None)] if ok else []
            else:
                await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openEffect(EFFS().find(e => e.key === {json.dumps(key)}))).finally(() => window.__opening = false); return 0; }})()")
                for _ in range(120):
                    if await pg.evaluate("!window.__opening && !state.baking"): break
                    await pg.wait_for_timeout(250)
                n = await pg.evaluate("state.tab === 'combo' ? state.layers.length : 1")
                ctxs = [(f'效果 {key}' + (f' 第 {i + 1} 层' if n > 1 else ''), i if n > 1 else None) for i in range(n)]
            for name, li in ctxs:
                if kind == '效果':
                    fam = await pg.evaluate("(i) => { const L = i == null ? null : state.layers[i], e = L && layerEntryOf(L), P = e ? e.P : state.P; window.__cvP = structuredClone(P); window.__cvM = structuredClone(L || state.M); return familyOf(P.type) + '/' + P.form; }", li)
                    if not fam.startswith('aerial/') or fam.endswith('/phys'): print('⏭', name, fam, flush=True); continue
                t1 = time.time()
                try: r = await pg.evaluate(PAGE, {'ctx': name, 'render': a.render})
                except Exception as e: print('❌', name, str(e)[:300], flush=True); res.append({'ctx': name, 'err': str(e)[:500]}); continue
                if a.render:
                    for row in r['rows']:
                        if row.get('png'): row['pixd'] = [pngdiff(x, y) for x, y in zip(r['base'], row['png'])]
                        row.pop('png', None)
                    r.pop('base', None)
                dead = [x['k'] for x in r['rows'] if not x.get('err') and not x['curve'] and not x['plan'] and (not a.render or not any(x.get('pix') or []))]
                print(f"{name}：{r['n']} 个参数，没反应{'' if a.render else '（候选）'} {len(dead)}：{' '.join(dead)}（{time.time() - t1:.0f} s）", flush=True)
                res.append(r)
        await b.close()
    summarize(res, a.render, ver, round((time.time() - t0) / 60, 1), out)


def summarize(res, render, ver, minutes, out):
    """按参数汇总，写 参数有效性.json / .md"""
    keys = sorted({x['k'] for r in res for x in r.get('rows', [])})
    files = static_files(keys)
    agg = {}
    for r in res:
        for x in r.get('rows', []):
            g = agg.setdefault(x['k'], {'k': x['k'], 'lab': x['lab'], 'sec': x['sec'], 'n': 0, 'dead': [], 'curve': set(), 'plan': 0, 'pix': 0, 'err': []})
            g['n'] += 1
            if x.get('err'): g['err'].append(r['ctx']); continue
            g['curve'].update(x['curve']); g['plan'] += bool(x['plan']); g['pix'] += bool(any(x.get('pix') or []))
            if not x['curve'] and not x['plan'] and (not render or not any(x.get('pix') or [])): g['dead'].append(r['ctx'])
    rows = []
    for g in agg.values():
        g['curve'] = sorted(g['curve']); fs = files.get(g['k'], []); g['files'] = fs
        where = '只在画面' if fs and set(fs) <= RENDER_FILES else '只在烘焙 / 导出' if fs and set(fs) <= BAKE_FILES else '只在画面 / 烘焙' if fs and set(fs) <= RENDER_FILES | BAKE_FILES else ''
        g['where'] = where
        if not fs: g['kind'] = '源码里没用到'
        elif not g['dead']: g['kind'] = '有反应'
        elif not render and where: g['kind'] = f'没比（{where}用到，要 --render / 烘焙才看得出）'
        else: g['kind'] = '到处都没反应' if len(g['dead']) == g['n'] else '部分没反应'
        rows.append(g)
    order = {'源码里没用到': 0, '到处都没反应': 1, '部分没反应': 2, '有反应': 9}
    order = lambda k, o=order: o.get(k, 5)
    rows.sort(key=lambda g: (order(g['kind']), g['sec'], g['k']))
    meta = {'version': ver, 'render': render, 'minutes': minutes, 'contexts': [r['ctx'] for r in res], 'unstable_plan': [r['ctx'] for r in res if r.get('stable') is False]}
    (out / '参数有效性.json').write_text(json.dumps({'meta': meta, 'params': rows, 'raw': res}, ensure_ascii=False, indent=1), encoding='utf-8')
    L = [f"# 参数有效性检查（烘焙器 {ver}，{'曲线 + 导出 + 画面' if render else '曲线 + 导出；没变的只是候选，要 --render 才能定'}）", '',
         f"上下文 {len(res)} 个（空中类模板默认参数 + 每个效果的每一层），{meta['minutes']} 分钟。每个参数单独拨 +20% 量程（下拉换下一项），只拨右栏此刻看得见的。", '',
         '| 结论 | 参数 | 节 | 键 | 试了 | 没反应的上下文 | 改到的曲线 | 改到导出 | 改到画面 | 源码里用到它的文件 |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
    for g in rows:
        if g['kind'] == '有反应': continue
        dl = '、'.join(g['dead'][:6]) + (f" 等 {len(g['dead'])} 个" if len(g['dead']) > 6 else '')
        L.append(f"| {g['kind']} | {g['lab']} | {g['sec']} | `{g['k']}` | {g['n']} | {dl} | {' '.join(g['curve']) or '—'} | {g['plan']} | {g['pix'] if render else '没比'} | {' '.join(x.replace('.js', '') for x in g['files'])} |")
    L += ['', f"有反应的参数 {sum(g['kind'] == '有反应' for g in rows)} 个（见 json）。"]
    (out / '参数有效性.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
    print('写好：', out / '参数有效性.md', flush=True)




def merge(dirs, out):
    """把分开跑的几份（--out 不同目录）并成一份"""
    res, mins, ver, render = [], 0, '', False
    for d in dirs:
        j = json.loads((pathlib.Path(d) / '参数有效性.json').read_text(encoding='utf-8'))
        res += j['raw']; mins += j['meta']['minutes']; ver = j['meta']['version']; render = j['meta']['render']
    out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True); summarize(res, render, ver, round(mins, 1), out)


if '--merge' in sys.argv:
    k = sys.argv.index('--merge'); merge(sys.argv[k + 1].split(','), sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else str(ROOT / 'analysis' / 'probe' / '参数有效性'))
else:
    asyncio.run(main())
