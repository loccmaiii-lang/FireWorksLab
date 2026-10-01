"""考卷的有效性检查：故意做坏的版本必须判不及格（否则考卷没用）。
  旧做法：线由随机离散火花凑成（寿命对数离散 45%、按 (1-a/life)^3 冷却、侧向乱速），即 QA13–QA18 / QN6 的做法
  断线：同一模型，线按 25 ms 亮 / 25 ms 灭切成虚线
  成团：星数 60、线宽 ×4、亮度离散大
  点头：橙色阶段星头有亮点（QA13 的失败）
基线是当前搜索最好的参数（考卷/搜索结果.json），只改上面这一处。"""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yinxian as Y, 评分 as S
HERE = os.path.dirname(os.path.abspath(__file__))
try: BEST = json.load(open(os.environ.get('BASEP') or os.path.join(HERE, '考卷', '候选i.json'))); BEST = BEST.get('最好', BEST)
except FileNotFoundError: BEST = {"_ppm": 3.0, "speedJit": 8, "oTau": 0.9, "oRise": 0.1, "oIgn": 0.22, "oFade": 1.0, "gLine": 0.3, "gTau": 0.5, "sparkBright": 40, "sparkRate": 300, "sparkBack": 60, "sparkLife": 1.2, "tSwitch": 1.2, "tSwitchJit": 0.18}
orig_line = Y._line; orig_render = Y.render
def dashed_line(cv, sh, t, cam, e0, e1, wfun, drift):
    return orig_line(cv, sh, t, cam, e0, e1, lambda age, s: wfun(age, s) * ((((t - age) / 0.025).astype(int) % 2) == 0), drift)
def cloud_render(sh, t, cam, w, h, ppm, cx, cy, ss=2):
    """旧做法：橙尾 = 离散火花（每颗星每秒 900 颗，帧间一致的随机）。"""
    O, G = orig_render(sh, t, cam, w, h, ppm, cx, cy, ss)
    P = sh.P; rng = np.random.default_rng(11); cv = Y.Canvas(w, h, ppm, cx, cy, ss)
    rate = 900; dt = 1 / rate
    for s in range(sh.n):
        e = np.arange(0, min(t, sh.tS[s]), dt)
        if not len(e): continue
        r2 = np.random.default_rng(1000 + s); life = 0.9 * np.exp(0.45 * r2.normal(0, 1, len(e))); jit = r2.normal(0, 1.5, (len(e), 3))
        a = t - e; m = a < life
        if not m.any(): continue
        k = sh.idx(e[m]); p = sh.pos[k, s].astype(np.float64); v = sh.vel[k, s].astype(np.float64)
        p = p + Y._drift(v * 0.3 + jit[m], a[m], 1.0, 0.3, 2.0)
        x, y, br = Y.project(p, cam)
        cv.splat(x, y, (1 - a[m] / life[m]) ** 3 * br * sh.bj[s] * 1.4)
    return cv.image(0.55), G
def clump_P(P): return {**P, 'stars': 60, 'oWidth': 2.2, 'gWidth': 2.2, 'starJit': 0.8}
HEAD_W = 40.0   # 星头亮点强度：要明显看得见（QA13 那种），否则反例无效
def heads_render(sh, t, cam, w, h, ppm, cx, cy, ss=2):
    O, G = orig_render(sh, t, cam, w, h, ppm, cx, cy, ss)
    cv = Y.Canvas(w, h, ppm, cx, cy, ss); k = sh.idx(np.full(sh.n, t)); p = sh.pos[k, np.arange(sh.n)].astype(np.float64)
    x, y, br = Y.project(p, cam); cv.splat(x, y, HEAD_W * br * (t < sh.tS))
    return O + cv.image(1.1), G
CASES = {'旧做法（离散火花凑线）': ('render', cloud_render, None), '断线（虚线）': ('line', dashed_line, None),
         '成团（星少线粗）': (None, None, clump_P), '点头（橙段星头亮点）': ('render', heads_render, None)}
if __name__ == '__main__':
    out = {}
    for name, (what, fn, pf) in CASES.items():
        Y._line, Y.render = orig_line, orig_render
        if what == 'line': Y._line = fn
        if what == 'render': Y.render = fn
        P = pf(BEST) if pf else BEST
        import 试渲 as T; T.Y = Y
        ok, rows, info, res, expo = S.score(P, os.path.join(HERE, '考卷', '反例_' + name.split('（')[0]), save=True)
        failed = [r['编号'] + ' ' + r['项目'] for r in rows if not r['通过']]
        out[name] = {'判定': '不及格（正确）' if not ok else '及格（考卷失效！）', '不过的项': failed}
        print(name, out[name], flush=True)
    Y._line, Y.render = orig_line, orig_render
    json.dump(out, open(os.path.join(HERE, '考卷', '反例判定.json'), 'w'), ensure_ascii=False, indent=1)
