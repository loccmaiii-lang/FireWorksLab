"""我的效果变体：每档自动曝光 + 对照图（对话框新花型，用户 2026-10-07 00:59「我保存了的那几个效果也一起帮我多几个玉型大小变化与更多的造型变化，我都要拿来当素材」）。

  python analysis/scripts/变体对照.py --fx myv_fxmuuzfeg7 --out 目录 [--px 240]
读 analysis/原理/我的效果变体_清单.json 里这个效果的各档（原样 / 大小 / 造型），条目在 tool/data/review.js（条目_我的效果变体.json 生成）。
曝光：每层 autoExposure40（和「自动曝光」同一算法）×「原样」同一层的「手调 / 自动」比（你存的曝光是在自动值上调过的，各档保持同样的调法）；
      芯入多出来的芯层按第 1 层的比。原样不写（一个数不改）。
出：<目录>/曝光.json（{条目: 曝光}，另附 _auto / _k）、各档.jpg（每档一行、看得见的整段 12 / 30 / 50 / 75%，各自取景）、大小_同一比例.jpg（原样 + 各大小档，同一米数比例、整段 45% 处）、
    一览.jpg（每档一格，整段 35% 处，各自取景——发给用户看的那张）。
"""
import argparse, asyncio, base64, io, json, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'
LIST = ROOT / 'analysis' / '原理' / '我的效果变体_清单.json'
FR = [0.12, 0.3, 0.5, 0.75]     # 占「看得见的整段」（各层延迟 + 结尾：layerEndOf + 子花 / 爆裂，出点截住；不是序列时长——你存的 Crackle 时长 9.8 s，2.8 s 以后就没东西了）
CORE = 1.6
YCAP = 1.5

# 一档的层：单条目 = 自己；组合 = 每层条目 + 延迟 / 缩放
JS_TIER = r"""(id) => { const e = FW_REVIEW_LIST.find(x => x.id === id); if (!e) return null;
  if (e.kind !== 'combo') return { name: e.name, layers: [{ id: e.id, delay: 0, scale: 1 }] };
  return { name: e.name, layers: e.layerIds.map((lid, i) => ({ id: lid, delay: +(e.combo.layers[i] || {}).delay || 0, scale: +(e.combo.layers[i] || {}).scale || 1 })) }; }"""
JS_EXPO = r"""async (id) => { const { P } = replicaPM(id); const r = await autoExposure40(P); const sub = ['senrin', 'crossette'].includes(P.type);
  const R = sub ? reachOf(P.v0, P.vt, P.subDelay) + reachOf(P.subSpeed, +P.subVt > 0 ? +P.subVt : P.vt, P.subBurn) : (+P.burstR0 || 0) + reachOf(P.v0, P.vt, P.burn);
  const life = (+P.sparkLife || 0) * Math.max(1, +P.sparkLifeEnd || 1), head = (+P.ignDelay || 0) * (1 + (+P.ignJit || 0) / 100) + (+P.burn || 0) + Math.max(0, +P.afterBurn || 0);
  let end = Math.max(layerEndOf(P), sub ? +P.subDelay + +P.subBurn + (+P.sparkRate > 0 ? life : 0) : 0, +P.crackle > 0 ? head + (+P.crackleDelay || 0.3) * 1.7 + (+P.crackleLife || 0.07) : 0);
  if (+P.cutOut > 0) end = Math.min(end, +P.cutOut); end = Math.min(end, +P.duration);
  return { auto: r.value, cur: +P.exposure || null, dur: +P.duration, end, R }; }"""
JS_STILLS = r"""async (a) => { const layers = a.layers.map(L => { const { P, M } = replicaPM(L.id); if (a.expo[L.id]) P.exposure = a.expo[L.id]; return { P, M, delay: L.delay, scale: L.scale, headInt: M.headInt != null ? +M.headInt : 1 }; });
  return (await mtRenderLayers(layers, { times: a.times, px: a.px, half: a.half || undefined, cy: a.half ? -a.half * 0.1 : undefined })).map(x => ({ t: x.t, png: x.png })); }"""


def font(sz):
    from PIL import ImageFont
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'):
        if pathlib.Path(fp).exists(): return ImageFont.truetype(fp, sz)
    return ImageFont.load_default()


