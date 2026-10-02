"""尾迹粗细 / 梭形检查（4.2.8，用户 10-02 19:41 #4：「粗细调整与尾尖头部也尖」，20:04 确认是梭形）

先写检查再改（标准.md 第 3 节）。查四件事：
  1. 参数在：BASE 有 tailWidth / tailPinchHead / tailPinchTail / tailBellyAt，右栏「尾迹外形」有这几项；
  2. 默认不变：显式写上默认值 和 不写，定帧逐像素相同（已通过的效果不受影响）；
  3. 粗细：tailWidth 0.5 变细、2 变粗；
  4. 梭形：两头收尖时，靠星头那段、尾端那段都比中段细。
测法：菊的星排成一个正对镜头的环（pattern ring、tilt 0、12 颗、长尾），每条尾迹都在画面平面里、沿半径方向，
半径就对应「沿尾迹的位置」（外 = 星头，里 = 尾端）。每个半径圈里按角度统计亮度，(Σ亮度)² / Σ亮度² = 亮的角度格数（等效宽度）；
同一配方、同一种子、同一取景（都用默认那张的取景），只改外形参数，「改后 ÷ 改前」就是这一段变粗 / 变细的倍数。

用法：python3 analysis/scripts/尾迹粗细检查.py [--t 1.6] [--px 384] [--out 目录]
"""
import argparse, base64, io, json, pathlib, sys
import numpy as np
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from browser_runtime import chromium_options

ROOT = pathlib.Path(__file__).resolve().parents[2]
KEYS = ['tailWidth', 'tailPinchHead', 'tailPinchTail', 'tailBellyAt']
RING = {'pattern': 'ring', 'tilt': 0, 'stars': 12, 'sparkLife': 1.5, 'sparkSpread': 4}
SCHEMA_JS = r"""() => { const sec = SCHEMA.find(s => s.sec === '尾迹外形'), ids = sec ? sec.items.map(x => Array.isArray(x) ? x[0] : x.sel || x.id) : [];
  return { base: %s.map(k => [k, BASE[k]]), inSection: %s.filter(k => ids.includes(k)) }; }""" % (json.dumps(KEYS), json.dumps(KEYS))
VIEW = r"""(a) => { const d = defaultsFor('kiku', 40), P = derive({ ...d.P, ...a.over }); return frameView40(displayPlan40(P), a.t); }"""
STILL = r"""(a) => { const d = defaultsFor('kiku', 40); const P = derive({ ...d.P, ...a.over });
  return __fw.renderStills(P, d.M, { times: [a.t], px: a.px, cx: a.view[0], cy: a.view[1], half: a.view[2] }); }"""


