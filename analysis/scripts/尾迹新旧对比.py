"""4.9.16「老火花先暗」逐个查（对话框新花型；用户 10-06 17:57「老火花先暗这些逐个查你也给本机派个任务执行，不要在云端算了」）。

4.7.0（5.0 第 2 步）起火花按实际年龄冷却：越老越暗、越红（亮度 = 温度发光，T = T0 ×（1 − 冷却 × 年龄 / 寿命））。
以前的模板是在旧模型上调的，长尾可能被「老火花先暗」吃短。这里把带尾的模板在新旧两个烘焙器里、同一取景、开花后同一秒各出一帧，排在一起看：
  · 多层花型模板（mt:）：旧版有的（第一批）新旧并排；每个都加一行「不冷却」（冷却 = 0，只作诊断：尾迹长度是被冷却吃掉的还是本来寿命就短）
  · 花型模板（type:）带尾的：新旧并排（花型模板归对话框15，这里只报告，不改）
指标：每帧亮像素（> 40/255）面积、按半径分 10 圈的亮度，尾长 ≈ 亮度降到星头圈 10% 的那一圈。结果 <out>/尾迹对比.md / .json + 每项一张对照图。

用法（本机任务）：python analysis/scripts/尾迹新旧对比.py --old 旧版.html --out 目录 [--only mt:shinKiku,type:kiku]
  旧版：run_jobs.py script 任务里写 {git:263888a^:tool/FireworkBaker.html}（4.7.0 之前最后一版）
"""
import argparse, asyncio, base64, io, json, pathlib, sys, time
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'
TIMES = [0.4, 0.8, 1.3, 1.9, 2.6, 3.4]      # 开花后秒数（新旧同一秒）

JS_LIST = r"""
() => {
  const out = [];
  for (const r of MULTI_TYPES) { const L = mtLayers(r.id); if (L.some(l => +l.P.sparkRate > 0)) out.push({ key: 'mt:' + r.id, name: r.name, tail: L.filter(l => +l.P.sparkRate > 0).map(l => l.title) }); }
  for (const [g, ts] of TYPE_GROUPS) for (const t of ts) { if (familyOf(t) !== 'aerial') continue; const d = defaultsFor(t, 40); if (+d.P.sparkRate > 0) out.push({ key: 'type:' + t, name: TYPE_NAMES[t], tail: ['星的火花'] }); }
  return out;
}
"""
# 一帧：多层用 mtRenderStills（每层自己的曝光、显示强度）；花型模板用 renderStills40，取景由调用方给（新旧同一取景）
JS_ONE = r"""
async (a) => {
  const k = a.key, kind = k.slice(0, k.indexOf(':')), ref = k.slice(k.indexOf(':') + 1);
  const reach = P => ['senrin', 'crossette'].includes(P.type) ? reachOf(P.v0, P.vt, P.subDelay) + reachOf(P.subSpeed, +P.subVt > 0 ? +P.subVt : P.vt, P.subBurn) : reachOf(P.v0, P.vt, P.burn);
  let res, R, info;
  if (kind === 'mt') {
    if (typeof MULTI_BY_ID === 'undefined' || !MULTI_BY_ID[ref]) return { missing: true };
    const L = mtLayers(ref); R = a.R || Math.max(...L.map(l => reach(l.P)));
    info = L.map(l => ({ t: l.title, cooling: l.P.cooling, life: l.P.sparkLife, rate: l.P.sparkRate, T0: l.P.T0, dur: l.P.duration, E: l.P.exposure }));
    if (a.nocool || a.coolf != null) {     // 不冷却（诊断）/ 冷却 × coolf（4.9.17 扫描：只改带火花的层）
      if (typeof mtRenderLayers !== 'function') return { missing: true };
      res = await mtRenderLayers(L.map(l => !(+l.P.sparkRate > 0) ? l : ({ ...l, P: derive({ ...l.P, cooling: a.nocool ? 0 : l.P.cooling * a.coolf }) })), { times: a.times, px: a.px, half: R * 1.3, cy: -R * 0.15 });
    } else res = await mtRenderStills(ref, { times: a.times, px: a.px, half: R * 1.3, cy: -R * 0.15 });
  } else {
    if (!TYPES[ref]) return { missing: true };
    const d = defaultsFor(ref, 40), P0 = structuredClone(d.P), P = derive({ ...P0, type: ref, ...(a.nocool ? { cooling: 0 } : a.coolf != null ? { cooling: P0.cooling * a.coolf } : {}) }); R = a.R || reach(P);
    info = [{ t: TYPE_NAMES[ref], cooling: P.cooling, life: P.sparkLife, rate: P.sparkRate, T0: P.T0, dur: P.duration, E: P.exposure }];
    res = await renderStills40(P, d.M, { times: a.times.filter(t => t < P.duration), px: a.px, half: R * 1.3, cx: 0, cy: -R * 0.15 });
  }
  return { R, ver: VERSION, info, frames: res.map(x => ({ t: x.t, png: x.png })) };
}
"""


