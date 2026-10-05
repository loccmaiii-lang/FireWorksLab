"""多层花型模板（tool/src/js/18_multitypes.js）的曝光、定帧总表、参数表（4.5.5，对话框新花型）

用法：
  python3 analysis/scripts/多层模板.py --expo            # 每层贴图曝光（燃烧中段 99.8% 分位 → 0.93，全程过曝 ≤ 1.5%；口径见 JS_EXPO），写进 MT_EXPOSURE
  python3 analysis/scripts/多层模板.py [id ...] [--out 目录] [--px 360]
                                                     # 每个模板 4 个时刻的定帧（所有层画在同一画面，实时模拟口径），拼成 <out>/多层模板总表.jpg
  python3 analysis/scripts/多层模板.py --table           # 打印原理文档第 5 节的每层参数表（Markdown）
  --ref 图片 --ref-id yaeshin --ref-t 1.3              # 参考图和某个模板的某一时刻并排（只测量对照，不进素材）

改了 18_multitypes.js 要先 python3 tool/build.py。云端是软件渲染，一个模板几十秒。
"""
import argparse, asyncio, base64, io, json, pathlib, re, sys, time
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from browser_runtime import launch_async, verify_renderer
from PIL import Image, ImageDraw, ImageFont
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'
SRC = ROOT / 'tool' / 'src' / 'js' / '18_multitypes.js'
FRACS = [0.12, 0.4, 0.7, 0.92]      # 燃烧时间的比例：刚开 / 展开 / 变色后 / 将灭

JS_EXPO = r"""
async (id) => {
  // 每层贴图曝光（4.5.5）：芯物要看的是「全开的同心球」（参考图那一刻），所以按燃烧中段（45 / 60 / 75%）最亮那帧的 99.8% 分位 → 0.93 定，
  // 再按回放检查的过曝口径（每帧顶到 250/255 的像素 ≤ 格子 2%）在全程 10 个时刻核一遍，超了就降到 1.5% 以内。
  // （花型库 autoExposure40 按「最亮一刻」定：多层里开花头几帧星挤在中间最亮，按它定后段太暗——花型库的菊也是人工 ×3。）
  const out = [], busy = state.stillBusy; state.stillBusy = true;     // 让出画布：不然每个 nextTick 都在画实时模拟，慢十几倍
  try {
    for (const l of mtLayers(id)) {
      const P = { ...derive({ ...l.P }), flash: 0, subFlash: 0 }, pl = displayPlan40(P), q = qualityOf(P), w = pl.L.cellW, h = pl.L.cellH, T = P.burn;
      const R = makeRenderer(P, 'burst'), samples = new Target(w * q.ss, h * q.ss, gl.RGBA16F), cell = new Target(w, h, gl.RGBA16F), a = new Float32Array(w * h * 4), frames = [];
      try {
        for (const f of [.02, .05, .1, .2, .3, .45, .6, .75, .9, .98]) {
          renderCell40(P, pl, R, (pl.t0 || 0) + f * T, samples, cell); cell.bind(); gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, a);
          const v = new Float32Array(w * h); for (let k = 0; k < v.length; k++) v[k] = a[4 * k] + a[4 * k + 1];
          const lit = Array.from(v.filter(x => x > 1e-5)).sort((x, y) => x - y);
          frames.push({ f, v, p998: lit.length ? lit[Math.min(lit.length - 1, Math.floor(lit.length * .998))] : 0 }); await nextTick();
        }
      } finally { samples.dispose(); cell.dispose(); R.dispose(); }
      const mid = Math.max(...frames.filter(x => x.f >= .45 && x.f <= .75).map(x => x.p998));
      let E = mid > 0 ? -Math.log(1 - .93) / mid : 1;
      const satAt = E => Math.max(...frames.map(x => { let n = 0; const th = -Math.log(1 - 250 / 255) / E; for (const y of x.v) if (y >= th) n++; return n / x.v.length; }));
      while (satAt(E) > .015 && E > 1e-3) E *= .9;
      out.push({ E: +(E < 1 ? E.toFixed(3) : E.toFixed(2)), sat: +(satAt(E) * 100).toFixed(2) });
    }
  } finally { state.stillBusy = busy; }
  return out; }
"""
JS_TABLE = r"""
() => MULTI_TYPES.map(r => ({ id: r.id, name: r.name, layers: mtLayers(r.id).map(l => ({ title: l.title, type: TYPE_NAMES[l.type].replace(/（.*）/, ''), stars: l.P.stars,
  R: +reachOf(l.P.v0, l.P.vt, l.P.burn).toFixed(0), v0: l.P.v0, vt: l.P.vt, burn: l.P.burn, head: l.P.headSize, tail: l.P.sparkRate > 0 ? (l.P.sparkStop > 0 ? '前 ' + l.P.sparkStop + ' s 带尾' : '炭火尾') : '无尾',
  stages: l.M.stages.map(s => (s[0] ? s[0] + ' s ' : '') + s[1]).join(' → '), hi: l.headInt, E: l.P.exposure, out: l.out ? l.out.pc : 'seq' })) }))
"""
JS_STILLS = r"""
async (a) => { const r = MULTI_BY_ID[a.id], L = mtLayers(a.id), T = L[0].P.burn;
  const res = await mtRenderStills(a.id, { times: a.times || a.fracs.map(f => f * T), px: a.px });
  return { name: r.name, n: L.length, burn: T, expo: L.map(l => l.P.exposure), v0: L.map(l => l.P.v0), times: res.map(x => x.t), pngs: res.map(x => x.png) }; }
"""


