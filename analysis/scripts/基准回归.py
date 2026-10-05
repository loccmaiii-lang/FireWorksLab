#!/usr/bin/env python3
"""基准回归（协作/标准.md 第 3 节「每次改底层都要跑回归」、第 5 节基准条目）：同一配方在「改前 / 改后」两个烘焙器里
出同一帧，逐像素比；再比帧计划（帧数、每帧时刻、取景）——帧计划一样、定帧一样，烘出来的贴图就一样（烘焙和定帧走同一个渲染核）。

基准：花型库 菊 / 牡丹 / 锦冠 / 千轮 / 点灭（4.0 默认参数）+ 正式库 金芒菊（效果 jinmangju 打开后的参数）。
  python3 analysis/scripts/基准回归.py --old 旧版.html [--new tool/FireworkBaker.html] [--out 目录]
  旧版：git worktree add /tmp/x <提交> && python3 /tmp/x/tool/build.py
输出：基准回归.json / .md + 每个基准一张「改前 | 改后 | 差 ×8」对照图。不一样的列出最大差和不一样的像素比例；退出码 0 = 全部逐像素相同。
"""
import argparse, asyncio, base64, io, json, pathlib, re, sys
import numpy as np
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from browser_runtime import launch_async

ROOT = pathlib.Path(__file__).resolve().parents[2]
AT = None
TEMPLATES = ['kiku', 'botan', 'kamuro', 'senrin', 'strobe', 'crackle']
FR = {'crackle': [0.12, 0.53, 0.6]}    # 4.3：爆裂星的小闪在熄灭后 0.1–0.6 s（约 0.5–0.68 T），默认时刻抓不到
FAKE = re.search(r'FAKE = r"""(.*?)"""', (ROOT / 'analysis' / 'scripts' / '界面状态检查.py').read_text(encoding='utf-8'), re.S).group(1)
RUN = r"""async (a) => {
  let P, M;
  if (a.type) { const d = defaultsFor(a.type, 40); P = derive({ ...structuredClone(d.P), type: a.type }); M = structuredClone(d.M); }
  else { P = derive(structuredClone(state.P)); M = structuredClone(state.M); }
  const fm = measure(P), pl = plan(P, fm), T = P.duration, times = a.at ? a.at.filter(t => t < T) : a.fr.map(f => +(f * T).toFixed(3));     // --at：按开花后同一秒比（序列时长改了时，按比例取的时刻不是同一时刻）
  const sig = JSON.stringify({ F: pl.L.F, cols: pl.L.cols, rows: pl.L.rows, times: pl.times.map(x => +x.toFixed(5)), keys: pl.keys, HX: +pl.HX.toFixed(4), HY: +pl.HY.toFixed(4), fm: [fm.x0, fm.x1, fm.y0, fm.y1].map(x => +x.toFixed(4)) });
  const st = await renderStills40(P, M, { times, px: a.px, plan: pl });
  return { sig, times, png: st.map(s => s.png), ver: VERSION };
}"""


def img(u): return np.asarray(Image.open(io.BytesIO(base64.b64decode(u.split(',', 1)[1]))).convert('RGB'), dtype=np.int16)


async def render(html, cases, px, fr):
    from playwright.async_api import async_playwright
    out = {}
    async with async_playwright() as p:
        b = await launch_async(p)
        for name, kind in cases:
            pg = await (await b.new_context(viewport={'width': 1200, 'height': 800})).new_page()
            await pg.add_init_script("window.requestAnimationFrame = () => 0;")
            await pg.goto(pathlib.Path(html).resolve().as_uri() + '?fast', wait_until='load', timeout=0)
            await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            await pg.evaluate(FAKE)
            if kind == 'effect':
                await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openEffect(EFFS().find(e => e.key === {json.dumps(name)}))).finally(() => window.__opening = false); return 0; }})()")
                for _ in range(80):
                    await pg.wait_for_timeout(250)
                    if await pg.evaluate("!window.__opening && !state.baking"): break
                out[name] = await pg.evaluate(RUN, {'px': px, 'fr': fr, 'at': AT})
            else: out[name] = await pg.evaluate(RUN, {'type': name, 'px': px, 'fr': FR.get(name, fr), 'at': AT})
            print(' ', pathlib.Path(html).name, name, out[name]['ver'], flush=True)
            await pg.context.close()
        await b.close()
    return out


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--old', required=True); ap.add_argument('--new', default=str(ROOT / 'tool' / 'FireworkBaker.html'))
    ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '基准回归')); ap.add_argument('--px', type=int, default=256); ap.add_argument('--only', default=''); ap.add_argument('--at', default='', help='开花后几秒，逗号分隔（例 0.6,1.6,2.6）；不给就按序列时长的比例取')
    a = ap.parse_args(); out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    global AT; AT = [float(x) for x in a.at.split(',') if x.strip()] or None
    cases = [(t, 'type') for t in TEMPLATES] + [('jinmangju', 'effect')]
    if a.only: cases = [c for c in cases if c[0] in a.only.split(',')]
    fr = [0.12, 0.35, 0.7]
    old = asyncio.run(render(a.old, cases, a.px, fr)); new = asyncio.run(render(a.new, cases, a.px, fr))
    rows, ok = [], True
    for name, _ in cases:
        o, n = old[name], new[name]; diffs = []
        for t, uo, un in zip(n['times'], o['png'], n['png']):
            A, B = img(uo), img(un); d = np.abs(A - B)
            diffs.append({'t': t, 'max': int(d.max()), 'frac': round(float((d.max(axis=2) > 0).mean()), 5)})
            Image.fromarray(np.concatenate([A, B, np.clip(d * 8, 0, 255)], axis=1).astype(np.uint8)).save(out / f'{name}_{t:.2f}s.png')
        same = o['sig'] == n['sig'] and all(x['max'] == 0 for x in diffs); ok &= same
        rows.append({'name': name, 'old': o['ver'], 'new': n['ver'], 'planSame': o['sig'] == n['sig'], 'stills': diffs, 'same': same})
        print(('✅' if same else '❌'), name, '帧计划' + ('相同' if o['sig'] == n['sig'] else '不同'), json.dumps(diffs, ensure_ascii=False), flush=True)
    (out / '基准回归.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    L = [f"# 基准回归：{rows[0]['old']} → {rows[0]['new']}", '', '同一配方、同一取景，改前 / 改后出同一帧（定帧，和烘焙同一个渲染核），逐像素比；帧计划（帧数、每帧时刻、取景）也比。', '',
         '| 基准 | 帧计划 | 定帧（时刻：最大差 / 不一样的像素比例） | 结论 |', '| --- | --- | --- | --- |']
    for r in rows: L.append(f"| {r['name']} | {'相同' if r['planSame'] else '**不同**'} | " + '；'.join(f"{x['t']} s：{x['max']} / {x['frac']}" for x in r['stills']) + f" | {'逐像素相同' if r['same'] else '**有变化**'} |")
    (out / '基准回归.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
    sys.exit(0 if ok else 1)


main()