async def run(a):
    from browser_runtime import launch_async, verify_renderer
    from playwright.async_api import async_playwright
    from PIL import Image, ImageDraw
    fx = next(x for x in json.loads(LIST.read_text(encoding='utf-8')) if x['key'] == a.fx)
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    png = lambda s: Image.open(io.BytesIO(base64.b64decode(s.split(',', 1)[1]))).convert('RGB')
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page(viewport={'width': 1000, 'height': 800})
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof replicaPM === "function" && typeof mtRenderLayers === "function"', timeout=0)
        ren = verify_renderer(await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()"))
        await pg.evaluate('state.stillBusy = true')
        tiers = []
        for t in fx['tiers']:
            d = await pg.evaluate(JS_TIER, t['id'])
            if not d: raise RuntimeError('找不到条目 ' + t['id'])
            tiers.append(dict(t, **d))
        info = {}
        for t in tiers:
            for L in t['layers']: info[L['id']] = await pg.evaluate(JS_EXPO, L['id'])
        o = tiers[0]; assert o['label'] == '原样'
        k0 = [(info[L['id']]['cur'] / info[L['id']]['auto']) if info[L['id']]['cur'] and info[L['id']]['auto'] else 1 for L in o['layers']]
        ex, fb = {}, []
        for t in tiers[1:]:
            for i, L in enumerate(t['layers']):
                k = k0[i] if i < len(k0) else CORE     # 芯入多出来的芯层：自动 × 1.6（不跟你主花的手调比——那是给长尾调的；自动曝光把无尾芯压得和长尾主花一样暗，芯就看不见）
                if t['id'].endswith('-Y') and k > YCAP: k = YCAP     # 柳：尾长、星挤，你原来给这一层的「比自动亮 n 倍」照搬会过曝成白团
                au = info[L['id']]['auto']
                if au is None:     # 自动曝光量不到亮部（闪烁层几个取样时刻正好都在灭的那一拍）：用原样同一层的自动值
                    oid = o['layers'][min(i, len(o['layers']) - 1)]['id']; au = info[oid]['auto']; fb.append(L['id'])
                    if au is None: continue
                ex[L['id']] = round(au * k, 4)
        for t in tiers:
            print(t['id'], t['label'], [(L['id'], (round(info[L['id']]['auto'], 4) if info[L['id']]['auto'] is not None else None), info[L['id']]['cur'], '→', ex.get(L['id'])) for L in t['layers']], flush=True)
        (out / '曝光.json').write_text(json.dumps({**ex, '_auto': {i: v['auto'] for i, v in info.items()}, '_k': k0, '_fallback': fb, '_renderer': ren}, ensure_ascii=False, indent=1), encoding='utf-8')
        dur = {t['id']: max(L['delay'] + info[L['id']]['end'] for L in t['layers']) for t in tiers}
        R = {t['id']: max(info[L['id']]['R'] * L['scale'] for L in t['layers']) for t in tiers}
        own, one = {}, {}
        for t in tiers:
            r = await pg.evaluate(JS_STILLS, {'layers': t['layers'], 'expo': ex, 'px': a.px, 'times': [round(f * dur[t['id']], 3) for f in FR + [0.35]], 'half': R[t['id']] * 1.22})     # 各自取景（算上起始半径 burstR0；mtRenderLayers 自己的取景不算它）
            one[t['id']] = min(r, key=lambda x: abs(x['t'] - 0.35 * dur[t['id']]))     # mtRenderLayers 按时刻排好返回：挑出 35% 那张，其余 4 张是 FR
            own[t['id']] = [x for x in sorted(r, key=lambda x: x['t']) if x is not one[t['id']]][:len(FR)]
            print('定帧', t['id'], flush=True)
        sz = [t for t in tiers if t['label'] == '原样' or t['id'].split('-')[-1].startswith('S')]
        half = max(R[t['id']] for t in sz) * 1.25
        same = {t['id']: (await pg.evaluate(JS_STILLS, {'layers': t['layers'], 'expo': ex, 'px': a.px, 'times': [round(0.45 * dur[t['id']], 3)], 'half': half}))[0] for t in sz}
        await b.close()
    ft, px = font(14), a.px
    sh = Image.new('RGB', (200 + px * len(FR), 30 + px * len(tiers)), (10, 11, 15)); g = ImageDraw.Draw(sh)
    for j, f in enumerate(FR): g.text((200 + j * px + 6, 6), f'整段 {f:.0%}', fill=(233, 180, 95), font=ft)
    for r_, t in enumerate(tiers):
        g.text((6, 30 + r_ * px + px // 2 - 34), f"{t['label']}\n{t['id']} · {len(t['layers'])} 层\n直径 {2 * R[t['id']]:.0f} m · {dur[t['id']]:.1f} s", fill=(220, 210, 180), font=ft)
        for j, x in enumerate(own[t['id']]): sh.paste(png(x['png']), (200 + j * px, 30 + r_ * px))
    sh.save(out / '各档.jpg', quality=86)
    W = px * len(sz); sh2 = Image.new('RGB', (W, px + 50), (10, 11, 15)); g2 = ImageDraw.Draw(sh2)
    for j, t in enumerate(sz):
        sh2.paste(png(same[t['id']]['png']), (j * px, 0)); g2.text((j * px + 6, px + 6), f"{t['label']} · {2 * R[t['id']]:.0f} m", fill=(220, 210, 180), font=ft)
    g2.text((6, px + 28), f'同一比例：画面半宽 {half:.0f} m、各自整段 45% 处', fill=(150, 150, 150), font=ft)
    sh2.save(out / '大小_同一比例.jpg', quality=86)
    cols = 5; rows = (len(tiers) + cols - 1) // cols
    sh3 = Image.new('RGB', (px * cols, (px + 26) * rows + 34), (10, 11, 15)); g3 = ImageDraw.Draw(sh3)
    g3.text((8, 8), f"{fx['name']} · 大小与造型（各自取景，整段 35% 处）", fill=(233, 180, 95), font=ft)
    for i, t in enumerate(tiers):
        x0, y0 = (i % cols) * px, 34 + (i // cols) * (px + 26)
        sh3.paste(png(one[t['id']]['png']), (x0, y0)); g3.text((x0 + 6, y0 + px + 4), f"{t['label']} · {2 * R[t['id']]:.0f} m · {dur[t['id']]:.1f} s", fill=(220, 210, 180), font=ft)
    sh3.save(out / '一览.jpg', quality=86)
    print('→', out)
    return 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--fx', required=True); ap.add_argument('--out', required=True); ap.add_argument('--px', type=int, default=240)
    raise SystemExit(asyncio.run(run(ap.parse_args())))