def font(sz):
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'):
        if pathlib.Path(fp).exists(): return ImageFont.truetype(fp, sz)
    return ImageFont.load_default()


def png(s): return Image.open(io.BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGB')


async def main(a):
    from playwright.async_api import async_playwright
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await launch_async(p)
        pg = await b.new_page(viewport={'width': 1200, 'height': 900})
        await pg.goto(HTML.resolve().as_uri() + '?fast', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof MULTI_TYPES !== "undefined"', timeout=0)
        verify_renderer(await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()"))
        ids = a.ids or await pg.evaluate('MULTI_TYPES.map(r => r.id)')
        if a.table:     # 原理文档第 5 节的表（数值以 18_multitypes.js 为准）
            for r in await pg.evaluate(JS_TABLE):
                print(f"\n**{r['name']}**（`mt:{r['id']}`）\n\n| 层 | 花型 | 星数 | 熄灭半径 m | 初速 / 终端 m/s | 燃烧 s | 星头 m | 尾 | 颜色（Color Over Life） | 显示强度 | 贴图曝光 | PC 导出 |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
                for l in r['layers']: print(f"| {l['title']} | {l['type']} | {l['stars']} | {l['R']} | {l['v0']} / {l['vt']} | {l['burn']} | {l['head']} | {l['tail']} | {l['stages']} | {l['hi']} | {l['E']} | {'GPU 光点' if l['out'] == 'dots' else '序列'} |")
            await b.close(); return
        if a.expo:
            ex = {}
            for i in ids:
                t0 = time.time(); r = await pg.evaluate(JS_EXPO, i); ex[i] = [x['E'] for x in r]; print(i, ex[i], '最大过曝 %', [x['sat'] for x in r], f'{time.time() - t0:.0f}s', flush=True)
            s = SRC.read_text(encoding='utf-8')
            cur = {}
            m = re.search(r'const MT_EXPOSURE = (\{.*?\});', s)
            if m:
                try: cur = json.loads(m.group(1))
                except Exception: cur = {}
            cur.update(ex)
            s = re.sub(r'const MT_EXPOSURE = \{.*?\};', 'const MT_EXPOSURE = ' + json.dumps(cur, ensure_ascii=False, separators=(', ', ': ')) + ';', s, count=1)
            SRC.write_text(s, encoding='utf-8'); print('曝光已写入', SRC, '（要重新 build）')
            await b.close(); return
        res = {}
        for i in ids:
            t0 = time.time(); r = await pg.evaluate(JS_STILLS, {'id': i, 'fracs': FRACS, 'px': a.px})
            r['ims'] = [png(s) for s in r['pngs']]; res[i] = r
            for k, im in enumerate(r['ims']): im.save(out / f'{i}_{k}.png')
            print(i, r['name'], r['n'], '层', 'v0', r['v0'], '曝光', r['expo'], f'{time.time() - t0:.0f}s', flush=True)
        if a.ref:
            r = await pg.evaluate(JS_STILLS, {'id': a.ref_id, 'times': [a.ref_t], 'fracs': [], 'px': a.px})
            ref = Image.open(a.ref).convert('RGB'); h = a.px; ref = ref.resize((round(ref.width * h / ref.height), h))
            im = png(r['pngs'][0]); sheet = Image.new('RGB', (ref.width + h + 12, h + 30), (10, 11, 15)); sheet.paste(ref, (0, 30)); sheet.paste(im, (ref.width + 12, 30))
            g = ImageDraw.Draw(sheet); f = font(16); g.text((6, 6), '参考图', fill=(233, 180, 95), font=f); g.text((ref.width + 18, 6), f"{r['name']} · 开花后 {a.ref_t:.2f} s（实时模拟口径）", fill=(233, 180, 95), font=f)
            sheet.save(out / f'参考对照_{a.ref_id}.jpg', quality=90); print('→', out / f'参考对照_{a.ref_id}.jpg')
        await b.close()
    if not res: return
    px = a.px; f = font(16); W = 170 + px * len(FRACS); sheet = Image.new('RGB', (W, 28 + px * len(res)), (10, 11, 15)); g = ImageDraw.Draw(sheet)
    for k, fr in enumerate(FRACS): g.text((170 + k * px + 6, 4), f'燃烧 {fr:.0%}', fill=(233, 180, 95), font=f)
    for r_, (i, v) in enumerate(res.items()):
        g.text((6, 28 + r_ * px + px // 2 - 30), f"{v['name']}\n{i} · {v['n']} 层\n燃烧 {v['burn']} s", fill=(220, 210, 180), font=f)
        for k, im in enumerate(v['ims']): sheet.paste(im, (170 + k * px, 28 + r_ * px))
    sheet.save(out / '多层模板总表.jpg', quality=88); print('→', out / '多层模板总表.jpg')
    # 缩略图不再用渲染图（用户 10-05 20:43）：左栏 / 花型库是 19_thumbsvg.js 按参数现画的示意图


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('ids', nargs='*')
    ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '多层模板')); ap.add_argument('--px', type=int, default=360)
    ap.add_argument('--expo', action='store_true'); ap.add_argument('--table', action='store_true')
    ap.add_argument('--ref'); ap.add_argument('--ref-id', default='yaeshin'); ap.add_argument('--ref-t', type=float, default=1.3)
    asyncio.run(main(ap.parse_args()))