def font(sz):
    from PIL import ImageFont
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'):
        if pathlib.Path(fp).exists(): return ImageFont.truetype(fp, sz)
    return ImageFont.load_default()


def measure(im):
    """亮像素面积（> 40/255）、按半径 10 圈的平均亮度、尾长（亮度降到最亮圈 10% 的最外一圈 / 10）"""
    import numpy as np
    a = np.asarray(im.convert('L'), dtype=np.float32) / 255; h, w = a.shape
    yy, xx = np.mgrid[0:h, 0:w]; cy, cx = h / 2 - h * 0.15 / 2.6, w / 2      # 取景中心在爆点下 0.15 R（画面半宽 1.3 R）→ 爆点在画面中心偏上
    r = np.hypot(xx - cx, yy - cy) / (w / 2)
    prof = [float(a[(r >= i / 10) & (r < (i + 1) / 10)].mean()) if ((r >= i / 10) & (r < (i + 1) / 10)).any() else 0 for i in range(10)]
    pk = max(prof) or 1e-9; reach = max([i + 1 for i, v in enumerate(prof) if v >= 0.1 * pk] or [0]) / 10
    return {'area': round(float((a > 40 / 255).mean()), 4), 'mean': round(float(a.mean()), 4), 'prof': [round(v, 4) for v in prof], 'reach': reach}