def gray(r):
    s = np.asarray(Image.open(io.BytesIO(base64.b64decode(r[0]['png'].split(',')[1]))).convert('RGB'), dtype=np.float64).mean(2)
    return np.clip(s - np.median(s, axis=1, keepdims=True) - 3, 0, None)       # 去掉背景渐变（每行中位数）


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--t', type=float, default=1.6); ap.add_argument('--px', type=int, default=384); ap.add_argument('--out', default='')
    a = ap.parse_args(); fails = []; rep = {'t': a.t, 'px': a.px, 'layout': RING}
    from playwright.sync_api import sync_playwright
    shots = {}
    with sync_playwright() as pw:
        br = pw.chromium.launch(**chromium_options()); pg = br.new_page()
        pg.goto((ROOT / 'tool' / 'FireworkBaker.html').as_uri() + '?fast', timeout=0, wait_until='domcontentloaded')
        pg.wait_for_function('window.__fw && (!window.__fw.idle || window.__fw.idle())', timeout=0)
        sc = pg.evaluate(SCHEMA_JS); rep['schema'] = sc; print('参数：', sc, flush=True)
        if any(v is None for _, v in sc['base']): fails.append('BASE 缺参数：' + ', '.join(k for k, v in sc['base'] if v is None))
        if len(sc['inSection']) != len(KEYS): fails.append('右栏「尾迹外形」缺：' + ', '.join(k for k in KEYS if k not in sc['inSection']))
        if not fails:
            view = pg.evaluate(VIEW, {'over': RING, 't': a.t}); rep['view'] = view
            for name, over in [('默认', {}), ('写明默认', dict(sc['base'])), ('细 0.5', {'tailWidth': 0.5}), ('粗 2', {'tailWidth': 2}),
                               ('两头尖', {'tailPinchHead': 1, 'tailPinchTail': 1})]:
                shots[name] = gray(pg.evaluate(STILL, {'t': a.t, 'px': a.px, 'view': view, 'over': {**RING, **over}})); print('渲染', name, flush=True)
        br.close()
    if shots:
        A = shots['默认']; d0 = float(np.abs(shots['写明默认'] - A).max()); rep['默认差'] = d0
        if d0 != 0: fails.append(f'写明默认值后画面变了（最大像素差 {d0}）')
        h, w = A.shape; ys, xs = np.nonzero(A > 10); wt = A[ys, xs]; c = ((xs * wt).sum() / wt.sum(), (ys * wt).sum() / wt.sum())
        Y, X = np.mgrid[0:h, 0:w]; r = np.hypot(X - c[0], Y - c[1]); th = np.arctan2(Y - c[1], X - c[0])
        rh = float(np.percentile(np.hypot(xs - c[0], ys - c[1]), 97))       # 星头所在半径
        edges = np.arange(rh * .3, rh * .95, max(6.0, rh * .05))

        def width(img):
            out = []
            for lo in edges:
                m = (r >= lo) & (r < lo + max(6.0, rh * .05))
                hist = np.bincount(((th[m] + np.pi) / (2 * np.pi) * 1440).astype(int) % 1440, weights=img[m], minlength=1440)
                out.append(hist.sum() ** 2 / max(1e-9, (hist ** 2).sum()))
            return np.array(out)
        base = width(A); rep['半径圈（÷ 星头半径，里 = 尾端 → 外 = 星头）'] = [round(x / rh, 2) for x in edges]
        for k in ('细 0.5', '粗 2', '两头尖'): rep[k] = [round(float(x), 3) for x in width(shots[k]) / np.maximum(base, 1e-9)]
        n = len(edges); mid = slice(n // 4, n - n // 4)
        thin, thick = float(np.median(rep['细 0.5'][mid])), float(np.median(rep['粗 2'][mid]))
        if not thin < 0.85: fails.append(f'tailWidth 0.5 没变细（中段等效宽度 ×{thin:.2f}）')
        if not thick > 1.15: fails.append(f'tailWidth 2 没变粗（中段等效宽度 ×{thick:.2f}）')
        s = np.convolve(rep['两头尖'], np.ones(3) / 3, mode='valid')       # 三圈平滑（12 条线，单圈有噪声）
        tail, head, body = float(s[0]), float(s[-1]), float(s[1:-1].max())
        rep['梭形'] = {'尾端': round(tail, 3), '中段最粗': round(body, 3), '靠星头': round(head, 3)}
        if not (tail < body * 0.85 and head < body * 0.85): fails.append(f'两头尖：两头没有明显比中段细（尾端 ×{tail:.2f}、中段 ×{body:.2f}、星头 ×{head:.2f}）')
        if a.out:
            o = pathlib.Path(a.out); o.mkdir(parents=True, exist_ok=True)
            row = np.concatenate([shots[k] for k in ('默认', '细 0.5', '粗 2', '两头尖')], 1)
            Image.fromarray(np.clip(row * 1.6, 0, 255).astype(np.uint8)).save(o / '尾迹粗细_默认_细_粗_两头尖.png')
    rep['fails'] = fails; rep['pass'] = not fails
    print(json.dumps(rep, ensure_ascii=False))
    if a.out: (pathlib.Path(a.out) / '尾迹粗细检查.json').write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding='utf-8')
    print('✅ 通过' if not fails else '❌ ' + '；'.join(fails)); sys.exit(0 if not fails else 1)


main()
