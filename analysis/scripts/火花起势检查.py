"""火花起势检查（4.2.17，用户 10-03 12:59「按你说的加一个通用能力（火花起势）」；12:27 #3：锦段「出现粒子是一次性出现一堆的，参考是先零星出现再形成一条线」）

先写检查再改（标准.md 第 3 节）。查：
  1. 参数在：BASE 有 sparkRamp / sparkRampJit，右栏「尾缀（炭火火花）」有这两项；
  2. 默认不变：显式写 sparkRamp 0 和不写，定帧逐像素相同（已通过 / 待验收的效果不受影响）；
  3. 起势：同一配方、同一取景，星头不发光（只看火花），点火后 0.12 s 时火花总亮度明显比没起势时暗（≤ 50%），
     起势结束 + 火花寿命以后（点火后 1.6 s）和没起势时差不多（≥ 80%）——GPU 内核（4.0 默认）；
  4. CPU 内核同一条规律：点火后 0.12 s 内新出的火花数 ≤ 50%，1.0–1.4 s 之间 ≥ 80%。
用法：python3 analysis/scripts/火花起势检查.py [--px 320]
"""
import argparse, base64, io, json, pathlib, sys
import numpy as np
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from browser_runtime import chromium_options

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE = {'ignDelay': 0.4, 'ignJit': 0, 'headBright': 0, 'burn': 2.5, 'sparkRate': 300, 'sparkLife': 0.6, 'stars': 60, 'duration': 3.5}
SCHEMA_JS = r"""() => { const sec = SCHEMA.find(s => s.sec === '尾缀（炭火火花）'), ids = sec ? sec.items.map(x => Array.isArray(x) ? x[0] : x.sel || x.id) : [];
  return { base: ['sparkRamp', 'sparkRampJit'].map(k => [k, BASE[k]]), inSection: ['sparkRamp', 'sparkRampJit'].filter(k => ids.includes(k)) }; }"""
VIEW = r"""(a) => { const d = defaultsFor('kiku', 40), P = derive({ ...d.P, ...a.over }); return frameView40(displayPlan40(P), 2.0); }"""
STILL = r"""(a) => { const d = defaultsFor('kiku', 40); const P = derive({ ...d.P, ...a.over });
  return __fw.renderStills(P, d.M, { times: a.times, px: a.px, cx: a.view[0], cy: a.view[1], half: a.view[2] }); }"""
CPU = r"""(a) => { const d = defaultsFor('kiku', 40), P = derive({ ...d.P, ...a.over, engine: 'cpu' }), s = new Sim(P), out = [];
  let cnt = 0; const oa = s.sp.add.bind(s.sp); s.sp.add = (...q) => { cnt++; return oa(...q); };     // 数新出的火花（不管死掉的）
  const n = Math.ceil(2.0 / H_STEP);
  for (let i = 0; i < n; i++) { s.step(H_STEP); if (i % 12 === 11) out.push([s.t, cnt]); }
  return out; }"""


def lum(r):
    out = []
    for x in r:      # 去掉背景渐变（每行中位数），只算火花的亮度
        g = np.asarray(Image.open(io.BytesIO(base64.b64decode(x['png'].split(',')[1]))).convert('RGB'), dtype=np.float64).mean(2)
        out.append(float(np.clip(g - np.median(g, axis=1, keepdims=True) - 3, 0, None).sum()))
    return out


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--px', type=int, default=320); a = ap.parse_args()
    fails, rep = [], {}
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        br = pw.chromium.launch(**chromium_options()); pg = br.new_page()
        pg.goto((ROOT / 'tool' / 'FireworkBaker.html').as_uri() + '?fast', timeout=0, wait_until='domcontentloaded')
        pg.wait_for_function('window.__fw && (!window.__fw.idle || window.__fw.idle())', timeout=0)
        sc = pg.evaluate(SCHEMA_JS); rep['参数'] = sc; print('参数：', sc, flush=True)
        if any(v is None for _, v in sc['base']): fails.append('BASE 缺 sparkRamp / sparkRampJit')
        if len(sc['inSection']) != 2: fails.append('右栏「尾缀（炭火火花）」缺火花起势')
        if not fails:
            view = pg.evaluate(VIEW, {'over': BASE})
            t1, t2 = BASE['ignDelay'] + 0.12, BASE['ignDelay'] + 1.6
            A = pg.evaluate(STILL, {'over': BASE, 'times': [t1, t2], 'px': a.px, 'view': view})
            Z = pg.evaluate(STILL, {'over': {**BASE, 'sparkRamp': 0, 'sparkRampJit': 30}, 'times': [t1], 'px': a.px, 'view': view})
            R = pg.evaluate(STILL, {'over': {**BASE, 'sparkRamp': 0.6, 'sparkRampJit': 0}, 'times': [t1, t2], 'px': a.px, 'view': view})
            def raw(r): return np.asarray(Image.open(io.BytesIO(base64.b64decode(r['png'].split(',')[1]))).convert('RGB'), dtype=np.int16)
            d0 = int(np.abs(raw(A[0]) - raw(Z[0])).max()); rep['写明 0 和不写的最大像素差'] = d0
            if d0 != 0: fails.append(f'写明 sparkRamp 0 后画面变了（最大像素差 {d0}）')
            la, lr = lum(A), lum(R); rep['点火后 0.12 s 亮度比'] = round(lr[0] / max(1, la[0]), 3); rep['点火后 1.6 s 亮度比'] = round(lr[1] / max(1, la[1]), 3)
            if not lr[0] <= 0.5 * la[0]: fails.append(f"起势 0.6 s：点火后 0.12 s 火花没明显变少（亮度 ×{rep['点火后 0.12 s 亮度比']}）")
            if not lr[1] >= 0.8 * la[1]: fails.append(f"起势结束后火花没恢复（亮度 ×{rep['点火后 1.6 s 亮度比']}）")
            # CPU 内核：数新出的火花（累计数的差）
            def counts(over):
                tr = pg.evaluate(CPU, {'over': over}); ign = BASE['ignDelay']
                at = lambda t: next(c for tt, c in tr if tt >= t)
                return at(ign + 0.12) - at(ign), at(ign + 1.4) - at(ign + 1.0)
            c0, c1 = counts(BASE), counts({**BASE, 'sparkRamp': 0.6, 'sparkRampJit': 0}); rep['CPU 新火花（前 0.12 s，1.0–1.4 s）'] = {'没起势': c0, '起势 0.6': c1}
            if not c1[0] <= 0.5 * max(1, c0[0]): fails.append(f'CPU：起势时点火后 0.12 s 新火花没变少（{c1[0]} vs {c0[0]}）')
            if not c1[1] >= 0.8 * c0[1]: fails.append(f'CPU：起势结束后新火花没恢复（{c1[1]} vs {c0[1]}）')
        br.close()
    rep['fails'] = fails; rep['pass'] = not fails
    print(json.dumps(rep, ensure_ascii=False)); print('✅ 通过' if not fails else '❌ ' + '；'.join(fails)); sys.exit(0 if not fails else 1)


main()
