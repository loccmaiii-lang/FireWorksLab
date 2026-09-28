"""升空尾缀：配方定好后，再按实拍颜色拟合渐变图的 4 个色标（位置 0 / 0.3 / 0.65 / 1，与项目材质一致）。
贴图本身不变（灰度），只改渐变图，所以不用重新烘焙：烘一次，之后在 Python 里反复着色、测量。
  python trail_ramp.py S|M|L
结果写回 analysis/replica/尾缀_<档>_配方.json 的 "_ramp"，并更新 _对照.jpg / _数值.json
"""
import os, sys, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import trailkit as K
import trail_fit as TF
import trail_calib as TC
from compare import SimSession


def lin2hex(c):
    c = np.clip(c, 0, 1); s = np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055)
    return '#' + ''.join(f'{int(round(v * 255)):02x}' for v in s)


def table(C):
    x = np.linspace(0, 1, 256); return np.stack([np.interp(x, TC.RAMP_POS, [c[ch] for c in C]) for ch in range(3)], 1)


def main(size, log=print, s=None, out=None, tex=None, scale=0.25):
    out = out or os.path.join(TC.ROOT, 'analysis', 'replica'); fp = os.path.join(out, f'尾缀_{size}_配方.json')
    over = json.load(open(fp, encoding='utf-8')) if os.path.exists(fp) else {}
    # 颜色对谁：有质感参考（尾缀3.0_A）时对它，否则对各档原来的实拍
    if tex:
        import trail_ref3 as R3; ref = R3.ref_side(); stk = R3.STRAIGHT; psf = over.get('_psf3', 1.0); sat = float(np.mean(ref['prof']['tex']['sat']))
    else: ref = TF.ref_side(size); stk = None; psf = over.get('_psf', 0.7); sat = None
    own = s is None
    if own: s = SimSession()
    pg = s.pg
    base = pg.evaluate(f"defaultsFor('{TC.KEY[size]}')")
    res = pg.evaluate(f"__fw.trailBake('{TC.KEY[size]}', {json.dumps({k: v for k, v in over.items() if not k.startswith('_')})}, {scale}, true)")
    if own: s.close()
    M = dict(base['M']); M.update(over.get('_ramp', {}))
    C = [TC.hex_lin(M[k]) for k in ('ramp0', 'ramp1', 'ramp2', 'ramp3')]

    def ev(C):
        S = TC.sim_side(res, ref['L'], table(C), psf, stk, sat)
        L, parts = K.tex_loss(ref['prof']['tex'], S['prof']['tex'], dict(dens=0, lev=2, grain=0, col=4)) if tex else K.loss(ref['prof'], S['prof'])
        return L, parts, S
    # 约束：红色通道 = 1（暖色火花），越亮越白：G、B 从暗到亮单调不减；最亮的色标固定为暖白
    C = [np.array([1.0, c[1] / c[0], min(c[2] / c[0], 0.8 * c[1] / c[0])]) for c in C]; C[3] = TC.hex_lin('#fff8ec')
    ok = lambda C: all(C[i][1] <= C[i + 1][1] + 1e-9 and C[i][2] <= C[i + 1][2] + 1e-9 and C[i][2] <= 0.85 * C[i][1] for i in range(3))   # 火花是暖色：蓝 ≤ 0.85 × 绿
    best, parts, S = ev(C); log(f'[{size}] 渐变图起点 {best:.4f} col={parts["col"]:.4f}')
    st = 0.25
    for rnd in range(6):
        imp = False
        for i in range(3):
            for ch in (1, 2):
                for sg in (1, -1):
                    C2 = [c.copy() for c in C]; C2[i][ch] = np.clip(C2[i][ch] * (1 + st) ** sg, 1e-4, 1)
                    if not ok(C2): continue
                    L, pa, S2 = ev(C2)
                    if L < best - 1e-5: C, best, parts, S, imp = C2, L, pa, S2, True
        if not imp: st *= 0.5
        log(f'  第{rnd + 1}轮 {best:.4f} col={parts["col"]:.4f} ' + ' '.join(lin2hex(c) for c in C))
    over['_ramp'] = {k: lin2hex(c) for k, c in zip(('ramp0', 'ramp1', 'ramp2', 'ramp3'), C)}
    json.dump(over, open(fp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    tag = '质感' if tex else ''
    json.dump({'差距': round(best, 4), '分项': {k: round(v, 4) for k, v in parts.items()}, '尾迹长度m': res['meta']['trailLen'], '渐变图': over['_ramp'], '实拍': ref['prof'], '烘焙器': S['prof']},
              open(os.path.join(out, f'尾缀_{size}_{tag}数值.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=float)
    TF.sheet(ref, S, os.path.join(out, f'尾缀_{size}_{tag}对照.jpg'))
    log(f'[{size}] 渐变图 {over["_ramp"]}')
    return over, best


if __name__ == '__main__':
    main(sys.argv[1], log=lambda m: print(m, flush=True))