async def run(a):
    from browser_runtime import launch_async, verify_renderer
    from playwright.async_api import async_playwright
    from PIL import Image, ImageDraw
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    only = set(x for x in (a.only or '').split(',') if x)
    png = lambda s: Image.open(io.BytesIO(base64.b64decode(s.split(',', 1)[1]))).convert('RGB')
    rec = {'说明': '新 = 当前烘焙器；旧 = --old；不冷却 = 新烘焙器里冷却设 0（只作诊断）。时刻 = 开花后秒数，取景新旧相同（半宽 1.3 × 新版熄灭半径）', 'old': str(a.old), 'items': {}}
    async with async_playwright() as p:
        b = await launch_async(p)
        pages = {}
        for tag, html in (('新', HTML), ('旧', pathlib.Path(a.old))):
            pg = await b.new_page(viewport={'width': 1000, 'height': 800})
            await pg.goto(html.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
            await pg.wait_for_function('window.__fw && typeof renderStills40 === "function"', timeout=0)
            pages[tag] = pg
        rec['renderer'] = verify_renderer(await pages['新'].evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()"))
        rec['ver'] = {t: await pg.evaluate('VERSION') for t, pg in pages.items()}
        items = [x for x in await pages['新'].evaluate(JS_LIST) if not only or x['key'] in only]
        if a.cool_scan:
            await scan(a, pages, items, out, png, rec); await b.close(); return 0
        print(f"新 {rec['ver']['新']} / 旧 {rec['ver']['旧']} · {len(items)} 项", flush=True)
        ft = font(14)
        for n, it in enumerate(items):
            t0 = time.time(); rows = {}
            try:
                new = await pages['新'].evaluate(JS_ONE, {'key': it['key'], 'times': TIMES, 'px': a.px})
                rows['新'] = new
                rows['旧'] = await pages['旧'].evaluate(JS_ONE, {'key': it['key'], 'times': TIMES, 'px': a.px, 'R': new['R']})
                rows['不冷却'] = await pages['新'].evaluate(JS_ONE, {'key': it['key'], 'times': TIMES, 'px': a.px, 'R': new['R'], 'nocool': True})
            except Exception as e:
                rec['items'][it['key']] = {**it, 'error': str(e).splitlines()[0][:300]}; print(f"[{n + 1}] {it['key']} ❌ {e}", flush=True); continue
            got = {k: v for k, v in rows.items() if v and not v.get('missing')}
            meas = {k: {f"{fr['t']:.2f}": measure(png(fr['png'])) for fr in v['frames']} for k, v in got.items()}
            # 对照图：每行一个版本，每列一个时刻
            px = a.px; sh = Image.new('RGB', (110 + px * len(TIMES), 30 + px * len(got)), (10, 11, 15)); g = ImageDraw.Draw(sh)
            for j, t in enumerate(TIMES): g.text((110 + j * px + 6, 6), f'开花后 {t:.1f} s', fill=(233, 180, 95), font=ft)
            for r_, (k, v) in enumerate(got.items()):
                g.text((6, 30 + r_ * px + px // 2 - 20), f"{k}\n{v['ver']}", fill=(220, 210, 180), font=ft)
                for fr in v['frames']:
                    j = min(range(len(TIMES)), key=lambda q: abs(TIMES[q] - fr['t'])); sh.paste(png(fr['png']), (110 + j * px, 30 + r_ * px))
                    m = meas[k][f"{fr['t']:.2f}"]; g.text((110 + j * px + 4, 30 + r_ * px + px - 18), f"面积 {m['area']:.3f} · 尾到 {m['reach']:.1f}R", fill=(160, 160, 160), font=ft)
            fn = it['key'].replace(':', '_') + '.jpg'; sh.save(out / fn, quality=86)
            ratio = {}
            if '旧' in meas:
                for t in meas['新']:
                    if t in meas['旧'] and meas['旧'][t]['area'] > 0: ratio[t] = round(meas['新'][t]['area'] / meas['旧'][t]['area'], 2)
            rec['items'][it['key']] = {**it, 'file': fn, 'info': {k: v['info'] for k, v in got.items()}, 'measure': meas, '新/旧面积': ratio}
            print(f"[{n + 1}/{len(items)}] {it['key']} {it['name']} · 新/旧面积 {ratio or '（旧版没有）'} · {time.time() - t0:.0f}s", flush=True)
        await b.close()
    (out / '尾迹对比.json').write_text(json.dumps(rec, ensure_ascii=False, indent=1), encoding='utf-8')
    md = [f"# 尾迹新旧对比（{rec['ver']['新']} 对 {rec['ver']['旧']}）\n", rec['说明'] + '\n', '| 项 | 带尾的层 | 新/旧亮面积（各时刻） | 新版冷却 / 火花寿命 | 图 |', '| --- | --- | --- | --- | --- |']
    for k, v in rec['items'].items():
        if v.get('error'): md.append(f"| {v['name']} (`{k}`) | — | ❌ {v['error']} | — | — |"); continue
        inf = v['info'].get('新', [])
        md.append(f"| {v['name']} (`{k}`) | {'、'.join(v['tail'])} | {' · '.join(f'{t}s {r}' for t, r in v['新/旧面积'].items()) or '旧版没有'} | "
                  f"{' / '.join(str(x.get('cooling')) + '·' + str(x.get('life')) for x in inf if (x.get('rate') or 0) > 0)} | {v['file']} |")
    (out / '尾迹对比.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print('→', out / '尾迹对比.md', flush=True)
    return 0


async def scan(a, pages, items, out, png, rec):
    """4.9.17：冷却 × 几个倍数，量新 / 旧亮面积比（开花后 0.8 s 起、旧版面积 > 0.002 的时刻取平均），插值出比值 = 1 的倍数"""
    fs = [float(x) for x in a.cool_scan.split(',')]; res = {}
    for it in items:
        old = await pages['旧'].evaluate(JS_ONE, {'key': it['key'], 'times': TIMES, 'px': a.px})
        if not old or old.get('missing'): continue
        mo = {f"{fr['t']:.2f}": measure(png(fr['png']))['area'] for fr in old['frames']}
        row = {}
        for f in fs:
            new = await pages['新'].evaluate(JS_ONE, {'key': it['key'], 'times': TIMES, 'px': a.px, 'R': old['R'], 'coolf': f})
            mn = {f"{fr['t']:.2f}": measure(png(fr['png']))['area'] for fr in new['frames']}
            rs = [mn[t] / mo[t] for t in mn if t in mo and float(t) >= 0.8 and mo[t] > 0.002]
            row[f] = round(sum(rs) / len(rs), 3) if rs else None
        pts = sorted((f, r) for f, r in row.items() if r is not None)
        best = None
        for (f1, r1), (f2, r2) in zip(pts, pts[1:]):     # 冷却越小越亮：比值随倍数下降，找跨过 1 的那段线性插值
            if (r1 - 1) * (r2 - 1) <= 0 and r1 != r2: best = round(f1 + (1 - r1) * (f2 - f1) / (r2 - r1), 3); break
        if best is None and pts: best = min(pts, key=lambda x: abs(x[1] - 1))[0]
        res[it['key']] = {'name': it['name'], '倍数→新/旧面积': row, '比值=1 的倍数': best, 'cooling': [x.get('cooling') for x in (old.get('info') or [])]}
        print(f"{it['key']} {it['name']} {row} → {best}", flush=True)
    rec['scan'] = res
    (out / '冷却扫描.json').write_text(json.dumps(rec, ensure_ascii=False, indent=1), encoding='utf-8')
    md = ['# 冷却倍数扫描（新版冷却 × 倍数，对旧版 4.6.0 的亮面积比）', '', '| 项 | ' + ' | '.join(f'× {f}' for f in fs) + ' | 比值 = 1 的倍数 |', '|' + ' --- |' * (len(fs) + 2)]
    for k, v in res.items(): md.append(f"| {v['name']} (`{k}`) | " + ' | '.join(str(v['倍数→新/旧面积'].get(f)) for f in fs) + f" | {v['比值=1 的倍数']} |")
    (out / '冷却扫描.md').write_text('\n'.join(md) + '\n', encoding='utf-8'); print('→', out / '冷却扫描.md', flush=True)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--old', required=True); ap.add_argument('--out', required=True); ap.add_argument('--only'); ap.add_argument('--px', type=int, default=300)
    ap.add_argument('--cool-scan', help='4.9.17：冷却倍数（逗号分开），只量面积比、不出对照图，写 冷却扫描.json / .md')
    raise SystemExit(asyncio.run(run(ap.parse_args())))
